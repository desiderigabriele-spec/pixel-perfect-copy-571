CREATE TYPE public.trading_style AS ENUM ('scalper', 'intraday', 'swing');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text CHECK (country IS NULL OR char_length(country) = 2),
  ADD COLUMN IF NOT EXISTS language text CHECK (language IS NULL OR language IN ('it','en','es','de','fr')),
  ADD COLUMN IF NOT EXISTS style public.trading_style,
  ADD COLUMN IF NOT EXISTS primary_asset text;

CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles (country);
CREATE INDEX IF NOT EXISTS profiles_language_idx ON public.profiles (language);
CREATE INDEX IF NOT EXISTS profiles_style_idx ON public.profiles (style);
CREATE INDEX IF NOT EXISTS profiles_primary_asset_idx ON public.profiles (primary_asset);