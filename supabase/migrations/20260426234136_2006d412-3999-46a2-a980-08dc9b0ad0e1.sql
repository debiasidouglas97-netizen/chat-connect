-- 1. Tabela de configuração de formulários por tenant e segmento
CREATE TABLE public.tenant_form_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  segment text NOT NULL CHECK (segment IN ('liderancas', 'eleitores', 'usuarios')),
  native_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, segment)
);

ALTER TABLE public.tenant_form_config ENABLE ROW LEVEL SECURITY;

-- Admins (deputado, chefe_gabinete) do tenant: leitura/escrita total
CREATE POLICY "Admins manage own tenant form config"
  ON public.tenant_form_config
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'deputado'::app_role)
      OR public.has_role(auth.uid(), 'chefe_gabinete'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'deputado'::app_role)
      OR public.has_role(auth.uid(), 'chefe_gabinete'::app_role)
    )
  );

-- Demais usuários do tenant (secretário, liderança): apenas leitura
CREATE POLICY "Tenant members read form config"
  ON public.tenant_form_config
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_tenant_form_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tenant_form_config_updated_at
BEFORE UPDATE ON public.tenant_form_config
FOR EACH ROW EXECUTE FUNCTION public.tg_tenant_form_config_updated_at();

-- 2. Coluna para valores de campos personalizados em lideranças
ALTER TABLE public.liderancas
  ADD COLUMN IF NOT EXISTS custom_field_values jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tenant_form_config_tenant_segment
  ON public.tenant_form_config (tenant_id, segment);