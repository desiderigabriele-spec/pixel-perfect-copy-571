-- F2.1: Sistema Tornei HTT
-- Formato: single elimination. Massimo 4/8/16 partecipanti.
-- Ogni match è una sfida 1v1 standard (usa la tabella challenges).

CREATE TABLE public.tournaments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  creator_id       UUID NOT NULL REFERENCES public.profiles(id),
  symbol           TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_players      SMALLINT NOT NULL DEFAULT 8
                     CHECK (max_players IN (4, 8, 16)),
  stake_type       TEXT NOT NULL DEFAULT 'honor'
                     CHECK (stake_type IN ('honor', 'points')),
  stake_amount     INTEGER NOT NULL DEFAULT 0 CHECK (stake_amount >= 0),
  status           TEXT NOT NULL DEFAULT 'registration'
                     CHECK (status IN ('registration', 'in_progress', 'completed', 'cancelled')),
  visibility       TEXT NOT NULL DEFAULT 'public'
                     CHECK (visibility IN ('public', 'private')),
  invite_code      TEXT UNIQUE,
  prize_note       TEXT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tournament_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id),
  seed             SMALLINT,
  eliminated_round SMALLINT,
  final_rank       SMALLINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE public.tournament_matches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  challenge_id   UUID REFERENCES public.challenges(id),
  round          SMALLINT NOT NULL,
  slot           SMALLINT NOT NULL,
  player1_id     UUID REFERENCES public.profiles(id),
  player2_id     UUID REFERENCES public.profiles(id),
  winner_id      UUID REFERENCES public.profiles(id),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'live', 'completed', 'bye')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, round, slot)
);

-- Indici
CREATE INDEX tournaments_status_idx ON public.tournaments (status);
CREATE INDEX tournament_entries_tournament_idx ON public.tournament_entries (tournament_id);
CREATE INDEX tournament_matches_tournament_idx ON public.tournament_matches (tournament_id);
CREATE INDEX tournament_matches_challenge_idx ON public.tournament_matches (challenge_id);

-- Realtime per la pagina torneo live
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;

-- RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Tornei pubblici visibili a tutti, privati solo agli iscritti o al creator.
CREATE POLICY "tournaments_read" ON public.tournaments
  FOR SELECT USING (
    visibility = 'public'
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournament_entries
       WHERE tournament_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "tournaments_insert_auth" ON public.tournaments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

CREATE POLICY "tournaments_update_creator" ON public.tournaments
  FOR UPDATE USING (creator_id = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  ));

CREATE POLICY "tournament_entries_read" ON public.tournament_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
       WHERE t.id = tournament_id
         AND (t.visibility = 'public' OR t.creator_id = auth.uid() OR user_id = auth.uid())
    )
  );

CREATE POLICY "tournament_entries_insert" ON public.tournament_entries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "tournament_entries_delete_own" ON public.tournament_entries
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "tournament_matches_read" ON public.tournament_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
       WHERE t.id = tournament_id AND t.visibility = 'public'
    )
    OR player1_id = auth.uid()
    OR player2_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournament_entries
       WHERE tournament_id = tournament_matches.tournament_id AND user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
