
UPDATE public.cidades c
SET liderancas = (
  SELECT count(*) FROM public.liderancas l WHERE l.cidade_principal = c.name
),
updated_at = now();
