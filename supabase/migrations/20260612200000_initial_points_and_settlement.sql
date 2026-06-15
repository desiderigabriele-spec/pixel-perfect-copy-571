-- P1.1: Punti iniziali per ogni nuovo utente.
-- Ogni profilo parte con 1000 HTT points senza richiedere un trigger separato.
ALTER TABLE public.profiles
  ALTER COLUMN points_balance SET DEFAULT 1000;

-- P1.2: Funzione SQL per liquidare le sfide scadute.
-- Chiamabile da pg_cron oppure da una Edge Function schedulata.
-- Usa lo stesso algoritmo deterministico di priceFeed.ts (mulberry32 + gaussian).
CREATE OR REPLACE FUNCTION public.settle_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec          RECORD;
  settled_count INTEGER := 0;
  starts_ms    BIGINT;
  ends_ms      BIGINT;
  duration_sec DOUBLE PRECISION;
  creator_pips DOUBLE PRECISION;
  opp_pips     DOUBLE PRECISION;
  exit_p       DOUBLE PRECISION;
  winner_id    UUID;
  goal_reached BOOLEAN;
  pot          INTEGER;
BEGIN
  FOR rec IN
    SELECT * FROM public.challenges
    WHERE status = 'live'
      AND ends_at IS NOT NULL
      AND ends_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    starts_ms    := EXTRACT(EPOCH FROM rec.starts_at) * 1000;
    ends_ms      := EXTRACT(EPOCH FROM rec.ends_at) * 1000;
    duration_sec := (ends_ms - starts_ms) / 1000.0;

    -- Pips deterministici (replica TypeScript priceFeed.ts)
    creator_pips := public.pips_for(rec.symbol, starts_ms, duration_sec, rec.creator_side::TEXT);
    opp_pips     := CASE
                      WHEN rec.opponent_id IS NOT NULL
                      THEN public.pips_for(rec.symbol, starts_ms, duration_sec, COALESCE(rec.opponent_side, 'short')::TEXT)
                      ELSE 0
                    END;
    exit_p       := public.price_at_sql(rec.symbol, starts_ms, duration_sec);

    -- Winner
    winner_id    := NULL;
    goal_reached := NULL;
    IF rec.mode = 'solo_goal' THEN
      goal_reached := creator_pips >= COALESCE(rec.goal_pips, 0);
      winner_id    := CASE WHEN goal_reached THEN rec.creator_id ELSE NULL END;
    ELSE
      IF creator_pips > opp_pips THEN winner_id := rec.creator_id;
      ELSIF opp_pips > creator_pips THEN winner_id := rec.opponent_id;
      END IF;
    END IF;

    -- Trasferimento punti
    IF rec.stake_type = 'points' AND rec.stake_amount > 0 THEN
      IF winner_id IS NOT NULL THEN
        pot := rec.stake_amount * 2;
        UPDATE public.profiles
           SET points_balance = points_balance + pot
         WHERE id = winner_id;
      ELSE
        -- Pareggio: rimborso
        UPDATE public.profiles
           SET points_balance = points_balance + rec.stake_amount
         WHERE id IN (rec.creator_id, rec.opponent_id);
      END IF;
    END IF;

    UPDATE public.challenges
       SET status        = 'settled',
           winner_id     = winner_id,
           creator_pips  = ROUND(creator_pips::NUMERIC, 1),
           opponent_pips = ROUND(opp_pips::NUMERIC, 1),
           exit_price    = exit_p,
           settled_at    = NOW(),
           goal_reached  = goal_reached
     WHERE id = rec.id
       AND status = 'live';

    settled_count := settled_count + 1;
  END LOOP;

  RETURN settled_count;
END;
$$;

