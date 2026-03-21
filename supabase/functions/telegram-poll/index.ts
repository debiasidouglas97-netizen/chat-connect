import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

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
        allowed_updates: ['message'],
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
          // Check if contact already exists
          const { data: existing } = await supabase
            .from('telegram_contacts')
            .select('id, lideranca_name')
            .eq('chat_id', contact.chat_id)
            .single();

          if (existing) {
            // Update names if changed, and try to link if not linked yet
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
            // New contact — try to link to lideranca
            let liderancaName: string | null = null;
            if (contact.username) {
              liderancaName = await tryLinkLideranca(supabase, contact.username);
            }

            await supabase
              .from('telegram_contacts')
              .insert({ ...contact, lideranca_name: liderancaName });

            // Send welcome message for new contacts
            try {
              const welcomeText = liderancaName
                ? `✅ Olá, ${liderancaName}! Sua conversa com o gabinete foi ativada. Você pode enviar mensagens por aqui.`
                : `✅ Conversa ativada! O gabinete já pode se comunicar com você por aqui.`;

              await fetch(`${GATEWAY_URL}/sendMessage`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'X-Connection-Api-Key': TELEGRAM_API_KEY,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  chat_id: contact.chat_id,
                  text: welcomeText,
                }),
              });
            } catch (e) {
              console.error('Failed to send welcome message:', e);
            }
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
