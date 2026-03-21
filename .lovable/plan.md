
Objetivo

Corrigir o fluxo de ativação do Telegram para que, após a liderança enviar `/start`, a conversa saia de “Pendente”, apareça como contato ativo na aba Mensagens e o bot dê um retorno no próprio Telegram.

Diagnóstico atual

- O backend já recebeu suas mensagens: no banco existem `/start` e `Oi` salvos para o chat do Douglas.
- O polling automático do bot está funcionando e criou o contato `douglasbiasi`.
- O username do contato recebido bate com a liderança cadastrada (`@douglasbiasi`).
- Então o problema não é o Telegram “não chegar”; o problema está no sincronismo e na experiência:
  1. a tela de Mensagens carrega os contatos só uma vez ao abrir a página;
  2. ela não escuta novos `telegram_contacts` em tempo real;
  3. o contato selecionado pode continuar preso no estado “pending” mesmo depois de já existir um contato ativo;
  4. o bot hoje não responde ao `/start`, então no Telegram parece que “nada aconteceu”.

Plano de implementação

1. Corrigir a ativação no backend
- Atualizar a lógica do `telegram-poll` para, ao receber a primeira mensagem de um chat, tentar vincular automaticamente o contato à liderança pelo `telegram_username`.
- Preencher `lideranca_name` em `telegram_contacts` quando houver correspondência.
- Normalizar comparação de usernames (`@`, maiúsculas/minúsculas, espaços) para evitar falso “pendente”.

2. Fazer a aba Mensagens reagir imediatamente
- Adicionar atualização em tempo real para `telegram_contacts`, não só para `telegram_messages`.
- Recarregar ou atualizar a lista quando um novo contato chegar pelo bot.
- Reconciliar o `selectedContact`: se o item estava como `lideranca_pending` e virar contato Telegram ativo, a tela deve trocar automaticamente para o estado ativo sem exigir refresh manual.

3. Melhorar a fusão entre liderança e contato Telegram
- Centralizar uma função de normalização de username no frontend.
- Usar essa mesma regra para montar a lista mesclada e evitar que um contato já ativado continue aparecendo como pendente.
- Exibir o nome da liderança já vinculada no contato ativo para deixar claro “quem é quem”.

4. Dar feedback no próprio Telegram
- Fazer o bot responder ao `/start` com uma mensagem curta de confirmação, por exemplo informando que a conversa foi ativada e que o gabinete já pode responder por ali.
- Enviar essa confirmação apenas na ativação inicial, para não repetir em toda mensagem.

5. Validar ponta a ponta
- Testar com o caso do Douglas:
  - enviar `/start`;
  - confirmar resposta automática no Telegram;
  - confirmar que o status sai de “Pendente” para ativo na aba Mensagens sem recarregar;
  - confirmar que o histórico mostra `/start` e demais mensagens;
  - confirmar que o envio do gabinete funciona depois da ativação.

Detalhes técnicos

- Arquivos principais: `supabase/functions/telegram-poll/index.ts` e `src/pages/Mensagens.tsx`.
- Se necessário, posso complementar com uma pequena migração para apoiar melhor o vínculo automático entre `telegram_contacts` e `liderancas`, mas a maior parte do problema parece estar na lógica de sincronismo e não na estrutura do banco.
- Evidência já confirmada: o contato e as mensagens existem no backend; portanto a correção deve focar em vínculo, resposta automática e atualização da UI.
