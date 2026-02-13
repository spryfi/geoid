-- GeoID Pro Supabase Schema
-- Run this in your Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Stores user profile information
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  is_beta_tester BOOLEAN DEFAULT FALSE,
  pro_expiration_date TIMESTAMPTZ,
  daily_identifications_used INTEGER DEFAULT 0,
  daily_identifications_reset_at TIMESTAMPTZ,
  total_identifications INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BETA_TOKENS TABLE
-- Stores single-use beta access tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS beta_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  grants_days INTEGER DEFAULT 365,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE beta_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if a token exists (for validation)
CREATE POLICY "Anyone can validate tokens" ON beta_tokens
  FOR SELECT USING (true);

-- Policy: Authenticated users can update tokens (for redemption)
CREATE POLICY "Authenticated users can redeem tokens" ON beta_tokens
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Insert sample beta tokens for testing
INSERT INTO beta_tokens (token, grants_days) VALUES
  ('GEOID-BETA-2026-ALPHA', 365),
  ('GEOID-BETA-2026-BRAVO', 365),
  ('GEOID-BETA-2026-CHARLIE', 365),
  ('GEOID-BETA-2026-DELTA', 365),
  ('GEOID-BETA-2026-ECHO', 365),
  ('GEOID-PRO-LIFETIME-001', 3650),
  ('GEOID-PRO-LIFETIME-002', 3650),
  ('GEOID-TESTER-30DAY-001', 30),
  ('GEOID-TESTER-30DAY-002', 30),
  ('GEOID-TESTER-30DAY-003', 30);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- IDENTIFICATIONS TABLE
-- Stores rock identification results
-- =====================================================
CREATE TABLE IF NOT EXISTS identifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rock_name TEXT NOT NULL,
  rock_type TEXT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  description TEXT,
  formation_info TEXT,
  geological_period TEXT,
  mineral_composition TEXT[],
  hardness DECIMAL(3,1),
  color TEXT,
  texture TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  location_name TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE identifications ENABLE ROW LEVEL SECURITY;

-- Policies for identifications
CREATE POLICY "Users can view own identifications" ON identifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identifications" ON identifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own identifications" ON identifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own identifications" ON identifications
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- ANALYTICS_EVENTS TABLE
-- Stores app analytics events
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  app_version TEXT,
  device_os TEXT,
  device_os_version TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- Enable Row Level Security (but allow inserts from authenticated users)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert events
CREATE POLICY "Authenticated users can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Policy to allow service role to read all events
CREATE POLICY "Service role can read all events" ON analytics_events
  FOR SELECT USING (auth.role() = 'service_role');

-- =====================================================
-- APP_VERSIONS TABLE
-- Stores app version information for update checks
-- =====================================================
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL,
  version_code INTEGER NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'all')),
  force_update BOOLEAN DEFAULT FALSE,
  release_notes TEXT,
  min_supported_version TEXT,
  app_store_url TEXT,
  play_store_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read app versions (needed for update checks)
CREATE POLICY "Anyone can read app versions" ON app_versions
  FOR SELECT USING (true);

-- Insert initial version
INSERT INTO app_versions (version, version_code, platform, force_update, release_notes)
VALUES ('1.0.0', 1, 'all', FALSE, 'Initial release of GeoID Pro');

-- =====================================================
-- ROCK_TYPES TABLE
-- Reference data for rock types
-- =====================================================
CREATE TABLE IF NOT EXISTS rock_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('igneous', 'sedimentary', 'metamorphic')),
  description TEXT,
  formation_process TEXT,
  common_locations TEXT[],
  mineral_composition TEXT[],
  hardness_min DECIMAL(3,1),
  hardness_max DECIMAL(3,1),
  colors TEXT[],
  textures TEXT[],
  geological_period TEXT,
  fun_facts TEXT[],
  image_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rock_types ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read rock types
CREATE POLICY "Anyone can read rock types" ON rock_types
  FOR SELECT USING (true);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identifications_updated_at
  BEFORE UPDATE ON identifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
