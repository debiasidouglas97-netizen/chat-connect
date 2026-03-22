-- Create storage bucket for demanda attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('demanda-attachments', 'demanda-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create table for demanda file attachments
CREATE TABLE IF NOT EXISTS public.demanda_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  uploaded_by text NOT NULL DEFAULT 'Sistema',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demanda attachments" ON public.demanda_attachments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert demanda attachments" ON public.demanda_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete demanda attachments" ON public.demanda_attachments FOR DELETE USING (true);

-- Storage RLS policies
CREATE POLICY "Anyone can upload demanda files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'demanda-attachments');
CREATE POLICY "Anyone can read demanda files" ON storage.objects FOR SELECT USING (bucket_id = 'demanda-attachments');
CREATE POLICY "Anyone can delete demanda files" ON storage.objects FOR DELETE USING (bucket_id = 'demanda-attachments');