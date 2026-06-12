CREATE TYPE public.challenge_mode AS ENUM ('1v1', 'solo_goal');

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS mode public.challenge_mode NOT NULL DEFAULT '1v1',
  ADD COLUMN IF NOT EXISTS goal_pips numeric,
  ADD COLUMN IF NOT EXISTS goal_reached boolean;