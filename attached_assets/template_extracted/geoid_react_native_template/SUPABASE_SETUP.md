# Supabase Setup Guide for GeoID Pro

This guide will walk you through setting up your Supabase backend for the GeoID Pro mobile app.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: GeoID Pro
   - **Database Password**: (create a strong password)
   - **Region**: Choose the closest to your users
4. Click "Create new project" and wait for it to initialize

## Step 2: Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
3. Paste these into `src/services/supabase.js`:
   ```javascript
   const SUPABASE_URL = 'your_project_url_here';
   const SUPABASE_ANON_KEY = 'your_anon_key_here';
   ```

## Step 3: Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the following SQL schema:

\`\`\`sql
--
-- GeoID Pro Supabase Schema
-- This script sets up the core tables and Row Level Security (RLS) policies.
--

-- 1. Create the 'profiles' table to extend the auth.users table
CREATE TABLE public.profiles (
    id uuid references auth.users not null primary key,
    username text unique,
    is_pro boolean default false not null,
    created_at timestamp with time zone default now() not null
);

-- 2. Enable RLS for 'profiles'
ALTER TABLE public.profiles enable row level security;

-- 3. Create RLS policies for 'profiles'
CREATE POLICY "Users can view their own profile." ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Create the 'identifications' table
CREATE TABLE public.identifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) not null,
    rock_name text not null,
    confidence_score numeric not null,
    photo_url text, -- Link to Supabase Storage
    latitude numeric,
    longitude numeric,
    geological_context jsonb, -- For storing USGS data snippet
    created_at timestamp with time zone default now() not null
);

-- 5. Enable RLS for 'identifications'
ALTER TABLE public.identifications enable row level security;

-- 6. Create RLS policies for 'identifications'
CREATE POLICY "Users can view their own identifications." ON public.identifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create identifications." ON public.identifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own identifications." ON public.identifications
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create the 'subscriptions' table
CREATE TABLE public.subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) unique not null,
    status text not null, -- e.g., 'active', 'trial', 'inactive'
    start_date timestamp with time zone not null,
    end_date timestamp with time zone,
    plan_id text not null, -- e.g., 'pro_monthly', 'pro_annual'
    created_at timestamp with time zone default now() not null
);

-- 8. Enable RLS for 'subscriptions'
ALTER TABLE public.subscriptions enable row level security;

-- 9. Create RLS policies for 'subscriptions'
CREATE POLICY "Users can view their own subscription status." ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 10. Create a function to automatically create a profile on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email); -- Using email as a default username for simplicity

  -- Also insert a default 'free' subscription status
  insert into public.subscriptions (user_id, status, start_date, plan_id)
  values (new.id, 'free', now(), 'free_tier');

  return new;
end;
$$ language plpgsql security definer;

-- 11. Create the trigger to call the function
CREATE TRIGGER on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
\`\`\`

4. Click "Run" to execute the schema

## Step 4: Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Name it `rock_photos`
4. Make it **Public** (so users can view their photos)
5. Click "Create bucket"

### Set Storage Policies

1. Click on the `rock_photos` bucket
2. Go to **Policies**
3. Click "New policy"
4. Use the following policy:

\`\`\`sql
CREATE POLICY "Allow authenticated users to upload and view their own photos"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'rock_photos' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'rock_photos' AND auth.uid() = owner);
\`\`\`

## Step 5: Configure Auth Providers

### Email Authentication (Already Enabled)

Email/password authentication is enabled by default.

### Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Click on **Google**
3. Enable Google provider
4. Follow the instructions to create OAuth credentials in Google Cloud Console
5. Paste the Client ID and Client Secret
6. Save

### Facebook OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Click on **Facebook**
3. Enable Facebook provider
4. Follow the instructions to create an app in Facebook Developers
5. Paste the App ID and App Secret
6. Save

## Step 6: Test Your Setup

1. In your Supabase dashboard, go to **Table Editor**
2. You should see the following tables:
   - `profiles`
   - `identifications`
   - `subscriptions`
3. Go to **Authentication** → **Users** to verify the trigger works by creating a test user

## Step 7: Update Your App

1. Make sure `src/services/supabase.js` has your correct credentials
2. Restart your Expo development server
3. Test the authentication flow in your app

## Troubleshooting

### Issue: "relation 'public.profiles' does not exist"

**Solution**: Make sure you ran the SQL schema in Step 3.

### Issue: "new row violates row-level security policy"

**Solution**: Check that RLS policies are correctly set up. You can temporarily disable RLS for testing:
\`\`\`sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
\`\`\`

### Issue: "Failed to upload photo"

**Solution**: Verify that the `rock_photos` bucket exists and has the correct policies.

## Next Steps

Once your Supabase backend is set up, you can:

1. Implement user authentication in the app
2. Test saving identifications to the database
3. Upload photos to Supabase Storage
4. Implement the Pro/Free subscription logic

---

For more information, see the [Supabase Documentation](https://supabase.com/docs).
