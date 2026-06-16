-- Aggiunge leva finanziaria ai trade + tabella ordini limite

-- ── Leva su paper_trades ─────────────────────────────────────────────────────
ALTER TABLE public.paper_trades ADD COLUMN IF NOT EXISTS leverage NUMERIC NOT NULL DEFAULT 1;

-- ── paper_pending_orders ──────────────────────────────────────────────────────
CREATE TABLE public.paper_pending_orders (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       TEXT     NOT NULL,
  direction    TEXT     NOT NULL CHECK (direction IN ('buy', 'sell')),
  size_usd     NUMERIC  NOT NULL,
  leverage     NUMERIC  NOT NULL DEFAULT 1,
  entry_price  NUMERIC  NOT NULL,
  sl_price     NUMERIC,
  tp_price     NUMERIC,
  price_above  BOOLEAN  NOT NULL,  -- prezzo era sopra entry_price alla creazione?
  status       TEXT     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'filled', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_pending_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.paper_pending_orders TO authenticated;
GRANT ALL            ON public.paper_pending_orders TO service_role;

CREATE POLICY "paper_pending_orders_own" ON public.paper_pending_orders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX paper_pending_orders_user_idx   ON public.paper_pending_orders(user_id);
CREATE INDEX paper_pending_orders_status_idx ON public.paper_pending_orders(status);
