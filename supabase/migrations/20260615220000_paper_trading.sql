-- Step 2: Paper trading — conti virtuali, trade simulati, classifica

-- ── paper_accounts ───────────────────────────────────────────────────────────
-- Un conto virtuale per ogni utente, saldo iniziale $10.000
CREATE TABLE public.paper_accounts (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID     NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    NUMERIC  NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.paper_accounts TO authenticated;
GRANT ALL    ON public.paper_accounts TO service_role;

CREATE POLICY "paper_accounts_select_own" ON public.paper_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── paper_trades ─────────────────────────────────────────────────────────────
CREATE TABLE public.paper_trades (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       TEXT     NOT NULL,
  direction    TEXT     NOT NULL CHECK (direction IN ('buy', 'sell')),
  quantity     NUMERIC  NOT NULL CHECK (quantity > 0),
  entry_price  NUMERIC  NOT NULL,
  exit_price   NUMERIC,
  sl_price     NUMERIC,
  tp_price     NUMERIC,
  pnl          NUMERIC,
  pips         NUMERIC,
  status       TEXT     NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ
);

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.paper_trades TO authenticated;
GRANT ALL            ON public.paper_trades TO service_role;

CREATE POLICY "paper_trades_select_own" ON public.paper_trades
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "paper_trades_insert_own" ON public.paper_trades
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- L'UPDATE (close trade + SL/TP) viene fatto solo via service_role dalle server functions
-- per evitare manipolazioni client-side del P&L

CREATE INDEX paper_trades_user_idx   ON public.paper_trades(user_id);
CREATE INDEX paper_trades_status_idx ON public.paper_trades(status);
CREATE INDEX paper_trades_symbol_idx ON public.paper_trades(symbol);

-- ── paper_leaderboard (view) ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.paper_leaderboard AS
SELECT
  pa.user_id,
  p.username,
  p.avatar_seed,
  pa.balance,
  ROUND((pa.balance - 10000)::numeric, 2)                        AS total_pnl,
  ROUND(((pa.balance - 10000) / 10000.0 * 100)::numeric, 2)     AS return_pct,
  COUNT(pt.id) FILTER (WHERE pt.status = 'closed')               AS trades_count,
  COUNT(pt.id) FILTER (WHERE pt.status = 'closed' AND pt.pnl > 0) AS wins,
  COUNT(pt.id) FILTER (WHERE pt.status = 'closed' AND pt.pnl <= 0) AS losses
FROM public.paper_accounts pa
JOIN  public.profiles p ON p.id = pa.user_id
LEFT JOIN public.paper_trades pt ON pt.user_id = pa.user_id
GROUP BY pa.user_id, p.username, p.avatar_seed, pa.balance;

GRANT SELECT ON public.paper_leaderboard TO authenticated;

-- ── Trigger: crea paper_account automaticamente alla registrazione ────────────
CREATE OR REPLACE FUNCTION public.handle_new_paper_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.paper_accounts (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_paper_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_paper_account();

-- Crea paper_account per utenti già esistenti
INSERT INTO public.paper_accounts (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
