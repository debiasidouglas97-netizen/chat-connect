-- Tabela de Eleitores cadastrados no mandato
CREATE TABLE IF NOT EXISTS public.eleitores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  cidade TEXT NOT NULL,
  telegram TEXT,
  email TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  estado TEXT,
  lideranca_id UUID REFERENCES public.liderancas(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eleitores_tenant ON public.eleitores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_lideranca ON public.eleitores(lideranca_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_cidade ON public.eleitores(tenant_id, cidade);
CREATE INDEX IF NOT EXISTS idx_eleitores_whatsapp ON public.eleitores(tenant_id, whatsapp);

ALTER TABLE public.eleitores ENABLE ROW LEVEL SECURITY;

-- Tenant members podem ler todos os eleitores do tenant
CREATE POLICY "Tenant users can read eleitores"
ON public.eleitores
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert eleitores"
ON public.eleitores
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update eleitores"
ON public.eleitores
FOR UPDATE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can delete eleitores"
ON public.eleitores
FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_eleitores_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eleitores_updated_at ON public.eleitores;
CREATE TRIGGER trg_eleitores_updated_at
BEFORE UPDATE ON public.eleitores
FOR EACH ROW EXECUTE FUNCTION public.tg_eleitores_updated_at();

-- Log no activity_logs ao criar eleitor
CREATE OR REPLACE FUNCTION public.log_eleitor_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id, tipo_evento, entidade, entidade_id, descricao_bruta, prioridade)
  VALUES (NEW.tenant_id, 'eleitor_cadastrado', 'eleitor', NEW.id,
    'Novo eleitor cadastrado: ' || NEW.nome || ' em ' || NEW.cidade,
    'informativo');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_eleitor_created ON public.eleitores;
CREATE TRIGGER trg_log_eleitor_created
AFTER INSERT ON public.eleitores
FOR EACH ROW EXECUTE FUNCTION public.log_eleitor_created();