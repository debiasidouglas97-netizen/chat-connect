
-- Expand eventos table with new fields
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS hora_fim text,
  ADD COLUMN IF NOT EXISTS dia_inteiro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS local_nome text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS impacto_politico text NOT NULL DEFAULT 'Médio',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Confirmado',
  ADD COLUMN IF NOT EXISTS participantes_liderancas text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secretario_responsavel text,
  ADD COLUMN IF NOT EXISTS convidados text,
  ADD COLUMN IF NOT EXISTS demanda_id uuid REFERENCES public.demandas(id),
  ADD COLUMN IF NOT EXISTS emenda_id uuid REFERENCES public.emendas(id),
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS notificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lembrete_enviado boolean NOT NULL DEFAULT false;

-- Create event notifications log table
CREATE TABLE IF NOT EXISTS public.evento_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL,
  tipo text NOT NULL DEFAULT 'criacao',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evento_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read evento notifications" ON public.evento_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert evento notifications" ON public.evento_notifications FOR INSERT WITH CHECK (true);
