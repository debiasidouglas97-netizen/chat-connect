
-- Add unique constraint for proposicoes upsert
ALTER TABLE public.proposicoes
  ADD CONSTRAINT proposicoes_tenant_camara_unique UNIQUE (tenant_id, camara_id);

-- Add unique constraint for tramitacoes upsert  
ALTER TABLE public.proposicao_tramitacoes
  ADD CONSTRAINT tramitacoes_prop_seq_unique UNIQUE (proposicao_id, sequencia);
