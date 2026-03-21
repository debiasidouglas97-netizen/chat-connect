
-- Function: when an emenda is inserted, create a matching demanda in the kanban
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
    'Nova',
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

-- Trigger on emenda insert
CREATE TRIGGER trg_emenda_to_demanda
AFTER INSERT ON public.emendas
FOR EACH ROW
EXECUTE FUNCTION public.sync_emenda_to_demanda();