-- Helper: price_at_sql — implementazione SQL del random walk deterministico di priceFeed.ts.
-- Stessa logica: mulberry32 PRNG + Box-Muller gaussian, un passo al secondo.
CREATE OR REPLACE FUNCTION public.price_at_sql(
  p_symbol    TEXT,
  p_starts_ms BIGINT,
  p_t_sec     DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  sym_reference DOUBLE PRECISION;
  sym_pip_size  DOUBLE PRECISION;
  sym_vol       DOUBLE PRECISION;
  seed          BIGINT;
  steps         INTEGER;
  a             BIGINT;
  t_val         BIGINT;
  u             DOUBLE PRECISION := 0;
  v             DOUBLE PRECISION := 0;
  cum_pips      DOUBLE PRECISION := 0;
  i             INTEGER;
  key           TEXT;
BEGIN
  -- Lookup simbolo
  SELECT reference, "pipSize", volatility
    INTO sym_reference, sym_pip_size, sym_vol
    FROM (VALUES
      ('EURUSD', 1.085,   0.0001, 0.6),
      ('GBPUSD', 1.27,    0.0001, 0.9),
      ('USDJPY', 150.0,   0.01,   0.8),
      ('AUDUSD', 0.66,    0.0001, 0.7),
      ('USDCAD', 1.35,    0.0001, 0.7),
      ('XAUUSD', 2050.0,  0.1,    1.8),
      ('XAGUSD', 25.5,    0.01,   2.4),
      ('BTCUSD', 100000,  1.0,    4.5),
      ('ETHUSD', 3500,    0.1,    5.0),
      ('US500',  5800,    0.1,    1.2),
      ('NAS100', 20000,   0.1,    1.8),
      ('GER40',  18500,   0.1,    1.4)
    ) AS t(code, reference, "pipSize", volatility)
   WHERE code = p_symbol;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- xfnv1a hash di "<symbol>|<startsMs>"
  key  := p_symbol || '|' || p_starts_ms::TEXT;
  seed := 2166136261;
  FOR i IN 1..LENGTH(key) LOOP
    seed := ((seed # ASCII(SUBSTRING(key, i, 1))) * 16777619) & x'FFFFFFFF'::BIGINT;
  END LOOP;

  steps := GREATEST(0, FLOOR(p_t_sec)::INTEGER);
  a     := seed & x'FFFFFFFF'::BIGINT;

  FOR i IN 1..steps LOOP
    -- mulberry32 step
    a     := (a + x'6D2B79F5'::BIGINT) & x'FFFFFFFF'::BIGINT;
    t_val := a;
    t_val := (t_val # ((t_val >> 15))) & x'FFFFFFFF'::BIGINT;
    t_val := (t_val * ((t_val | 1) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT;
    t_val := (t_val # (t_val + ((t_val # ((t_val >> 7) & x'FFFFFFFF'::BIGINT)) * ((t_val | 61) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT;
    u     := ((t_val # ((t_val >> 14) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT)::DOUBLE PRECISION / 4294967296.0;
    -- secondo numero per Box-Muller
    a     := (a + x'6D2B79F5'::BIGINT) & x'FFFFFFFF'::BIGINT;
    t_val := a;
    t_val := (t_val # ((t_val >> 15))) & x'FFFFFFFF'::BIGINT;
    t_val := (t_val * ((t_val | 1) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT;
    t_val := (t_val # (t_val + ((t_val # ((t_val >> 7) & x'FFFFFFFF'::BIGINT)) * ((t_val | 61) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT;
    v     := ((t_val # ((t_val >> 14) & x'FFFFFFFF'::BIGINT)) & x'FFFFFFFF'::BIGINT)::DOUBLE PRECISION / 4294967296.0;
    -- Clamp: evita log(0)
    IF u <= 0 THEN u := 1e-15; END IF;
    IF v <= 0 THEN v := 1e-15; END IF;
    cum_pips := cum_pips + SQRT(-2.0 * LN(u)) * COS(2.0 * PI() * v) * sym_vol;
  END LOOP;

  RETURN sym_reference + cum_pips * sym_pip_size;
END;
$$;

-- Helper: pips_for_sql — pips realizzati da una posizione direzionale.
CREATE OR REPLACE FUNCTION public.pips_for(
  p_symbol    TEXT,
  p_starts_ms BIGINT,
  p_t_sec     DOUBLE PRECISION,
  p_side      TEXT
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  sym_pip_size DOUBLE PRECISION;
  entry_price  DOUBLE PRECISION;
  cur_price    DOUBLE PRECISION;
  raw          DOUBLE PRECISION;
BEGIN
  SELECT "pipSize"
    INTO sym_pip_size
    FROM (VALUES
      ('EURUSD', 0.0001), ('GBPUSD', 0.0001), ('USDJPY', 0.01),
      ('AUDUSD', 0.0001), ('USDCAD', 0.0001), ('XAUUSD', 0.1),
      ('XAGUSD', 0.01),   ('BTCUSD', 1.0),    ('ETHUSD', 0.1),
      ('US500',  0.1),    ('NAS100', 0.1),    ('GER40',  0.1)
    ) AS t(code, "pipSize")
   WHERE code = p_symbol;

  IF NOT FOUND THEN RETURN 0; END IF;

  entry_price := public.price_at_sql(p_symbol, p_starts_ms, 0);
  cur_price   := public.price_at_sql(p_symbol, p_starts_ms, p_t_sec);
  raw         := (cur_price - entry_price) / sym_pip_size;

  RETURN CASE WHEN p_side = 'long' THEN raw ELSE -raw END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_expired_challenges() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.price_at_sql(TEXT, BIGINT, DOUBLE PRECISION) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pips_for(TEXT, BIGINT, DOUBLE PRECISION, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_expired_challenges() TO service_role;
GRANT EXECUTE ON FUNCTION public.price_at_sql(TEXT, BIGINT, DOUBLE PRECISION) TO service_role;
GRANT EXECUTE ON FUNCTION public.pips_for(TEXT, BIGINT, DOUBLE PRECISION, TEXT) TO service_role;

-- Abilita pg_cron (richiede Supabase Pro o self-hosted con pg_cron).
-- Se non disponibile, usa la Edge Function supabase/functions/settle-expired/index.ts.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('settle-expired-challenges', '* * * * *', 'SELECT public.settle_expired_challenges()');
