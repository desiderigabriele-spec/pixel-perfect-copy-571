-- Lock down points_balance: only service_role (server functions) can update it.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, avatar_seed, country, language, style, primary_asset)
  ON public.profiles TO authenticated;