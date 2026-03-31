
-- Tabela principal de proposições
CREATE TABLE public.proposicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  camara_id bigint NOT NULL,
  tipo text NOT NULL,
  numero integer NOT NULL,
  ano integer NOT NULL,
  ementa text,
  status_proposicao text DEFAULT 'Apresentada',
  tema text,
  autor text,
  url_inteiro_teor text,
  ultima_atualizacao timestamp with time zone,
  adicionado_kanban boolean DEFAULT false,
  demanda_id uuid REFERENCES public.demandas(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, camara_id)
);

ALTER TABLE public.proposicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read proposicoes" ON public.proposicoes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant users can insert proposicoes" ON public.proposicoes FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant users can update proposicoes" ON public.proposicoes FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant users can delete proposicoes" ON public.proposicoes FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Public read proposicoes" ON public.proposicoes FOR SELECT TO public USING (true);
CREATE POLICY "Public insert proposicoes" ON public.proposicoes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update proposicoes" ON public.proposicoes FOR UPDATE TO public USING (true);

-- Tabela de tramitações
CREATE TABLE public.proposicao_tramitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposicao_id uuid REFERENCES public.proposicoes(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  data_hora timestamp with time zone,
  sequencia integer,
  sigla_orgao text,
  descricao_tramitacao text,
  despacho text,
  situacao text,
  url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposicao_tramitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read tramitacoes" ON public.proposicao_tramitacoes FOR SELECT TO public USING (true);
CREATE POLICY "Insert tramitacoes" ON public.proposicao_tramitacoes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Update tramitacoes" ON public.proposicao_tramitacoes FOR UPDATE TO public USING (true);
CREATE POLICY "Delete tramitacoes" ON public.proposicao_tramitacoes FOR DELETE TO public USING (true);

-- Enable realtime for proposicoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposicoes;
