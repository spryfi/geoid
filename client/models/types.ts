export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_beta_tester: boolean;
  daily_identifications_used: number;
  daily_identifications_reset_at: string | null;
  total_identifications: number;
  created_at: string;
  updated_at: string;
}

export interface Identification {
  id: string;
  user_id: string;
  rock_name: string;
  rock_type: string;
  confidence: number;
  description: string;
  formation_info: string | null;
  geological_period: string | null;
  mineral_composition: string[] | null;
  hardness: number | null;
  color: string | null;
  texture: string | null;
  image_url: string;
  thumbnail_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  event_data: Record<string, any>;
  app_version: string;
  device_os: string;
  device_os_version: string;
  user_id: string | null;
  session_id: string | null;
  timestamp: string;
  created_at: string;
}

export interface AppVersion {
  id: string;
  version: string;
  version_code: number;
  platform: 'ios' | 'android' | 'all';
  force_update: boolean;
  release_notes: string | null;
  min_supported_version: string | null;
  app_store_url: string | null;
  play_store_url: string | null;
  created_at: string;
}

export interface RockType {
  id: string;
  name: string;
  category: 'igneous' | 'sedimentary' | 'metamorphic';
  description: string;
  formation_process: string;
  common_locations: string[];
  mineral_composition: string[];
  hardness_range: { min: number; max: number };
  colors: string[];
  textures: string[];
  geological_period: string | null;
  fun_facts: string[];
  image_urls: string[];
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  accuracy?: number;
}

export interface IdentificationResult {
  rockName: string;
  rockType: string;
  confidence: number;
  description: string;
  formationInfo: string;
  geologicalPeriod: string;
  mineralComposition: string[];
  hardness: number;
  color: string;
  texture: string;
  funFacts: string[];
  relatedRocks: string[];
}

export interface DailyLimit {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
}

export type SubscriptionTier = 'free' | 'pro' | 'beta';

export interface UserState {
  isAuthenticated: boolean;
  user: User | null;
  profile: Profile | null;
  isPro: boolean;
  isBetaTester: boolean;
  subscriptionTier: SubscriptionTier;
}
