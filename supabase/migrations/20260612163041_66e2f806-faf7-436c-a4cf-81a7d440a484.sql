REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.touch_updated_at() TO service_role;