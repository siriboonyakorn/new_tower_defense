-- ==============================================================================
-- HARDEN MATCH HISTORY SECURITY (RLS)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Remove the public "view all" policy
DROP POLICY IF EXISTS "Anyone can view match history" ON public.match_history;

-- 2. Create a restricted policy
-- This policy ensures a user can ONLY select rows where the 'profile_id'
-- links to their own 'auth_id' in the profiles table.
CREATE POLICY "Users can only view their own match history"
  ON public.match_history FOR SELECT
  USING (
    auth.uid() = (SELECT auth_id FROM public.profiles WHERE public.profiles.id = profile_id)
  );

-- 3. (Optional) If you want to allow players to see each other's GLOBAL SCORES (Kills/Damage)
-- while keeping the MATCH LIST private, the current Redis-based leaderboard is already separate.
-- This RLS policy ONLY affects the detailed 'match_history' table.

