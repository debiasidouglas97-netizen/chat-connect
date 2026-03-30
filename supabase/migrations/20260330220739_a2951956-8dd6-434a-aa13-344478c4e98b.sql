
ALTER TABLE public.cidades DROP CONSTRAINT IF EXISTS cidades_name_key;
ALTER TABLE public.cidades ADD CONSTRAINT cidades_name_tenant_unique UNIQUE (name, tenant_id);
