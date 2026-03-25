
-- Add new columns to emendas table
ALTER TABLE public.emendas
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS objetivo_politico text,
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS regiao text,
  ADD COLUMN IF NOT EXISTS liderancas_relacionadas text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notas text;

-- Create emenda_attachments table
CREATE TABLE public.emenda_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emenda_id uuid NOT NULL REFERENCES public.emendas(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  uploaded_by text NOT NULL DEFAULT 'Sistema',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emenda_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read emenda attachments" ON public.emenda_attachments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert emenda attachments" ON public.emenda_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete emenda attachments" ON public.emenda_attachments FOR DELETE USING (true);

-- Create storage bucket for emenda attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('emenda-attachments', 'emenda-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload emenda attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'emenda-attachments');
CREATE POLICY "Anyone can read emenda attachments storage" ON storage.objects FOR SELECT USING (bucket_id = 'emenda-attachments');
CREATE POLICY "Anyone can delete emenda attachments storage" ON storage.objects FOR DELETE USING (bucket_id = 'emenda-attachments');
