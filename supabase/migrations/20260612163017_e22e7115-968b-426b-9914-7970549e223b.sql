
-- Step 03 — Sfide 1v1 e bilancio punti HTT

-- Saldo punti per ogni profilo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 1000;

-- Enum stato sfida
DO $$ BEGIN
  CREATE TYPE public.challenge_status AS ENUM ('waiting', 'live', 'settled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum tipo posta
DO $$ BEGIN
  CREATE TYPE public.stake_type AS ENUM ('points', 'honor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum visibilità
DO $$ BEGIN
  CREATE TYPE public.challenge_visibility AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabella sfide
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (15, 60, 240, 1440)),
  stake_type public.stake_type NOT NULL DEFAULT 'honor',
  stake_amount INTEGER NOT NULL DEFAULT 0 CHECK (stake_amount >= 0),
  visibility public.challenge_visibility NOT NULL DEFAULT 'public',
  invite_code TEXT UNIQUE,
  status public.challenge_status NOT NULL DEFAULT 'waiting',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_pips NUMERIC,
  opponent_pips NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creator_not_opponent CHECK (creator_id <> opponent_id)
);

-- Grants
GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

-- RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Lettura: pubbliche visibili a tutti gli autenticati; private solo a creator/opponent/admin
CREATE POLICY challenges_select ON public.challenges
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR creator_id = auth.uid()
    OR opponent_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT/UPDATE/DELETE solo via server functions (service_role). Nessuna policy per authenticated.

-- Indici utili
CREATE INDEX IF NOT EXISTS challenges_status_idx ON public.challenges(status);
CREATE INDEX IF NOT EXISTS challenges_creator_idx ON public.challenges(creator_id);
CREATE INDEX IF NOT EXISTS challenges_opponent_idx ON public.challenges(opponent_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS challenges_touch_updated_at ON public.challenges;
CREATE TRIGGER challenges_touch_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
