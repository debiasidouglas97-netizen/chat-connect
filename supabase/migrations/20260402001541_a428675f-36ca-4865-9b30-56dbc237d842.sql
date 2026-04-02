ALTER TABLE public.engagement_processed_posts 
ADD CONSTRAINT engagement_processed_posts_tenant_post_unique UNIQUE (tenant_id, post_id);