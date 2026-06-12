CREATE TYPE public.trade_side AS ENUM ('long', 'short');

ALTER TABLE public.challenges
  ADD COLUMN creator_side public.trade_side NOT NULL DEFAULT 'long',
  ADD COLUMN opponent_side public.trade_side,
  ADD COLUMN entry_price numeric,
  ADD COLUMN exit_price numeric,
  ADD COLUMN settled_at timestamptz;

-- Allow service_role to perform all writes (server fns use admin client).
GRANT ALL ON public.challenges TO service_role;
