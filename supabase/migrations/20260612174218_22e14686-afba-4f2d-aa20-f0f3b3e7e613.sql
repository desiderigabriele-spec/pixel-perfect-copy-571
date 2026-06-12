CREATE OR REPLACE FUNCTION public.profiles_guard_points_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypassa RLS e non passa per auth.uid(); rileviamo via current_user.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
    RAISE EXCEPTION 'points_balance can only be modified by server-side functions';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.profiles_guard_points_balance() FROM anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_points_balance_trg ON public.profiles;
CREATE TRIGGER profiles_guard_points_balance_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_points_balance();
