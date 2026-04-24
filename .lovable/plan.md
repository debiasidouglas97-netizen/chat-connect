## 🎯 Objetivo

Eliminar a duplicidade entre cadastro de Liderança (CRM) e Usuário do Sistema. A liderança vira a **fonte única**: ao cadastrá-la, o sistema provisiona automaticamente um usuário `role='lideranca'` com acesso ao dashboard restrito. Configurações → Usuários passa a gerenciar **somente** Deputado / Chefe de Gabinete / Secretário.

---

## Fase 1 — Edge Function `create-lideranca-user` (nova)

Criar `supabase/functions/create-lideranca-user/index.ts` com `service_role`:

**Input:** dados completos da liderança + `{ email, cpf, username, password }`

**Fluxo atômico:**
1. Validar input com Zod (e-mail válido, CPF 11 dígitos, username regex `^[a-zA-Z0-9_.]+$`, senha ≥ 8 chars)
2. Validar JWT do chamador e confirmar que é admin (`deputado`/`chefe_gabinete`)
3. Pré-checar unicidade no tenant: `email`/`cpf`/`username` em `profiles`
4. `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })` — **auto-confirma** conforme decidido
5. `INSERT` em `liderancas` com `tenant_id`
6. `UPDATE` em `profiles` (criado pelo trigger `handle_new_user`) setando: `tenant_id`, `cpf`, `username`, `whatsapp`, `telegram_username`, `role='lideranca'`, `lideranca_id`, `avatar_url`, `cities=[cidade_principal]`
7. `INSERT` em `user_roles` com `role='lideranca'`
8. **Rollback:** se qualquer passo após o `createUser` falhar → `auth.admin.deleteUser` para não deixar conta órfã

**Retorno:** `{ liderancaId, userId, success: true }` ou `{ error, code }`

## Fase 2 — Atualizar `NovaLiderancaDialog.tsx`

Adicionar nova seção **"Acesso ao Sistema"** (obrigatória) entre os campos básicos e contatos:

| Campo | Validação |
|---|---|
| E-mail* | obrigatório, formato válido |
| CPF* | obrigatório, máscara `000.000.000-00`, 11 dígitos |
| Username* | obrigatório, regex `[a-zA-Z0-9_.]+`, mínimo 3 chars |
| Senha* | obrigatória, mínimo 8 chars + indicador visual de força |
| Confirmar Senha* | deve coincidir |

- O campo "Email" original (na seção Contatos) é removido — fica só o de acesso
- Submit deixa de chamar `useLiderancas.insert` direto e passa a invocar a edge function `create-lideranca-user`
- Toast de sucesso: *"Liderança cadastrada e acesso ao sistema criado!"*
- Tratamento de erros específicos: e-mail/CPF/username duplicado → toast claro

## Fase 3 — Reorganizar `UserManagement.tsx`

- **Filtrar listagem**: `.neq("role", "lideranca")` na query (mostrar só deputado/chefe_gabinete/secretario)
- **Diálogo "Novo Usuário":**
  - Remover `lideranca` do select de roles (deixar só Deputado / Chefe de Gabinete / Secretário)
  - Remover o combobox "Vincular a uma Liderança existente" e todo o estado `linkedLideranca`
  - Default do role passa a ser `secretario`
- **Banner informativo** no topo: *"💡 Lideranças são cadastradas automaticamente como usuários do sistema. Use a aba Lideranças para criar."*

## Fase 4 — Gestão de senha das lideranças

No `LiderancaDetailDialog.tsx` adicionar (visível apenas para admins):

- Linha mostrando: **Username:** `xxx` • **E-mail:** `xxx@...`
- Botão **"Resetar senha"** → abre mini-dialog com nova senha + confirmar
- Botão **"Desativar acesso"** → marca `profiles.is_active = false` (mantém o cadastro CRM, bloqueia login)

Edge function `reset-lideranca-password`:
- Valida JWT admin
- Recebe `{ liderancaId, newPassword }`
- Busca `profile.id` via `lideranca_id`
- `auth.admin.updateUserById(userId, { password: newPassword })`

## Fase 5 — Migração manual das 319 lideranças (decidido: uma a uma)

Em cada card/detalhe de liderança **sem usuário vinculado**, exibir badge amarelo **"⚠ Sem acesso ao sistema"** e botão **"Criar acesso"** que abre mini-formulário com E-mail / Username / Senha (CPF se ainda não tiver). Reaproveita a mesma edge function `create-lideranca-user` em modo "vincular existente" — isto é, faz o `auth.createUser` + UPDATE no profile, mas **não** insere em `liderancas` (usa o id já existente).

Sinalizador visual no card de Lideranças (aba principal): contador "X de 319 lideranças sem acesso ao sistema cadastrado".

## Fase 6 — Importação em lote (decidido: pendente de credenciais)

Ajustar fluxo de import em massa:
- Manter o cadastro de liderança normalmente (sem usuário vinculado)
- Cada uma fica com o badge "⚠ Sem acesso" e o gabinete completa depois usando o fluxo da Fase 5
- Mensagem ao final do import: *"X lideranças importadas. Acesse o card de cada uma para criar o login no sistema."*

## Fase 7 — Sincronização Liderança ↔ Profile

Trigger no banco `sync_lideranca_to_profile` (AFTER UPDATE em `liderancas`):
- Se `name`/`avatar_url`/`whatsapp`/`telegram_username` mudarem → atualizar `profiles` correspondente (via `lideranca_id`)
- Mantém os dois sempre coerentes

Trigger `cleanup_lideranca_user` (AFTER DELETE em `liderancas`):
- Marca o profile como `is_active=false` (não deleta auth user, segue política de retenção)

## Fase 8 — Atualizações nos componentes existentes

- `useLiderancas.tsx`: o método `insert` é substituído pela invocação da edge function; o método `remove` mostra confirmação extra avisando que o acesso ao sistema também será desativado
- `NovaLiderancaDialog`: novos campos passam pelo `onAdd`
- `LiderancaDetailDialog`: nova aba "Acesso" para admins

## ✅ Resultado final

| Antes | Depois |
|---|---|
| Cadastra liderança no CRM + cria usuário separado + vincula manualmente | Cadastra a liderança **uma vez** com e-mail/senha → acesso pronto |
| Configurações → Usuários: 4 lideranças + 1 deputado misturados | Configurações → Usuários: só gabinete (deputado/chefe/secretário) |
| Risco de esquecer de vincular `lideranca_id` → perfil quebrado | Vínculo automático e atômico via edge function |
| Tela "Liderança" só mostra dados do CRM | Mostra também: username, status do acesso, botões de reset/desativar |

**Pode aprovar para eu implementar?** 🚀