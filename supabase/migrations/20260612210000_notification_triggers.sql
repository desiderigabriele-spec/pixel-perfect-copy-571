-- Notification triggers via pg_net → Edge Function send-notification.
-- pg_net è disponibile su tutti i piani Supabase (incluso free tier).
-- Per abilitarlo: Dashboard → Database → Extensions → pg_net.
-- Sostituire <PROJECT_ID> con l'ID reale del progetto Supabase (es. lupfzakkapafpabkfofm).

-- 1. Trigger su challenges: notifica quando una sfida diventa LIVE o SETTLED.
CREATE OR REPLACE FUNCTION public.notify_challenge_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
  fn_url  TEXT := 'https://' || current_setting('app.supabase_project_id', TRUE) ||
                  '.supabase.co/functions/v1/send-notification';
BEGIN
  -- Chiamiamo solo quando lo status cambia davvero.
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'live' THEN
    payload := jsonb_build_object(
      'type', 'challenge_live',
      'challenge_id', NEW.id::TEXT,
      'user_ids', jsonb_build_array(NEW.creator_id::TEXT, NEW.opponent_id::TEXT)
    );
  ELSIF NEW.status = 'settled' THEN
    payload := jsonb_build_object(
      'type', 'challenge_settled',
      'challenge_id', NEW.id::TEXT,
      'user_ids', jsonb_build_array(NEW.creator_id::TEXT, NEW.opponent_id::TEXT)
    );
  ELSE
    RETURN NEW;
  END IF;

  -- Fire-and-forget: ignora eventuali errori di rete.
  BEGIN
    PERFORM net.http_post(
      url     := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', TRUE)
      ),
      body    := payload::TEXT
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net non abilitato o errore di rete → log e continua.
    RAISE WARNING 'notify_challenge: pg_net call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_challenge_status_trg ON public.challenges;
CREATE TRIGGER notify_challenge_status_trg
  AFTER UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_challenge_status_change();

-- 2. Trigger su avatrade_verifications: notifica quando la verifica viene approvata/rifiutata.
CREATE OR REPLACE FUNCTION public.notify_verification_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload JSONB;
  fn_url  TEXT := 'https://' || current_setting('app.supabase_project_id', TRUE) ||
                  '.supabase.co/functions/v1/send-notification';
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('verified', 'rejected') THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'verification_reviewed',
    'verification_id', NEW.id::TEXT,
    'user_ids', jsonb_build_array(NEW.user_id::TEXT)
  );

  BEGIN
    PERFORM net.http_post(
      url     := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', TRUE)
      ),
      body    := payload::TEXT
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_verification: pg_net call failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_verification_reviewed_trg ON public.avatrade_verifications;
CREATE TRIGGER notify_verification_reviewed_trg
  AFTER UPDATE ON public.avatrade_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_verification_reviewed();

REVOKE EXECUTE ON FUNCTION public.notify_challenge_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_verification_reviewed() FROM anon, authenticated;

-- Per configurare i parametri runtime nel progetto Supabase:
-- ALTER DATABASE postgres SET app.supabase_project_id = 'lupfzakkapafpabkfofm';
-- ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';
-- Oppure usa Supabase Vault per gestire il service_role_key in modo sicuro.
