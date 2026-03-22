
-- Add new columns to demandas
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS creator_chat_id bigint,
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_name text;

-- Create demanda_history table
CREATE TABLE IF NOT EXISTS public.demanda_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'Sistema',
  old_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demanda_history_demanda_id ON public.demanda_history(demanda_id);

ALTER TABLE public.demanda_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demanda history" ON public.demanda_history FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert demanda history" ON public.demanda_history FOR INSERT TO public WITH CHECK (true);

-- Create demanda_comments table
CREATE TABLE IF NOT EXISTS public.demanda_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  author text NOT NULL,
  text text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  chat_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demanda_comments_demanda_id ON public.demanda_comments(demanda_id);

ALTER TABLE public.demanda_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demanda comments" ON public.demanda_comments FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert demanda comments" ON public.demanda_comments FOR INSERT TO public WITH CHECK (true);

-- Create telegram conversation state table for /demanda flow
CREATE TABLE IF NOT EXISTS public.telegram_conversation_state (
  chat_id bigint PRIMARY KEY,
  step text NOT NULL DEFAULT 'idle',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_conversation_state ENABLE ROW LEVEL SECURITY;

-- Notification log
CREATE TABLE IF NOT EXISTS public.demanda_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL,
  status_sent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notifications" ON public.demanda_notifications FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.demanda_notifications FOR INSERT TO public WITH CHECK (true);
