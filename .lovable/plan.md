

## Plano: Integração Telegram Bot no MandatoGov

### Resumo
Integrar um Telegram Bot ao MandatoGov para comunicação bidirecional com lideranças e equipe. Lideranças enviam demandas pelo Telegram; secretários respondem pelo sistema.

### Pré-requisitos
1. **Ativar Lovable Cloud** (necessário para Edge Functions e banco de dados)
2. **Criar bot no Telegram** via @BotFather (o usuário obtém o token)
3. **Conectar o conector Telegram** no Lovable

### Arquitetura

```text
Liderança (Telegram)          Edge Functions            Frontend (React)
┌──────────────┐             ┌──────────────┐          ┌──────────────┐
│ Envia msg    │──telegram──▶│ telegram-poll│──insert──▶│ Página Chat  │
│ pelo bot     │             │ (getUpdates) │          │ Conversas    │
└──────────────┘             └──────────────┘          └──────────────┘
                             ┌──────────────┐
                             │ telegram-send│◀──invoke──│ Responder    │
                             │ (sendMessage)│──telegram▶│ pelo sistema │
                             └──────────────┘          └──────────────┘
```

### O que será construído

**Fase 1 — Backend (Edge Functions + DB)**

1. **Tabelas no banco**
   - `telegram_bot_state` — controle de offset do polling
   - `telegram_messages` — mensagens recebidas (chat_id, texto, data)
   - `telegram_contacts` — vínculo entre chat_id do Telegram e lideranças do sistema

2. **Edge Function `telegram-poll`**
   - Polling via `getUpdates` com long-poll (loop de 55s, cron a cada 1 min)
   - Armazena mensagens recebidas no banco
   - Detecta novos contatos e cria vínculo

3. **Edge Function `telegram-send`**
   - Recebe destinatário + texto do frontend
   - Envia via gateway `connector-gateway.lovable.dev/telegram/sendMessage`
   - Registra mensagem enviada no banco

**Fase 2 — Frontend (Página de Mensagens)**

4. **Nova página `/mensagens`**
   - Lista de conversas (contatos do Telegram vinculados a lideranças)
   - Visualização de mensagens em formato chat
   - Campo para responder diretamente
   - Badge com contagem de mensagens não lidas

5. **Integração nos módulos existentes**
   - **Lideranças**: botão "Enviar Telegram" no card, abre conversa
   - **Demandas**: botão para notificar liderança vinculada sobre atualização de status
   - **Sidebar**: novo item "Mensagens" com indicador de não lidas

6. **Templates de mensagem rápida**
   - "Sua demanda foi atualizada"
   - "Convite para evento em {cidade}"
   - "Atualização sobre emenda de {cidade}"

**Fase 3 — Automações**

7. **Notificações automáticas**
   - Quando demanda muda de status → notifica liderança pelo Telegram
   - Quando evento é criado para cidade → notifica lideranças da região
   - Motor de engajamento envia alertas configuráveis

### Detalhes técnicos

- Gateway URL: `https://connector-gateway.lovable.dev/telegram`
- Headers: `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $TELEGRAM_API_KEY`
- Polling via pg_cron + pg_net (1 min interval, 55s runtime)
- Realtime do Supabase para atualizar chat em tempo real
- Validação de input com Zod nas Edge Functions
- CORS headers em todas as functions

### Ordem de implementação
1. Ativar Lovable Cloud
2. Conectar Telegram
3. Criar tabelas
4. Edge Functions (poll + send)
5. Página de Mensagens
6. Integração com Lideranças e Demandas
7. Templates e automações

