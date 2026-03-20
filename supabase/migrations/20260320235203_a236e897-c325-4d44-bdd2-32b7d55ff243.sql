
CREATE OR REPLACE FUNCTION public.sync_cidade_liderancas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update old city count (on DELETE or UPDATE changing cidade_principal)
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.cidade_principal IS DISTINCT FROM NEW.cidade_principal)) THEN
    UPDATE public.cidades
    SET liderancas = (
      SELECT count(*) FROM public.liderancas WHERE cidade_principal = OLD.cidade_principal
    ),
    updated_at = now()
    WHERE name = OLD.cidade_principal;
  END IF;

  -- Update new city count (on INSERT or UPDATE changing cidade_principal)
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.cidade_principal IS DISTINCT FROM NEW.cidade_principal)) THEN
    UPDATE public.cidades
    SET liderancas = (
      SELECT count(*) FROM public.liderancas WHERE cidade_principal = NEW.cidade_principal
    ),
    updated_at = now()
    WHERE name = NEW.cidade_principal;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_cidade_liderancas
AFTER INSERT OR UPDATE OF cidade_principal OR DELETE
ON public.liderancas
FOR EACH ROW
EXECUTE FUNCTION public.sync_cidade_liderancas();
