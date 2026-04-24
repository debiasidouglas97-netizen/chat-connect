
# Plano: Checkbox opcional para criar acesso ao sistema no cadastro de Liderança

## Objetivo
Tornar a criação de credenciais de acesso ao sistema **opcional** no formulário "Nova Liderança", controlada por um checkbox marcado por padrão.

## Mudanças em `src/components/liderancas/NovaLiderancaDialog.tsx`

### 1. Novo estado
```ts
const [criarAcesso, setCriarAcesso] = useState(true); // marcado por padrão
```

### 2. UI — Checkbox no topo da seção "Acesso ao Sistema"
- Checkbox: **`☑ Criar acesso ao sistema agora`** (default: marcado)
- **Marcado** → mostra os campos E-mail / CPF / Username / Senha / Confirmar Senha como obrigatórios (comportamento atual preservado)
- **Desmarcado** → oculta os campos e exibe mensagem informativa:
  > 💡 *"A liderança ficará cadastrada apenas no CRM. Você pode criar o acesso ao sistema a qualquer momento pelo detalhe da liderança."*

### 3. Botão dinâmico
- Marcado → **"Cadastrar Liderança + Acesso"**
- Desmarcado → **"Cadastrar Liderança"**

### 4. Lógica de `handleSubmit`
- Se `criarAcesso === true`:
  - Valida e-mail, CPF, username, senha (regras atuais)
  - Invoca edge function `create-lideranca-user` (modo `create`) — fluxo atômico atual
- Se `criarAcesso === false`:
  - Pula validações de acesso
  - Faz `INSERT` direto na tabela `liderancas` via supabase client (mesma lógica usada hoje na importação em lote — sem mexer em auth/profiles)

### 5. Reset
- O `reset()` volta `criarAcesso` para `true` ao fechar o diálogo

## O que **não muda**

| Componente | Status |
|---|---|
| Edge function `create-lideranca-user` | Inalterada — continua atômica |
| `LiderancaAccessSection.tsx` | Inalterada — já trata "Sem acesso" + botão "Criar acesso" |
| `UserManagement.tsx` | Inalterada — continua filtrando lideranças |
| Importação em lote | Inalterada — já era sem credenciais |
| Triggers de sync no banco | Inalterados |

## Fluxo final do usuário

| Cenário | Ação |
|---|---|
| Cadastro completo (default) | Checkbox marcado → cria liderança + login num passo só |
| Cadastro rápido (apoiador, registro pendente) | Desmarca o checkbox → só CRM, badge "⚠️ Sem acesso" aparece depois |
| Completar acesso depois | Detalhe da liderança → "Criar acesso ao sistema" (já existe) |
