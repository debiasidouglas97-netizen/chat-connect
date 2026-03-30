
ALTER TABLE public.tenants 
  ADD COLUMN telegram_bot_token TEXT DEFAULT NULL,
  ADD COLUMN telegram_bot_username TEXT DEFAULT NULL;

-- Pre-fill Antonio Carlos Rodrigues bot
UPDATE public.tenants 
SET telegram_bot_username = '@MandatoGov_Bot'
WHERE id = 'b261fd81-9af8-46a3-91df-e57882508c0a';
