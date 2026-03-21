CREATE OR REPLACE FUNCTION public.sync_emenda_to_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  valor_formatado text;
  valor_num numeric;
BEGIN
  -- Try to parse as number and format as BRL
  BEGIN
    valor_num := regexp_replace(NEW.valor, '[^0-9,.]', '', 'g')::numeric;
    valor_formatado := 'R$ ' || to_char(valor_num, 'FM999G999G999G999D00');
    -- Replace default grouping/decimal to Brazilian format
    valor_formatado := replace(replace(replace(valor_formatado, ',', '#'), '.', ','), '#', '.');
  EXCEPTION WHEN OTHERS THEN
    valor_formatado := NEW.valor;
  END;

  INSERT INTO public.demandas (title, city, col, priority)
  VALUES (
    'Emenda ' || NEW.tipo || ' - ' || valor_formatado,
    NEW.cidade,
    'nova',
    CASE
      WHEN NEW.status IN ('Aprovada', 'Liberada') THEN 'Alta'
      ELSE 'Média'
    END
  );

  RETURN NEW;
END;
$$;