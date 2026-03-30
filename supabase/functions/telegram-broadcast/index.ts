import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { text, cidade, participantes_liderancas, tenant_id } = await req.json();

    if (!text || !cidade || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing text, cidade or tenant_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get liderancas from this city with telegram - strictly filtered by tenant
    const { data: liderancasCity } = await supabase
      .from('liderancas')
      .select('name, telegram_username')
      .eq('tenant_id', tenant_id)
      .eq('cidade_principal', cidade)
      .not('telegram_username', 'is', null)
      .neq('telegram_username', '');

    // Get telegram contacts for this tenant only
    const { data: contacts } = await supabase
      .from('telegram_contacts')
      .select('chat_id, username, lideranca_name')
      .eq('tenant_id', tenant_id);

    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'Nenhum contato Telegram encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalize = (u: string) => (u || '').replace('@', '').toLowerCase().trim();
    const chatIds = new Set<number>();

    // Match city liderancas
    if (liderancasCity) {
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
    }

    // Also include explicit participantes
    if (participantes_liderancas && Array.isArray(participantes_liderancas)) {
      for (const name of participantes_liderancas) {
        for (const contact of contacts) {
          if (contact.lideranca_name === name) {
            chatIds.add(contact.chat_id);
          }
        }
      }
    }

    if (chatIds.size === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'Nenhuma liderança com Telegram vinculado nesta cidade' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    for (const chatId of chatIds) {
      try {
        const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });

        if (response.ok) sent++;
        else {
          const err = await response.json();
          console.error(`Failed to send to ${chatId}:`, err);
        }
      } catch (e) {
        console.error(`Error sending to ${chatId}:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, total: chatIds.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Telegram send error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
