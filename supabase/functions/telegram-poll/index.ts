import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

const STEPS = ['title', 'description', 'city', 'priority', 'confirm'] as const;

const priorityKeywords: Record<string, string> = {
  urgente: 'Urgente', hospital: 'Alta', uti: 'Alta', emergencia: 'Alta', emergência: 'Alta',
  obra: 'Média', pedido: 'Média', solicitação: 'Média', solicitar: 'Média',
};

function detectPriority(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, priority] of Object.entries(priorityKeywords)) {
    if (lower.includes(keyword)) return priority;
  }
  return null;
}

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;
  let currentOffset: number;

  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });
  }

  currentOffset = state.update_offset;

  async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
    const body: any = { chat_id: chatId, text };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY!}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  async function getConversationState(chatId: number) {
    const { data } = await supabase
      .from('telegram_conversation_state')
      .select('*')
      .eq('chat_id', chatId)
      .single();
    return data;
  }

  async function setConversationState(chatId: number, step: string, data: any) {
    await supabase.from('telegram_conversation_state').upsert({
      chat_id: chatId,
      step,
      data,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'chat_id' });
  }

  async function clearConversationState(chatId: number) {
    await supabase.from('telegram_conversation_state').delete().eq('chat_id', chatId);
  }

  async function getLiderancaByChat(chatId: number) {
    const { data: contact } = await supabase
      .from('telegram_contacts')
      .select('lideranca_name')
      .eq('chat_id', chatId)
      .single();

    if (!contact?.lideranca_name) return null;

    const { data: lideranca } = await supabase
      .from('liderancas')
      .select('name, cidade_principal')
      .eq('name', contact.lideranca_name)
      .single();

    return lideranca;
  }

  async function getCidadesForLideranca(liderancaName: string | null) {
    if (!liderancaName) {
      const { data } = await supabase.from('cidades').select('name').limit(10);
      return data?.map(c => c.name) || [];
    }
    // Get the lideranca's main city plus other cities
    const { data: lideranca } = await supabase
      .from('liderancas')
      .select('cidade_principal')
      .eq('name', liderancaName)
      .single();

    const { data: cidades } = await supabase.from('cidades').select('name').limit(10);
    const allCidades = cidades?.map(c => c.name) || [];
    
    if (lideranca?.cidade_principal && !allCidades.includes(lideranca.cidade_principal)) {
      allCidades.unshift(lideranca.cidade_principal);
    }
    return allCidades;
  }

  async function handleMessage(chatId: number, text: string, messageFrom: any) {
    const trimmed = text.trim();

    // Handle /demanda command
    if (trimmed.toLowerCase() === '/demanda') {
      const lideranca = await getLiderancaByChat(chatId);
      await setConversationState(chatId, 'title', {
        lideranca_name: lideranca?.name || messageFrom?.first_name || 'Usuário',
      });
      await sendMessage(chatId, '📝 *Nova Demanda*\n\nQual o título da demanda?');
      return;
    }

    // Handle /cancelar
    if (trimmed.toLowerCase() === '/cancelar') {
      await clearConversationState(chatId);
      await sendMessage(chatId, '❌ Criação de demanda cancelada.');
      return;
    }

    // Check conversation state
    const convState = await getConversationState(chatId);

    if (!convState || convState.step === 'idle') {
      // Check if it looks like a demand
      const detectedPriority = detectPriority(trimmed);
      if (detectedPriority && trimmed.length > 15) {
        await sendMessage(chatId, 
          `💡 Parece que você tem uma demanda!\n\n"${trimmed}"\n\nDeseja transformar isso em uma demanda? Use /demanda para iniciar o cadastro.`
        );
      }
      return;
    }

    const data = convState.data || {};

    switch (convState.step) {
      case 'title': {
        data.title = trimmed;
        await setConversationState(chatId, 'description', data);
        await sendMessage(chatId, '📋 Descreva o problema ou solicitação:');
        break;
      }

      case 'description': {
        data.description = trimmed;
        const liderancaName = data.lideranca_name || null;
        const cidades = await getCidadesForLideranca(liderancaName);
        data.available_cities = cidades;

        await setConversationState(chatId, 'city', data);

        const cityList = cidades.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n');
        await sendMessage(chatId,
          `📍 Em qual cidade?\n\n${cityList}\n\nDigite o número ou o nome da cidade:`
        );
        break;
      }

      case 'city': {
        const cities = data.available_cities || [];
        const num = parseInt(trimmed);
        if (!isNaN(num) && num >= 1 && num <= cities.length) {
          data.city = cities[num - 1];
        } else {
          data.city = trimmed;
        }

        // Auto-detect priority from title+description
        const autoP = detectPriority(`${data.title} ${data.description}`);
        data.suggested_priority = autoP;

        await setConversationState(chatId, 'priority', data);

        const keyboard = {
          inline_keyboard: [
            [
              { text: '🔴 Alta', callback_data: 'priority_Alta' },
              { text: '🟡 Média', callback_data: 'priority_Média' },
              { text: '🟢 Baixa', callback_data: 'priority_Baixa' },
            ],
          ],
        };

        let msg = '📊 Qual a prioridade?';
        if (autoP) msg += `\n\n💡 Sugestão automática: *${autoP}*`;
        msg += '\n\nDigite Alta, Média ou Baixa:';

        await sendMessage(chatId, msg, keyboard);
        break;
      }

      case 'priority': {
        const validPriorities = ['Alta', 'Média', 'Baixa', 'Urgente'];
        let priority = trimmed;
        
        // Handle callback data format
        if (priority.startsWith('priority_')) {
          priority = priority.replace('priority_', '');
        }
        
        // Normalize
        const normalized = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
        if (!validPriorities.includes(normalized)) {
          await sendMessage(chatId, '⚠️ Prioridade inválida. Digite: Alta, Média ou Baixa');
          return;
        }

        data.priority = normalized;
        await setConversationState(chatId, 'confirm', data);

        await sendMessage(chatId,
          `📋 *Confirme sua demanda:*\n\n📌 Título: ${data.title}\n📝 Descrição: ${data.description}\n📍 Cidade: ${data.city}\n📊 Prioridade: ${data.priority}\n\nDigite *sim* para confirmar ou *não* para cancelar.`
        );
        break;
      }

      case 'confirm': {
        const lower = trimmed.toLowerCase();
        if (lower === 'sim' || lower === 's' || lower === 'yes') {
          // Create the demanda
          const { data: newDemanda, error } = await supabase.from('demandas').insert({
            title: data.title,
            description: data.description,
            city: data.city,
            priority: data.priority,
            col: 'nova',
            origin: 'telegram',
            creator_chat_id: chatId,
            creator_name: data.lideranca_name || 'Via Telegram',
            responsible: data.lideranca_name || null,
          } as any).select().single();

          if (error) {
            console.error('Failed to create demanda:', error);
            await sendMessage(chatId, '❌ Erro ao criar demanda. Tente novamente.');
          } else {
            // Add history
            await supabase.from('demanda_history').insert({
              demanda_id: newDemanda.id,
              action: 'Demanda criada via Telegram',
              actor: data.lideranca_name || 'Via Telegram',
              new_status: 'nova',
            } as any);

            await sendMessage(chatId,
              `✅ Sua demanda foi registrada com sucesso!\n\n📌 Título: ${data.title}\n📍 Cidade: ${data.city}\n📊 Prioridade: ${data.priority}\n\nNossa equipe irá analisar em breve.`
            );
          }

          await clearConversationState(chatId);
        } else if (lower === 'não' || lower === 'nao' || lower === 'n' || lower === 'no') {
          await clearConversationState(chatId);
          await sendMessage(chatId, '❌ Demanda cancelada. Use /demanda para criar uma nova.');
        } else {
          await sendMessage(chatId, 'Digite *sim* para confirmar ou *não* para cancelar.');
        }
        break;
      }
    }
  }

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;

    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Store messages
    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        direction: 'incoming',
        text: u.message.text ?? null,
        raw_update: u,
      }));

    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from('telegram_messages')
        .upsert(rows, { onConflict: 'update_id' });

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
      }

      // Auto-create contacts for new chat_ids and auto-link to liderancas
      const uniqueChats = new Map<number, any>();
      for (const u of updates) {
        if (u.message?.chat) {
          const chat = u.message.chat;
          if (!uniqueChats.has(chat.id)) {
            uniqueChats.set(chat.id, {
              chat_id: chat.id,
              first_name: chat.first_name ?? null,
              last_name: chat.last_name ?? null,
              username: chat.username ?? null,
            });
          }
        }
      }

      if (uniqueChats.size > 0) {
        for (const contact of uniqueChats.values()) {
          const { data: existing } = await supabase
            .from('telegram_contacts')
            .select('id, lideranca_name')
            .eq('chat_id', contact.chat_id)
            .single();

          if (existing) {
            if (!existing.lideranca_name && contact.username) {
              const linkedName = await tryLinkLideranca(supabase, contact.username);
              if (linkedName) {
                await supabase
                  .from('telegram_contacts')
                  .update({ lideranca_name: linkedName, first_name: contact.first_name, last_name: contact.last_name, username: contact.username })
                  .eq('chat_id', contact.chat_id);
              }
            }
          } else {
            let liderancaName: string | null = null;
            if (contact.username) {
              liderancaName = await tryLinkLideranca(supabase, contact.username);
            }

            await supabase
              .from('telegram_contacts')
              .insert({ ...contact, lideranca_name: liderancaName });

            try {
              const welcomeText = liderancaName
                ? `✅ Olá, ${liderancaName}! Sua conversa com o gabinete foi ativada.\n\nUse /demanda para criar uma nova demanda.`
                : `✅ Conversa ativada!\n\nUse /demanda para criar uma nova demanda.`;

              await sendMessage(contact.chat_id, welcomeText);
            } catch (e) {
              console.error('Failed to send welcome message:', e);
            }
          }
        }
      }

      // Process messages for /demanda flow
      for (const u of updates) {
        if (u.message?.text) {
          try {
            await handleMessage(u.message.chat.id, u.message.text, u.message.from);
          } catch (e) {
            console.error('Error handling message:', e);
          }
        }
        // Handle callback queries (inline keyboard buttons)
        if (u.callback_query) {
          try {
            const chatId = u.callback_query.message.chat.id;
            const callbackData = u.callback_query.data;
            await handleMessage(chatId, callbackData, u.callback_query.from);
          } catch (e) {
            console.error('Error handling callback:', e);
          }
        }
      }

      totalProcessed += rows.length;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;

    const { error: offsetErr } = await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (offsetErr) {
      return new Response(JSON.stringify({ error: offsetErr.message }), { status: 500 });
    }

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }));
});

async function tryLinkLideranca(supabase: any, username: string): Promise<string | null> {
  const normalizedUsername = username.replace(/^@/, '').toLowerCase().trim();
  if (!normalizedUsername) return null;

  const { data: liderancas } = await supabase
    .from('liderancas')
    .select('name, telegram_username')
    .not('telegram_username', 'is', null);

  if (!liderancas) return null;

  for (const l of liderancas) {
    const lUsername = (l.telegram_username ?? '').replace(/^@/, '').toLowerCase().trim();
    if (lUsername === normalizedUsername) {
      return l.name;
    }
  }

  return null;
}
