
-- Add votos column to cidades
ALTER TABLE public.cidades ADD COLUMN IF NOT EXISTS votos_2022 integer NOT NULL DEFAULT 0;

-- Add TSE candidate number to tenants for fetching voting data
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS nr_candidato_tse text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ano_eleicao integer NOT NULL DEFAULT 2022;
