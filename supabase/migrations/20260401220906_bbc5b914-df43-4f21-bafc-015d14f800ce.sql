
-- Table for mobilization campaigns
CREATE TABLE public.mobilizacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'post',
  link text NOT NULL,
  mensagem text NOT NULL,
  segmentacao_tipo text NOT NULL DEFAULT 'todas',
  segmentacao_valor text[] DEFAULT '{}'::text[],
  total_enviado integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho',
  agendado_para timestamptz,
  criado_por text NOT NULL DEFAULT 'Sistema',
  enviado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mobilizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read mobilizacoes"
  ON public.mobilizacoes FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert mobilizacoes"
  ON public.mobilizacoes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update mobilizacoes"
  ON public.mobilizacoes FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can delete mobilizacoes"
  ON public.mobilizacoes FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Service role access for edge functions
CREATE POLICY "Service can manage mobilizacoes"
  ON public.mobilizacoes FOR ALL TO public
  USING (true) WITH CHECK (true);

-- Table for tracking recipients
CREATE TABLE public.mobilizacao_destinatarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobilizacao_id uuid NOT NULL REFERENCES public.mobilizacoes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  lideranca_name text NOT NULL,
  cidade text,
  chat_id bigint,
  telegram_enviado boolean NOT NULL DEFAULT false,
  enviado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mobilizacao_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read destinatarios"
  ON public.mobilizacao_destinatarios FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert destinatarios"
  ON public.mobilizacao_destinatarios FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Service can manage destinatarios"
  ON public.mobilizacao_destinatarios FOR ALL TO public
  USING (true) WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_mobilizacoes_tenant ON public.mobilizacoes(tenant_id);
CREATE INDEX idx_mobilizacao_dest_mob ON public.mobilizacao_destinatarios(mobilizacao_id);
CREATE INDEX idx_mobilizacao_dest_tenant ON public.mobilizacao_destinatarios(tenant_id);
