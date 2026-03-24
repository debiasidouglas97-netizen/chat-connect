import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Find events for today that haven't had reminders sent
    const { data: eventos, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('data', todayStr)
      .eq('lembrete_enviado', false)
      .neq('status', 'Cancelado');

    if (error) throw error;

    if (!eventos || eventos.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No events today needing reminders' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For each event, call telegram-event-notify with action=lembrete
    let sent = 0;
    for (const evento of eventos) {
      try {
        const notifyUrl = `${supabaseUrl}/functions/v1/telegram-event-notify`;
        const response = await fetch(notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            evento_id: evento.id,
            action: 'lembrete',
          }),
        });
        const data = await response.json();
        if (data.ok) sent++;
      } catch (e) {
        console.error(`Reminder error for evento ${evento.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, events_found: eventos.length, reminders_sent: sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Daily reminder error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
