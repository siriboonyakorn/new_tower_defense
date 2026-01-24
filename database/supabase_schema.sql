-- ==============================================================================
-- SUPABASE SCHEMA - EXISTING STRUCTURE
-- ==============================================================================
-- This matches your current database structure.
-- ONLY run the RLS policies and triggers if they don't exist yet.

-- ==============================================================================
-- TABLES (Already exists in your database)
-- ==============================================================================

-- profiles: Stores user profile data
-- rooms: Game rooms with join codes
-- room_members: Links players to rooms

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on profiles (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Everyone can view profiles
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT
  USING (true);

-- Profiles: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Profiles: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_id);

-- Profiles: Users can delete their own profile
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = auth_id);

-- ==============================================================================
-- ROOMS RLS
-- ==============================================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Everyone can view rooms
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms"
  ON public.rooms FOR SELECT
  USING (true);

-- Authenticated users can create rooms
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Host can update their room
DROP POLICY IF EXISTS "Host can update room" ON public.rooms;
CREATE POLICY "Host can update room"
  ON public.rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = rooms.host_profile_id 
      AND profiles.auth_id = auth.uid()
    )
  );

-- Host can delete their room
DROP POLICY IF EXISTS "Host can delete room" ON public.rooms;
CREATE POLICY "Host can delete room"
  ON public.rooms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = rooms.host_profile_id 
      AND profiles.auth_id = auth.uid()
    )
  );

-- ==============================================================================
-- ROOM MEMBERS RLS
-- ==============================================================================

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view room members
DROP POLICY IF EXISTS "Anyone can view room members" ON public.room_members;
CREATE POLICY "Anyone can view room members"
  ON public.room_members FOR SELECT
  USING (true);

-- Authenticated users can join rooms
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = room_members.profile_id 
      AND profiles.auth_id = auth.uid()
    )
  );

-- Users can update their own membership (ready status)
DROP POLICY IF EXISTS "Users can update own membership" ON public.room_members;
CREATE POLICY "Users can update own membership"
  ON public.room_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = room_members.profile_id 
      AND profiles.auth_id = auth.uid()
    )
  );

-- Users can leave rooms (delete their membership)
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = room_members.profile_id 
      AND profiles.auth_id = auth.uid()
    )
  );

-- ==============================================================================
-- TRIGGER: Auto-create profile on user signup
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, username, display_name)
  VALUES (
    new.id,
    'player_' || substr(new.id::text, 1, 8),
    COALESCE(new.raw_user_meta_data->>'display_name', 'Player')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- HELPER FUNCTION: Generate unique join code
-- ==============================================================================

CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
