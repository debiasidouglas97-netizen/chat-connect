import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const statusMessages: Record<string, (title: string, city: string) => string> = {
  nova: (title, city) =>
    `✅ Sua demanda foi registrada com sucesso!\n\n📌 ${title}\n📍 ${city}\n\nEm breve será analisada.`,
  analise: (title) =>
    `🔍 Sua demanda está em análise\n\n📌 ${title}\nNossa equipe já está avaliando.`,
  encaminhada: (title) =>
    `📤 Sua demanda foi encaminhada\n\n📌 ${title}\nJá enviamos ao setor responsável.`,
  execucao: (title) =>
    `⚙️ Sua demanda está em execução\n\n📌 ${title}\nEstamos trabalhando na solução.`,
  resolvida: (title) =>
    `🎉 Sua demanda foi resolvida!\n\n📌 ${title}\n\nSe precisar de algo mais, conte conosco.`,
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

    const { demanda_id, new_status } = await req.json();

    if (!demanda_id || !new_status) {
      return new Response(JSON.stringify({ error: 'Missing demanda_id or new_status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the demanda
    const { data: demanda, error: demandaErr } = await supabase
      .from('demandas')
      .select('*')
      .eq('id', demanda_id)
      .single();

    if (demandaErr || !demanda) {
      return new Response(JSON.stringify({ error: 'Demanda not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only notify if demanda has a creator_chat_id (came from Telegram)
    if (!demanda.creator_chat_id) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No creator_chat_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messageTemplate = statusMessages[new_status];
    if (!messageTemplate) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Unknown status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we already sent this status notification
    const { data: existingNotification } = await supabase
      .from('demanda_notifications')
      .select('id')
      .eq('demanda_id', demanda_id)
      .eq('status_sent', new_status)
      .single();

    if (existingNotification) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Already notified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = messageTemplate(demanda.title, demanda.city);

    // Send Telegram message
    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: demanda.creator_chat_id,
        text,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Telegram API failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    // Log the notification
    await supabase.from('demanda_notifications').insert({
      demanda_id,
      chat_id: demanda.creator_chat_id,
      status_sent: new_status,
    });

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Notification error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
