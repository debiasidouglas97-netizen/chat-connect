
CREATE TABLE public.documentos_manuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT NOT NULL,
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL DEFAULT 'Usuário',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_manuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view docs" ON public.documentos_manuais
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant users can insert docs" ON public.documentos_manuais
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant users can delete docs" ON public.documentos_manuais
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT public.get_user_tenant_id(auth.uid())));

INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-manuais', 'documentos-manuais', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload manual docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-manuais');

CREATE POLICY "Anyone can view manual docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos-manuais');

CREATE POLICY "Auth users can delete manual docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-manuais');
