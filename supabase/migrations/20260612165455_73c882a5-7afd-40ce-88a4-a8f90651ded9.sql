-- Helper function: l'utente è affiliato (verifica AvaTrade approvata)?
CREATE OR REPLACE FUNCTION public.is_affiliated(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.avatrade_verifications
    WHERE user_id = _user_id AND status = 'verified'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_affiliated(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_affiliated(uuid) TO authenticated, service_role;

-- Chat spettatori durante una live (separata dalla chat partecipanti)
CREATE TABLE public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_chat_challenge_idx
  ON public.live_chat_messages (challenge_id, created_at DESC);

GRANT SELECT, INSERT ON public.live_chat_messages TO authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_chat_read" ON public.live_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.visibility = 'public'
    )
  );

CREATE POLICY "live_chat_post" ON public.live_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_affiliated(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.visibility = 'public'
        AND c.status = 'live'
    )
  );

-- Reazioni emoji (effimere, niente delete a mano: TTL via cleanup esterno)
CREATE TABLE public.live_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🔥','💎','👏','⚡','💪')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_reactions_challenge_idx
  ON public.live_reactions (challenge_id, created_at DESC);

GRANT SELECT, INSERT ON public.live_reactions TO authenticated;
GRANT ALL ON public.live_reactions TO service_role;

ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_reactions_read" ON public.live_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.visibility = 'public'
    )
  );

CREATE POLICY "live_reactions_post" ON public.live_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_affiliated(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.visibility = 'public'
        AND c.status = 'live'
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;