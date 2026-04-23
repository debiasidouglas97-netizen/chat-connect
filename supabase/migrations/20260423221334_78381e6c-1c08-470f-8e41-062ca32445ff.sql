
ALTER TABLE public.liderancas
ADD COLUMN IF NOT EXISTS meta_votos_tipo text DEFAULT 'percentual',
ADD COLUMN IF NOT EXISTS meta_votos_valor numeric DEFAULT NULL;

COMMENT ON COLUMN public.liderancas.meta_votos_tipo IS 'Tipo da meta: percentual ou fixo';
COMMENT ON COLUMN public.liderancas.meta_votos_valor IS 'Valor da meta (% ou quantidade absoluta de votos)';
