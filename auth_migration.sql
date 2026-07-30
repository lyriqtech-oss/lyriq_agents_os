-- SQL Migration Script for User Logins and Profiles in Supabase
-- Paste this script into your Supabase Dashboard -> SQL Editor and click 'Run'.

-- Option A: Custom User Accounts Table (Managed by Node.js Backend)
-- Use this if you are implementing manual password hashing/logging in your server code.
CREATE TABLE IF NOT EXISTS custom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Stored encrypted passwords
  name TEXT,
  role TEXT DEFAULT 'operator', -- e.g., 'admin', 'operator', 'viewer'
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Option B: Profiles Table synced with Supabase Auth (Recommended)
-- Supabase has a built-in 'auth.users' table for user signups, logins, and passwords.
-- This public.profiles table extends auth.users to store additional custom profile metadata.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'operator', -- e.g., 'admin', 'operator', 'viewer'
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automatic Trigger to sync signups from Supabase Auth to public.profiles
-- Every time a user signs up via Supabase Auth, a profile row is created automatically!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, workspace_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário Novo'),
    COALESCE(new.raw_user_meta_data->>'role', 'operator'),
    'workspace_123' -- Default initial workspace
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Performance index
CREATE INDEX IF NOT EXISTS idx_custom_users_email ON custom_users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
