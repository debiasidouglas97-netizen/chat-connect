
-- Lideranças table
CREATE TABLE public.liderancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  img text NOT NULL,
  avatar_url text,
  cidade_principal text NOT NULL,
  cargo text NOT NULL,
  influencia text NOT NULL DEFAULT 'Média',
  tipo text NOT NULL DEFAULT 'Comunitária',
  engajamento integer NOT NULL DEFAULT 50,
  atuacao jsonb NOT NULL DEFAULT '[]'::jsonb,
  phone text,
  whatsapp text,
  email text,
  telegram_username text,
  instagram text,
  facebook text,
  youtube text,
  address_cep text,
  address_street text,
  address_number text,
  address_neighborhood text,
  address_city text,
  address_state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.liderancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read liderancas" ON public.liderancas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert liderancas" ON public.liderancas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update liderancas" ON public.liderancas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete liderancas" ON public.liderancas FOR DELETE USING (true);

-- Demandas table
CREATE TABLE public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  col text NOT NULL DEFAULT 'nova',
  title text NOT NULL,
  city text NOT NULL,
  priority text NOT NULL DEFAULT 'Média',
  responsible text,
  attachments integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demandas" ON public.demandas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert demandas" ON public.demandas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update demandas" ON public.demandas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete demandas" ON public.demandas FOR DELETE USING (true);

-- Cidades table
CREATE TABLE public.cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  population text NOT NULL,
  peso integer NOT NULL DEFAULT 5,
  regiao text NOT NULL,
  demandas integer NOT NULL DEFAULT 0,
  demandas_resolvidas integer NOT NULL DEFAULT 0,
  comunicacao_recente boolean NOT NULL DEFAULT false,
  presenca_deputado boolean NOT NULL DEFAULT false,
  engajamento integer NOT NULL DEFAULT 0,
  liderancas integer NOT NULL DEFAULT 0,
  emendas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cidades" ON public.cidades FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cidades" ON public.cidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cidades" ON public.cidades FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cidades" ON public.cidades FOR DELETE USING (true);

-- Emendas table
CREATE TABLE public.emendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade text NOT NULL,
  valor text NOT NULL,
  status text NOT NULL DEFAULT 'Proposta',
  tipo text NOT NULL,
  ano integer NOT NULL DEFAULT 2025,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read emendas" ON public.emendas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert emendas" ON public.emendas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update emendas" ON public.emendas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete emendas" ON public.emendas FOR DELETE USING (true);

-- Eventos/Agenda table
CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data text NOT NULL,
  hora text NOT NULL,
  titulo text NOT NULL,
  cidade text NOT NULL,
  tipo text NOT NULL DEFAULT 'Reunião',
  liderancas integer NOT NULL DEFAULT 0,
  demandas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read eventos" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert eventos" ON public.eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update eventos" ON public.eventos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete eventos" ON public.eventos FOR DELETE USING (true);
