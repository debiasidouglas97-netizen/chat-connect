

## Próximo Passo: Agendar o Cron Job do Polling

### Situação Atual
Tudo está implementado — tabelas, edge functions, página de mensagens, conector Telegram conectado. Porém, o **cron job que dispara o polling a cada minuto ainda não foi criado**. Sem ele, a função `telegram-poll` nunca é chamada automaticamente e as mensagens do Telegram não chegam ao sistema.

### O que será feito

**1. Criar o agendamento pg_cron**
- Executar SQL via insert query (não migration, pois contém dados específicos do projeto) para agendar `cron.schedule` que chama `telegram-poll` a cada minuto via `pg_net.http_post`
- Usa a URL do projeto e a anon key já configuradas

**2. Testar o fluxo completo**
- Verificar que o cron está registrado
- Enviar mensagem ao bot no Telegram e confirmar que aparece na página `/mensagens`
- Responder pelo sistema e confirmar entrega no Telegram

### Detalhe técnico
O cron job usará `net.http_post` para invocar `https://oaoqfbjstqdbvdnykszv.supabase.co/functions/v1/telegram-poll` com o anon key no header Authorization.

