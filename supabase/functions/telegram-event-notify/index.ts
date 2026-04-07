import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { evento_id, action } = await req.json();

    if (!evento_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing evento_id or action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the evento
    const { data: evento, error: eventoErr } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', evento_id)
      .single();

    if (eventoErr || !evento) {
      return new Response(JSON.stringify({ error: 'Evento not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format date BR
    let dataBR = evento.data;
    try {
      const [y, m, d] = evento.data.split('-');
      dataBR = `${d}/${m}/${y}`;
    } catch {}

    // Build message based on action
    let text = '';
    if (action === 'criacao') {
      text = `📢 *Nova agenda do deputado*\n\n📍 Cidade: ${evento.cidade}\n📅 Data: ${dataBR}\n🕒 Horário: ${evento.dia_inteiro ? 'Dia inteiro' : evento.hora}\n📌 Evento: ${evento.titulo}${evento.local_nome ? `\n📍 Local: ${evento.local_nome}` : ''}${evento.description ? `\n\n${evento.description}` : ''}\n\nSua presença é importante.`;
    } else if (action === 'atualizacao') {
      text = `📝 *Evento atualizado*\n\n📍 Cidade: ${evento.cidade}\n📅 Data: ${dataBR}\n🕒 Horário: ${evento.dia_inteiro ? 'Dia inteiro' : evento.hora}\n📌 Evento: ${evento.titulo}\n\nVerifique as alterações.`;
    } else if (action === 'cancelamento') {
      text = `⚠️ *Evento cancelado*\n\n📌 ${evento.titulo}\n📍 ${evento.cidade}\n📅 ${dataBR}\n\nO evento foi cancelado.`;
    } else if (action === 'lembrete') {
      text = `⏰ *Lembrete de agenda*\n\nHoje o deputado estará em ${evento.cidade}\n\n📌 ${evento.titulo}${evento.local_nome ? `\n📍 Local: ${evento.local_nome}` : ''}\n🕒 Horário: ${evento.dia_inteiro ? 'Dia inteiro' : evento.hora}\n\nContamos com você.`;
    } else {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Unknown action' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find contacts to notify: liderancas from the same city AND tenant
    const cidadeEvento = evento.cidade;
    const tenantId = evento.tenant_id;

    if (!tenantId) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Event has no tenant_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get liderancas from this city that have telegram_username - filtered by tenant
    const { data: liderancasCity } = await supabase
      .from('liderancas')
      .select('name, telegram_username')
      .eq('tenant_id', tenantId)
      .eq('cidade_principal', cidadeEvento)
      .not('telegram_username', 'is', null)
      .neq('telegram_username', '');

    if (!liderancasCity || liderancasCity.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No liderancas with Telegram in this city for this tenant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get telegram_contacts — include tenant contacts AND contacts matching lideranca usernames
    const liderancaUsernames = liderancasCity
      .map((l: any) => (l.telegram_username || '').replace('@', '').toLowerCase().trim())
      .filter((u: string) => u.length > 0);

    const { data: contacts } = await supabase
      .from('telegram_contacts')
      .select('chat_id, username, lideranca_name, tenant_id');

    // Filter contacts: must belong to tenant OR match a lideranca username
    const relevantContacts = (contacts || []).filter((c: any) => {
      if (c.tenant_id === tenantId) return true;
      const cu = (c.username || '').toLowerCase().trim();
      if (cu && liderancaUsernames.includes(cu)) return true;
      return false;
    });

    if (relevantContacts.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No Telegram contacts found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Match liderancas to contacts
    const normalize = (u: string) => (u || '').replace('@', '').toLowerCase().trim();
    const chatIds = new Set<number>();

    for (const lid of liderancasCity) {
      const lidUsername = normalize(lid.telegram_username || '');
      for (const contact of contacts) {
        const contactUsername = normalize(contact.username || '');
        if (
          (lidUsername && contactUsername && lidUsername === contactUsername) ||
          (contact.lideranca_name && contact.lideranca_name === lid.name)
        ) {
          chatIds.add(contact.chat_id);
        }
      }
    }

    // Also include participantes_liderancas if they have contacts
    if (evento.participantes_liderancas && Array.isArray(evento.participantes_liderancas)) {
      for (const name of evento.participantes_liderancas) {
        for (const contact of contacts) {
          if (contact.lideranca_name === name) {
            chatIds.add(contact.chat_id);
          }
        }
      }
    }

    if (chatIds.size === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No matching chat_ids found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send messages
    let sent = 0;
    for (const chatId of chatIds) {
      try {
        // Check if already notified for this action
        const { data: existing } = await supabase
          .from('evento_notifications')
          .select('id')
          .eq('evento_id', evento_id)
          .eq('chat_id', chatId)
          .eq('tipo', action)
          .maybeSingle();

        if (existing) continue;

        const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
          }),
        });

        const data = await response.json();
        if (response.ok) {
          sent++;
          // Log notification
          await supabase.from('evento_notifications').insert({
            evento_id,
            chat_id: chatId,
            tipo: action,
          });
        } else {
          console.error(`Failed to send to ${chatId}:`, data);
        }
      } catch (e) {
        console.error(`Error sending to ${chatId}:`, e);
      }
    }

    // Mark event as notified
    if (action === 'criacao') {
      await supabase.from('eventos').update({ notificado: true } as any).eq('id', evento_id);
    }
    if (action === 'lembrete') {
      await supabase.from('eventos').update({ lembrete_enviado: true } as any).eq('id', evento_id);
    }

    return new Response(JSON.stringify({ ok: true, sent, total_contacts: chatIds.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Event notification error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
