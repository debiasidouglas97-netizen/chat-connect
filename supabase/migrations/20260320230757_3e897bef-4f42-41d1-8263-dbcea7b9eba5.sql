
CREATE TYPE public.note_tag AS ENUM ('relacionamento', 'politico', 'conflito', 'apoio', 'alerta', 'estrategico');

CREATE TABLE public.leadership_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lideranca_name text NOT NULL,
  text text NOT NULL,
  tag note_tag,
  author text NOT NULL DEFAULT 'Gabinete',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leadership_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notes" ON public.leadership_notes FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert notes" ON public.leadership_notes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update notes" ON public.leadership_notes FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete notes" ON public.leadership_notes FOR DELETE TO public USING (true);
