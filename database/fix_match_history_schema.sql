-- ==============================================================================
-- FIX: SYNC MATCH HISTORY SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Ensure columns exist (Add if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='signature') THEN
        ALTER TABLE public.match_history ADD COLUMN signature TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='played_at') THEN
        ALTER TABLE public.match_history ADD COLUMN played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='level_id') THEN
        ALTER TABLE public.match_history ADD COLUMN level_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='tokens_gained') THEN
        ALTER TABLE public.match_history ADD COLUMN tokens_gained INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='xp_gained') THEN
        ALTER TABLE public.match_history ADD COLUMN xp_gained INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='total_kills') THEN
        ALTER TABLE public.match_history ADD COLUMN total_kills INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='total_damage') THEN
        ALTER TABLE public.match_history ADD COLUMN total_damage BIGINT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='duration_seconds') THEN
        ALTER TABLE public.match_history ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='waves_cleared') THEN
        ALTER TABLE public.match_history ADD COLUMN waves_cleared INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='result') THEN
        ALTER TABLE public.match_history ADD COLUMN result TEXT NOT NULL DEFAULT 'loss';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_history' AND column_name='profile_id') THEN
        ALTER TABLE public.match_history ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. REFRESH SCHEMA CACHE
-- Note: Supabase automatically refreshes cache after DDL changes, 
-- but you can manually trigger it by running 'NOTIFY pgrst, "reload schema";' 
-- though it requires superuser which Supabase dashboard usually handles.
