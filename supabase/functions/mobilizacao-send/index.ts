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
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, titulo, link, mensagem, segmentacao_tipo, segmentacao_valor, enviado_por } = await req.json();

    if (!tenant_id || !mensagem || !link) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build liderancas query based on segmentation
    let query = supabase
      .from('liderancas')
      .select('name, cidade_principal, telegram_username')
      .eq('tenant_id', tenant_id)
      .not('telegram_username', 'is', null)
      .neq('telegram_username', '');

    if (segmentacao_tipo === 'cidade' && segmentacao_valor?.length > 0) {
      query = query.in('cidade_principal', segmentacao_valor);
    } else if (segmentacao_tipo === 'tipo' && segmentacao_valor?.length > 0) {
      query = query.in('tipo', segmentacao_valor);
    } else if (segmentacao_tipo === 'manual' && segmentacao_valor?.length > 0) {
      query = query.in('name', segmentacao_valor);
    }

    const { data: liderancas } = await query;
    if (!liderancas || liderancas.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'Nenhuma liderança com Telegram encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get telegram contacts for matching
    const { data: contacts } = await supabase
      .from('telegram_contacts')
      .select('chat_id, username, lideranca_name')
      .eq('tenant_id', tenant_id);

    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'Nenhum contato Telegram ativo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalize = (u: string) => (u || '').replace('@', '').toLowerCase().trim();

    // Match liderancas to chat_ids
    const recipients: { name: string; cidade: string; chatId: number }[] = [];
    for (const lid of liderancas) {
      const lidUsername = normalize(lid.telegram_username || '');
      for (const contact of contacts) {
        const contactUsername = normalize(contact.username || '');
        if (
          (lidUsername && contactUsername && lidUsername === contactUsername) ||
          (contact.lideranca_name && contact.lideranca_name === lid.name)
        ) {
          recipients.push({ name: lid.name, cidade: lid.cidade_principal, chatId: contact.chat_id });
          break;
        }
      }
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'Nenhuma liderança com Telegram vinculado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find or create the mobilizacao record to link destinatarios
    const { data: mobRecord } = await supabase
      .from('mobilizacoes')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('titulo', titulo)
      .eq('status', 'enviado')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let sent = 0;
    const destinatarioRows: any[] = [];

    for (const r of recipients) {
      // Replace variables in message
      const personalMsg = mensagem
        .replace(/\{nome_lider\}/g, r.name)
        .replace(/\{cidade\}/g, r.cidade)
        .replace(/\{link\}/g, link);

      try {
        const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chat_id: r.chatId, text: personalMsg, parse_mode: 'HTML' }),
        });

        const success = response.ok;
        if (success) sent++;

        destinatarioRows.push({
          mobilizacao_id: mobRecord?.id,
          tenant_id,
          lideranca_name: r.name,
          cidade: r.cidade,
          chat_id: r.chatId,
          telegram_enviado: success,
          enviado_at: success ? new Date().toISOString() : null,
        });
      } catch (e) {
        console.error(`Error sending to ${r.name}:`, e);
        destinatarioRows.push({
          mobilizacao_id: mobRecord?.id,
          tenant_id,
          lideranca_name: r.name,
          cidade: r.cidade,
          chat_id: r.chatId,
          telegram_enviado: false,
          enviado_at: null,
        });
      }
    }

    // Insert destinatarios
    if (mobRecord?.id && destinatarioRows.length > 0) {
      const validRows = destinatarioRows.filter(r => r.mobilizacao_id);
      if (validRows.length > 0) {
        await supabase.from('mobilizacao_destinatarios').insert(validRows);
      }

      // Update total_enviado
      await supabase
        .from('mobilizacoes')
        .update({ total_enviado: sent, enviado_por: enviado_por || 'Sistema' })
        .eq('id', mobRecord.id);
    }

    return new Response(JSON.stringify({ ok: true, sent, total: recipients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mobilizacao send error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
