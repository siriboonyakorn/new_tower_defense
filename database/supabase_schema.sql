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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- HELPER FUNCTION: Generate unique join code
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generate_join_code()
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
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================================================
-- MATCH HISTORY TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    result TEXT NOT NULL, -- 'win' or 'loss'
    waves_cleared INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    total_damage BIGINT NOT NULL DEFAULT 0,
    total_kills INTEGER NOT NULL DEFAULT 0,
    xp_gained INTEGER NOT NULL DEFAULT 0,
    tokens_gained INTEGER NOT NULL DEFAULT 0,
    level_id TEXT,
    signature TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own history
-- This restriction ensures match history is strictly personal as requested.
DROP POLICY IF EXISTS "Anyone can view match history" ON public.match_history;
CREATE POLICY "Users can only view their own match history"
  ON public.match_history FOR SELECT
  USING (
    auth.uid() = (SELECT auth_id FROM public.profiles WHERE id = profile_id)
  );

-- Users can insert their own matches
DROP POLICY IF EXISTS "Users can insert own matches" ON public.match_history;
CREATE POLICY "Users can insert own matches"
  ON public.match_history FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT auth_id FROM public.profiles WHERE id = profile_id)
  );
-- ==============================================================================
-- SECURITY: AWARD REWARDS RPC
-- ==============================================================================
-- This function calculates and awards tokens/XP inside the database
-- to prevent client-side console cheating.

CREATE OR REPLACE FUNCTION public.award_match_rewards(
    p_result TEXT, 
    p_waves_cleared INTEGER, 
    p_level_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_profile_id UUID;
    v_xp_gain INTEGER := 0;
    v_token_gain INTEGER := 0;
    v_multiplier FLOAT := 1.0;
    v_base_xp INTEGER := 50;
    v_base_tokens INTEGER := 10;
    v_level_up_xp INTEGER;
    v_current_level INTEGER;
    v_current_xp INTEGER;
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_return JSONB;
BEGIN
    -- 1. Get current user profile
    SELECT id, level, xp INTO v_profile_id, v_current_level, v_current_xp
    FROM public.profiles
    WHERE auth_id = auth.uid();

    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- 2. Determine Multiplier
    v_multiplier := CASE 
        WHEN p_level_id = 'sector1' THEN 1.00
        WHEN p_level_id = 'sector2' THEN 1.50
        WHEN p_level_id = 'sector3' THEN 2.25
        WHEN p_level_id = 'sector4' THEN 3.50
        WHEN p_level_id = 'sector5' THEN 5.00
        ELSE 1.00
    END;

    -- 3. Calculate Base Gains
    v_xp_gain := p_waves_cleared * v_base_xp;
    v_token_gain := p_waves_cleared * v_base_tokens;

    -- 4. Win Bonus
    IF p_result = 'win' THEN
        v_xp_gain := v_xp_gain + 500;
        v_token_gain := v_token_gain + 100;
    END IF;

    -- 5. Apply Multiplier
    v_xp_gain := floor(v_xp_gain * v_multiplier);
    v_token_gain := floor(v_token_gain * v_multiplier);

    -- 6. Apply to Profile with Level Up Logic
    v_new_xp := v_current_xp + v_xp_gain;
    v_new_level := v_current_level;
    
    -- Simple Level Up Logic (Must match ProgressionManager.js)
    -- BASE_XP: 1000, MULTIPLIER: 1.2
    LOOP
        v_level_up_xp := floor(1000 * power(1.2, v_new_level - 1));
        EXIT WHEN v_new_xp < v_level_up_xp;
        v_new_xp := v_new_xp - v_level_up_xp;
        v_new_level := v_new_level + 1;
    END LOOP;

    -- 7. Update Database
    UPDATE public.profiles
    SET 
        xp = v_new_xp,
        level = v_new_level,
        neon_tokens = neon_tokens + v_token_gain
    WHERE id = v_profile_id;

    v_return := jsonb_build_object(
        'xp_gained', v_xp_gain,
        'tokens_gained', v_token_gain,
        'new_level', v_new_level,
        'new_xp', v_new_xp
    );

    RETURN v_return;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- HARDEN RLS: Restrict sensitive columns
-- ==============================================================================

-- Prevent users from directly updating their XP and Tokens
-- This forces the use of the award_match_rewards RPC for progression.
-- WITH CHECK ensures the user cannot change their auth_id to impersonate another user.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);
