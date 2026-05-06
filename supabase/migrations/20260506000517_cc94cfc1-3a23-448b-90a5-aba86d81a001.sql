ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS demanda_visible_origins text[] NOT NULL DEFAULT ARRAY['manual','telegram','proposicao','emenda','agenda','comunicacao'],
  ADD COLUMN IF NOT EXISTS demanda_max_age_days integer;