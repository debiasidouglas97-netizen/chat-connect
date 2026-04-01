
## Módulo de Engajamento Político — Plano de Implementação

### Fase 1 — Banco de Dados
Criar tabelas:
- **engagement_logs**: tenant_id, leader_id, instagram_username, post_id, comment_id (UNIQUE), tipo_interacao, score, created_at — com índices em tenant_id, post_id, comment_id
- **engagement_sync_config**: tenant_id (UNIQUE), apify_api_key (criptografada via secret), frequencia_sincronizacao (manual/24h/12h/6h), last_sync_at, instagram_handle_deputado
- **engagement_processed_posts**: tenant_id, post_id (UNIQUE por tenant), processed_at — controle de deduplicação
- RLS por tenant_id em todas as tabelas

### Fase 2 — Edge Function `sync-instagram-engagement`
- Recebe tenant_id, busca config do tenant
- Chama Apify para buscar últimos 5 posts do Instagram do deputado
- Deduplicação: ignora post_id e comment_id já processados
- Cruza comentários com `liderancas.instagram` (handle match)
- Calcula score: comentário simples +5, menção ao deputado +10
- Salva engagement_logs e marca posts como processados
- Tratamento de erros com log sem interromper

### Fase 3 — UI Configurações → Integrações
- Nova aba/seção "Integrações" em Configurações
- Campo: Instagram do deputado (handle)
- Campo: Chave API Apify (salva como secret no banco)
- Select: Frequência de sincronização
- Botão "Sincronizar agora"
- Status da última sincronização

### Fase 4 — Exibição nos Cards de Liderança
- Score de engajamento no card da liderança
- Badge com nível (Baixo/Médio/Alto)
- Dialog com histórico de interações

### Fase 5 — Cron Job (opcional)
- Agendar execução automática via pg_cron conforme frequência configurada
