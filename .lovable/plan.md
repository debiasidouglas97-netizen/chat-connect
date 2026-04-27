## Objetivo

Hoje as permissões dos usuários (Deputado, Chefe de Gabinete, Secretário, Liderança) são **fixas em código** (`src/hooks/use-permissions.tsx` + checagens em `ProtectedRoute` e várias páginas). O Deputado/Admin não consegue customizar — por exemplo: "Secretário pode criar/editar liderança mas não excluir" ou "Secretário não vê Agenda".

A proposta é introduzir uma **matriz de permissões por papel (role) configurável**, com CRUD por módulo, gerenciada apenas por Admin (Deputado / Chefe de Gabinete) dentro de **Configurações → Usuários**.

## Como ficará para o usuário

Na aba **Usuários** de Configurações, ao lado do botão "Novo Usuário", aparece um novo botão **"Permissões por Tipo"** (visível apenas para Admin). Ao abrir, surge um diálogo com:

- **Seletor de Tipo de Usuário** (Chefe de Gabinete, Secretário, Liderança).
  - Deputado fica fora (sempre tem tudo) e Super Admin também.
- **Tabela de módulos** com colunas: `Visualizar` · `Criar` · `Editar` · `Excluir`, e linhas por módulo:
  - Dashboard, Demandas, Lideranças, Eleitores, Cidades, Mapa, Emendas, Proposições, Mandato em Foco, Agenda, Documentos, Mensagens, Mobilização Digital, Busca Global, Configurações.
- Cada célula é um checkbox. Marcar/desmarcar `Visualizar` = controla acesso à rota. Os outros 3 viram regras de UI/RLS.
- Botão **"Restaurar padrão"** por papel (volta aos defaults atuais: Admin tudo, Secretário escreve quase tudo, Liderança só lê + cria/edita seus eleitores).
- **Salvar** persiste no banco (escopo por tenant — cada mandato tem sua matriz).

Exemplos suportados:
- Secretário: `Lideranças` → Visualizar ✓, Criar ✓, Editar ✓, Excluir ✗.
- Secretário: `Agenda` → Visualizar ✗ (some do menu lateral e bloqueia rota).
- Liderança: `Eleitores` → Visualizar ✓, Criar ✓, Editar ✓, Excluir ✗ (já é o default).

## Mudanças técnicas

### 1. Banco (nova tabela)

`role_permissions`:
- `id uuid pk`
- `tenant_id uuid` (FK lógica)
- `role app_role` (apenas: `chefe_gabinete`, `secretario`, `lideranca` — Deputado e Super Admin nunca ficam restringidos)
- `module text` (slug fixo: `dashboard`, `demandas`, `liderancas`, `eleitores`, `cidades`, `mapa`, `emendas`, `proposicoes`, `mandato_foco`, `agenda`, `documentos`, `mensagens`, `mobilizacao`, `busca`, `configuracoes`)
- `can_view bool`, `can_create bool`, `can_edit bool`, `can_delete bool`
- `updated_at timestamptz`
- Unique `(tenant_id, role, module)`
- RLS: SELECT permitido para qualquer membro do tenant; INSERT/UPDATE/DELETE só para `deputado`/`chefe_gabinete` do tenant (via `has_role`).

### 2. Camada de defaults

Novo arquivo `src/lib/permissions-defaults.ts` com a matriz default por papel (espelhando hoje o `use-permissions.tsx`). Usado como fallback quando não há linha em `role_permissions` e como base do "Restaurar padrão".

### 3. Hook centralizado

Refatorar `src/hooks/use-permissions.tsx` para:
- Buscar a matriz do tenant via React Query (cacheada).
- Expor:
  - `can(module, action)` (action = `view|create|edit|delete`).
  - Helpers compatíveis com hoje: `canWriteLiderancas`, `canDeleteEleitores`, etc., agora derivados da matriz.
  - `visibleModules` (lista de módulos com `can_view`) para o sidebar.
- Admin (`deputado`/`chefe_gabinete`) sempre retorna `true`.

### 4. Aplicação das permissões

- **`AppSidebar.tsx`**: filtrar itens do menu por `can('<module>', 'view')`.
- **`ProtectedRoute.tsx`**: substituir `LIDERANCA_BLOCKED_PREFIXES` por checagem dinâmica via mapa rota → módulo.
- **Páginas que já consultam `usePermissions()`** (Liderancas, Eleitores, Demandas, Emendas, Cidades, Agenda, Proposicoes, dialogs): trocar flags antigas pelas novas (mantendo nomes como `canWriteLiderancas` para não quebrar — eles passam a ser derivados).
- Botões de criar/editar/excluir continuam aparecendo conforme as flags.

### 5. UI de configuração

Novo componente `src/components/configuracoes/RolePermissionsDialog.tsx`:
- Disparado por botão "Permissões por Tipo" em `UserManagement.tsx`, **apenas se** `usePermissions().isAdmin`.
- Tabs por role (Chefe de Gabinete · Secretário · Liderança).
- Tabela com switch por (módulo, ação). Salvar faz upsert em `role_permissions`.

### 6. Segurança

- Permissões de UI são UX. A camada real continua sendo **RLS no Supabase**. Como hoje as RLS já validam por `role` e `tenant_id`, o controle "excluir liderança" precisa de uma RLS adicional baseada em `role_permissions` para Secretário (DELETE em `liderancas` só se `can_delete=true`). Faremos isso para as tabelas afetadas pelas decisões mais sensíveis: `liderancas`, `eleitores`, `demandas`, `emendas`, `eventos`. Função SQL helper `public.has_permission(_user_id, _module, _action)` (security definer) usada nas policies.

## Escopo de arquivos

- **Migração SQL**: criar tabela `role_permissions`, função `has_permission`, ajustar RLS de `liderancas` / `eleitores` / `demandas` / `emendas` / `eventos` para respeitar `has_permission` em UPDATE/DELETE/INSERT (Admin segue irrestrito).
- **Novo**: `src/lib/permissions-defaults.ts`, `src/components/configuracoes/RolePermissionsDialog.tsx`.
- **Editar**: `src/hooks/use-permissions.tsx`, `src/components/AppSidebar.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/configuracoes/UserManagement.tsx`.
- **Sem mudanças funcionais** nas páginas que já usam `usePermissions()` — apenas validamos que continuam funcionando com as flags derivadas.

## Fora de escopo

- Permissões a nível de campo (apenas a nível de módulo+ação).
- Editar permissões do Deputado / Super Admin (sempre admin pleno).
- Trilha de auditoria das mudanças na matriz (pode entrar em iteração futura via `activity_logs`).
