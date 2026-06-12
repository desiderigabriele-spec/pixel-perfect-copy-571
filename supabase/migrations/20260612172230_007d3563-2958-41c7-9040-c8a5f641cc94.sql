-- =========================================================
-- 1) avatrade_verifications: column-level lockdown for users
-- =========================================================

-- Drop overly-permissive UPDATE policy
DROP POLICY IF EXISTS avt_update_own_pending_or_admin ON public.avatrade_verifications;

-- Admins: full UPDATE
CREATE POLICY avt_update_admin ON public.avatrade_verifications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Users: can UPDATE their own pending row, but a trigger blocks
-- attempts to touch admin-only columns.
CREATE POLICY avt_update_own_pending ON public.avatrade_verifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending'::verification_status)
  WITH CHECK (user_id = auth.uid() AND status = 'pending'::verification_status);

-- Trigger: prevent non-admins from changing protected fields
CREATE OR REPLACE FUNCTION public.avt_guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
  THEN
    RAISE EXCEPTION 'Only admins can modify status, reviewed_at, reviewed_by, notes, user_id, or submitted_at';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS avt_guard_protected_columns_trg ON public.avatrade_verifications;
CREATE TRIGGER avt_guard_protected_columns_trg
  BEFORE UPDATE ON public.avatrade_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.avt_guard_protected_columns();

-- =========================================================
-- 2) Realtime: lock down broadcast/presence channels
-- =========================================================
-- The app only uses postgres_changes (server-enforced via table RLS).
-- Enabling RLS on realtime.messages with no policies denies all
-- broadcast/presence subscriptions by default, preventing any
-- authenticated user from snooping arbitrary channel topics.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;