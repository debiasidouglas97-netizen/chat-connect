CREATE OR REPLACE FUNCTION public.sync_emenda_to_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.demandas (title, city, col, priority)
  VALUES (
    'Emenda ' || NEW.tipo || ' - ' || NEW.valor,
    NEW.cidade,
    'nova',
    CASE
      WHEN NEW.status = 'Aprovada' THEN 'Alta'
      WHEN NEW.status = 'Liberada' THEN 'Alta'
      WHEN NEW.status = 'Paga' THEN 'Média'
      ELSE 'Média'
    END
  );

  RETURN NEW;
END;
$$;