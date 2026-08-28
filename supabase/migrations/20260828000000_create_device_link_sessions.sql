-- Create device_link_sessions table for Cross-Device QR Code Login
CREATE TABLE IF NOT EXISTS public.device_link_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT UNIQUE NOT NULL,
    user_code TEXT NOT NULL,
    device_name TEXT NOT NULL DEFAULT '冷蔵庫の共有端末',
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    authorized_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'consumed', 'expired')),
    device_session_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '5 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.device_link_sessions ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. Anyone (even unauthenticated shared device) can insert a pending session
CREATE POLICY "Allow anyone to initiate device link session"
    ON public.device_link_sessions FOR INSERT
    WITH CHECK (status = 'pending');

-- 2. Anyone can read a session by device_code (to check pending/approved status)
CREATE POLICY "Allow reading session by device_code"
    ON public.device_link_sessions FOR SELECT
    USING (true);

-- 3. Authenticated users can approve a session
CREATE POLICY "Allow authenticated users to approve session"
    ON public.device_link_sessions FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow updating status to 'consumed'
CREATE POLICY "Allow consuming approved session"
    ON public.device_link_sessions FOR UPDATE
    USING (true)
    WITH CHECK (true);
