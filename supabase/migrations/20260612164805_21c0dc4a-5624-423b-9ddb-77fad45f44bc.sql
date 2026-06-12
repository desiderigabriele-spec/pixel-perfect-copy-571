CREATE TABLE public.challenge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX challenge_messages_challenge_idx
  ON public.challenge_messages (challenge_id, created_at DESC);

GRANT SELECT, INSERT ON public.challenge_messages TO authenticated;
GRANT ALL ON public.challenge_messages TO service_role;

ALTER TABLE public.challenge_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_messages" ON public.challenge_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (
          c.visibility = 'public'
          OR c.creator_id = auth.uid()
          OR c.opponent_id = auth.uid()
        )
    )
  );

CREATE POLICY "post_messages" ON public.challenge_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.status IN ('waiting', 'live')
        AND (c.creator_id = auth.uid() OR c.opponent_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_messages;