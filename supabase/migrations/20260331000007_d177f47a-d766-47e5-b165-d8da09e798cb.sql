-- Add latitude and longitude columns to cidades table
ALTER TABLE public.cidades ADD COLUMN latitude double precision;
ALTER TABLE public.cidades ADD COLUMN longitude double precision;