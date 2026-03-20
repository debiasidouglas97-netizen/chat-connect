
-- Add contact and social media fields to deputy_profile
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS telegram_username text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS youtube text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS address_cep text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS address_neighborhood text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE public.deputy_profile ADD COLUMN IF NOT EXISTS address_state text;
