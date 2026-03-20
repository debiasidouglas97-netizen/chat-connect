-- Singleton table to track the getUpdates offset
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single row
INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Enable RLS (only service_role should access this)
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

-- Table for storing incoming and outgoing messages
CREATE TABLE public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id BIGINT UNIQUE,
  chat_id BIGINT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
  text TEXT,
  raw_update JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);
CREATE INDEX idx_telegram_messages_created_at ON public.telegram_messages (created_at DESC);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read messages"
  ON public.telegram_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON public.telegram_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
  ON public.telegram_messages FOR UPDATE
  TO authenticated
  USING (true);

-- Table for linking Telegram chat_ids to liderancas
CREATE TABLE public.telegram_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  lideranca_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contacts"
  ON public.telegram_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contacts"
  ON public.telegram_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
  ON public.telegram_contacts FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime on telegram_messages for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;

-- Enable pg_cron and pg_net for polling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;