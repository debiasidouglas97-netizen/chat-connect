## Integração com OSM NxTV (https://osm.2dwtecnologia.com.br)

Sincronizar cadastro/edição/exclusão de Eleitores com a API externa OSM, registrando cada eleitor como "assinante" com plano SEAC.

### 1. Configuração e segurança

- Salvar dois secrets no backend (Lovable Cloud):
  - `OSM_API_KEY` → `94fc7fb38ba591b2b945fcf58a5f45b8` (chave Bearer)
  - `OSM_BASE_URL` → `https://osm.2dwtecnologia.com.br`
- A chave **nunca** será exposta no frontend — toda comunicação passa por edge function.

### 2. Mudanças no banco (migration)

Adicionar à tabela `eleitores` colunas para rastrear o vínculo externo:

- `osm_subscriber_id` (integer, nullable) — ID retornado pela OSM
- `osm_sync_status` (text, default `'pending'`) — `pending` | `synced` | `error`
- `osm_sync_error` (text, nullable) — última mensagem de erro
- `osm_synced_at` (timestamptz, nullable)

### 3. Nova edge function: `osm-subscriber-sync`

Função única que recebe uma ação e despacha para a OSM. Body:

```json
{ "action": "create" | "update" | "delete", "eleitor_id": "uuid" }
```

Comportamento:

- Lê o eleitor do banco (com tenant isolation via service role + checagem do JWT do chamador).
- Resolve `plan_id` do SEAC dinamicamente uma vez por execução: `GET /api/provider/plans` → escolhe o item cujo `name` contém "SEAC" (case-insensitive). Cacheia em memória do processo.
- `create` → `POST /api/provider/subscribers` com `{ name, email, cpf, phone (whatsapp), password, plan_id }`. Grava `osm_subscriber_id` e marca `synced`.
- `update` → se já existe `osm_subscriber_id`, `PUT /api/provider/subscribers/{id}` com os campos alterados. Se não existe, faz `create`.
- `delete` → `DELETE /api/provider/subscribers/{id}` (exclusão lógica na OSM).
- Em qualquer falha: grava `osm_sync_status='error'` + `osm_sync_error=<msg>` e devolve 502 com detalhe. O cadastro local **não é desfeito**.

### 4. Integração no frontend (`useEleitores`)

Após cada mutação local bem-sucedida, dispara `supabase.functions.invoke('osm-subscriber-sync', { body: { action, eleitor_id } })` em paralelo:

- `insert` → invoca após receber o id do novo eleitor.
- `update` → invoca após o update local.
- `remove` → invoca **antes** do delete local quando há `osm_subscriber_id` (para garantir baixa do lado externo); se falhar, mostra toast de aviso mas segue com a exclusão local.

Toasts:
- Sucesso normal: "Eleitor salvo".
- Sucesso parcial (OSM falhou): "Eleitor salvo, mas houve erro ao sincronizar com OSM NxTV" + toast com mensagem.

### 5. UI mínima de status

Na tabela de Eleitores (`src/pages/Eleitores.tsx`), adicionar um ícone discreto na coluna "Contatos" indicando estado da sincronização OSM:

- `synced` → check verde (tooltip: "Sincronizado com OSM NxTV — ID #1234")
- `error` → triângulo amarelo (tooltip com mensagem de erro + botão "Reenviar" que chama a edge function com `action: 'create'` ou `'update'`)
- `pending` → spinner cinza

### 6. Decisões assumidas (avise se quiser mudar)

- **Plano SEAC**: resolvido dinamicamente pelo nome via `/api/provider/plans` (mais robusto a mudanças de ID).
- **URL base**: `https://osm.2dwtecnologia.com.br` (conforme link enviado).
- **Falha de sync**: opera local mesmo se OSM falhar, marca como `error` e permite reenvio manual (evita travar o cadastro do gabinete por instabilidade externa).
- **Senha**: usa o campo `senha` já existente em `custom_field_values`; se vazio, deixa a OSM gerar automaticamente.
- **Telefone**: enviado o `whatsapp` do eleitor como `phone`.

### Detalhes técnicos

- Edge function configurada com `verify_jwt = true` para garantir que só usuários autenticados disparem syncs.
- Validação Zod no body da função.
- CORS via `npm:@supabase/supabase-js@2/cors`.
- Rate limit da OSM (60 req/min) é confortável para fluxo manual de cadastro.
