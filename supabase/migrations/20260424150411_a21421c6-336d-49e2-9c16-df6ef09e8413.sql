-- Trigger: sincronizar nome/avatar/whatsapp/telegram da liderança para o profile vinculado
CREATE OR REPLACE FUNCTION public.sync_lideranca_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas se algum dos campos espelhados mudou
  IF (TG_OP = 'UPDATE') AND (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
    OLD.img IS DISTINCT FROM NEW.img OR
    OLD.whatsapp IS DISTINCT FROM NEW.whatsapp OR
    OLD.telegram_username IS DISTINCT FROM NEW.telegram_username OR
    OLD.cidade_principal IS DISTINCT FROM NEW.cidade_principal
  ) THEN
    UPDATE public.profiles
    SET
      full_name = NEW.name,
      avatar_url = COALESCE(NEW.avatar_url, NEW.img, profiles.avatar_url),
      whatsapp = NEW.whatsapp,
      telegram_username = NEW.telegram_username,
      cities = ARRAY[NEW.cidade_principal],
      updated_at = now()
    WHERE lideranca_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lideranca_to_profile ON public.liderancas;
CREATE TRIGGER trg_sync_lideranca_to_profile
AFTER UPDATE ON public.liderancas
FOR EACH ROW
EXECUTE FUNCTION public.sync_lideranca_to_profile();

-- Trigger: ao deletar uma liderança, desativa o profile vinculado (não apaga auth user)
CREATE OR REPLACE FUNCTION public.deactivate_lideranca_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_active = false, updated_at = now()
  WHERE lideranca_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_lideranca_profile ON public.liderancas;
CREATE TRIGGER trg_deactivate_lideranca_profile
BEFORE DELETE ON public.liderancas
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_lideranca_profile();

-- Garantir índices únicos em CPF e username (case-insensitive) para evitar duplicidade
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique ON public.profiles (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;