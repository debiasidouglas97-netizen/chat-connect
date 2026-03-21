ALTER TABLE public.telegram_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read telegram contacts"
ON public.telegram_contacts
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can read telegram messages"
ON public.telegram_messages
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can update telegram messages read state"
ON public.telegram_messages
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);