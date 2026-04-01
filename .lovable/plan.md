
## Módulo Mobilização Digital

### Fase 1 — Banco de Dados
Criar tabelas:
- **mobilizacoes**: id, tenant_id, titulo, tipo (post/video/evento/campanha/outro), link, mensagem, segmentacao_tipo (todas/cidade/tipo_lideranca/manual), segmentacao_valor (text[]), total_enviado, status (rascunho/agendado/enviado), agendado_para, criado_por, enviado_por, created_at, updated_at
- **mobilizacao_destinatarios**: id, mobilizacao_id, tenant_id, lideranca_name, cidade, telegram_enviado (bool), enviado_at
- RLS por tenant_id

### Fase 2 — Frontend
- Adicionar "Mobilização Digital" no menu lateral (ícone Megaphone)
- Criar rota `/mobilizacao`
- Página com listagem de disparos + botão "Nova Mobilização"
- Dialog/formulário de criação com:
  - Campos básicos (título, tipo, link)
  - Segmentação inteligente (todas, por cidade, por tipo, manual)
  - Mensagem com variáveis ({nome_lider}, {cidade}, {link})
  - Opção enviar agora / agendar
- Visualização de detalhes do disparo com destinatários

### Fase 3 — Edge Function
- `mobilizacao-send`: recebe mobilizacao_id, busca destinatários, dispara via Telegram Gateway, atualiza status e contadores

### Fase 4 — Integração
- Hook `use-mobilizacoes` para CRUD
- Conectar formulário ao banco
- Conectar botão "Enviar" à edge function
