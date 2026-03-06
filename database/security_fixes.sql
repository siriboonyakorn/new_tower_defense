-- ==============================================================================
-- SECURITY FIXES MIGRATION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- Fixes the following Supabase linter warnings:
--   [ERROR] security_definer_view        - public.public_room_list
--   [WARN]  function_search_path_mutable - 10 functions
--   [WARN]  rls_policy_always_true       - profiles UPDATE, rooms INSERT
--
-- NOTE: "Leaked Password Protection" must be enabled manually in:
--   Dashboard → Authentication → Sign In / Up → Leaked Password Protection
-- ==============================================================================


-- ==============================================================================
-- FIX 1: SECURITY DEFINER VIEW
-- Remove the implicit SECURITY DEFINER behaviour from public_room_list.
-- security_invoker = true makes the view execute with the CALLER's permissions
-- and respect their RLS policies (requires PostgreSQL 15+, used by Supabase).
-- ==============================================================================

ALTER VIEW public.public_room_list SET (security_invoker = true);


-- ==============================================================================
-- FIX 2: FUNCTION SEARCH PATH MUTABLE
-- Set a fixed, immutable search_path on every affected function.
-- A mutable search_path allows a malicious user to shadow functions/types
-- in the search path (search_path injection attack).
-- Setting it to 'public' locks the resolution to the expected schema.
-- ==============================================================================

-- We use a dynamic DO block so we don't need to repeat the full argument
-- signature for each function (which the live DB may have already modified).
DO $migration$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure AS proc_sig
        FROM pg_proc
        WHERE proname IN (
            'generate_join_code',
            'generate_join_code_alpha',
            'add_player_rewards',
            'equip_skin',
            'award_match_rewards',
            'purchase_skin',
            'handle_new_user',
            'set_updated_at',
            'get_profile_id',
            'create_room'
        )
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s SET search_path = public',
            r.proc_sig
        );
    END LOOP;
END;
$migration$ LANGUAGE plpgsql;


-- ==============================================================================
-- FIX 3: RLS POLICY ALWAYS TRUE — public.profiles (UPDATE)
-- The original WITH CHECK (true) allowed a row's auth_id to be changed after
-- update. The corrected CHECK locks the new row to the authenticated user's ID.
-- ==============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING  (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);


-- ==============================================================================
-- FIX 4: RLS POLICY ALWAYS TRUE — public.rooms (INSERT, safe_rooms_insert)
-- The original WITH CHECK (true) allowed any authenticated user to insert a
-- room claiming any host_profile_id. The corrected CHECK ensures the supplied
-- host_profile_id actually belongs to the authenticated user.
-- ==============================================================================

DROP POLICY IF EXISTS "safe_rooms_insert" ON public.rooms;
CREATE POLICY "safe_rooms_insert"
    ON public.rooms FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id       = host_profile_id
              AND profiles.auth_id  = auth.uid()
        )
    );


-- ==============================================================================
-- REMINDER: Leaked Password Protection (cannot be set via SQL)
-- Enable it in the Supabase Dashboard:
--   Authentication → Sign In / Up → Password Protection → Enable HaveIBeenPwned check
-- ==============================================================================

-- ==============================================================================
-- STRONG PASSWORD POLICY
-- auth.config is not accessible on Supabase hosted projects.
-- Set the minimum password length manually in the Dashboard:
--   Authentication → Sign In / Up → Password and Security → Min password length → set to 8
-- ==============================================================================


-- ==============================================================================
-- GITHUB OAUTH SETUP INSTRUCTIONS (requires Supabase Dashboard)
-- SQL alone cannot enable OAuth providers. Follow these steps:
--
--  1. Go to: https://github.com/settings/developers
--     → OAuth Apps → New OAuth App
--     → Homepage URL: your site URL (e.g. http://localhost:5500)
--     → Authorization callback URL:
--         https://<your-project-ref>.supabase.co/auth/v1/callback
--
--  2. Copy the Client ID and generate a Client Secret from GitHub.
--
--  3. In Supabase Dashboard:
--     Authentication → Providers → GitHub → Enable GitHub → paste Client ID + Secret
--
--  4. Add your site URL to:
--     Authentication → URL Configuration → Site URL  (e.g. http://localhost:5500)
--     and add it to Redirect URLs as well.
--
--  No SQL migration needed for this step.
-- ==============================================================================

-- ==============================================================================
-- 2FA / MFA SETUP INSTRUCTIONS (requires Supabase Dashboard)
-- Supabase supports TOTP (Google Authenticator, Authy) natively.
--
--  Enable MFA in: Dashboard → Authentication → Sign In / Up → Multi-Factor Authentication
--   → Toggle "Enable TOTP" ON
--   → Optionally set "Enrollment" to "Optional" (users choose to enable it)
--     or "Required" (force all users to set it up)
--
--  No SQL migration needed for this step.
-- ==============================================================================
