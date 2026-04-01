
-- Tabela de configuração de sync por tenant
CREATE TABLE public.engagement_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instagram_handle text NOT NULL DEFAULT '',
  apify_api_key text NOT NULL DEFAULT '',
  frequencia_sincronizacao text NOT NULL DEFAULT '24h',
  last_sync_at timestamptz,
  last_sync_status text DEFAULT 'nunca',
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.engagement_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read own config"
  ON public.engagement_sync_config FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert own config"
  ON public.engagement_sync_config FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update own config"
  ON public.engagement_sync_config FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Service can manage config"
  ON public.engagement_sync_config FOR ALL TO public
  USING (true) WITH CHECK (true);

-- Tabela de posts já processados (deduplicação)
CREATE TABLE public.engagement_processed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  post_id text NOT NULL,
  post_url text,
  post_caption text,
  post_timestamp timestamptz,
  comments_count integer DEFAULT 0,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, post_id)
);

ALTER TABLE public.engagement_processed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read processed posts"
  ON public.engagement_processed_posts FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Service can manage processed posts"
  ON public.engagement_processed_posts FOR ALL TO public
  USING (true) WITH CHECK (true);

CREATE INDEX idx_processed_posts_tenant ON public.engagement_processed_posts(tenant_id);
CREATE INDEX idx_processed_posts_post_id ON public.engagement_processed_posts(post_id);

-- Tabela de logs de engajamento
CREATE TABLE public.engagement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  leader_id uuid REFERENCES public.liderancas(id) ON DELETE SET NULL,
  instagram_username text NOT NULL,
  post_id text NOT NULL,
  comment_id text NOT NULL,
  comment_text text,
  tipo_interacao text NOT NULL DEFAULT 'comentario',
  score integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, comment_id)
);

ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read engagement logs"
  ON public.engagement_logs FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Service can manage engagement logs"
  ON public.engagement_logs FOR ALL TO public
  USING (true) WITH CHECK (true);

CREATE INDEX idx_engagement_logs_tenant ON public.engagement_logs(tenant_id);
CREATE INDEX idx_engagement_logs_leader ON public.engagement_logs(leader_id);
CREATE INDEX idx_engagement_logs_post ON public.engagement_logs(post_id);
CREATE INDEX idx_engagement_logs_comment ON public.engagement_logs(comment_id);
