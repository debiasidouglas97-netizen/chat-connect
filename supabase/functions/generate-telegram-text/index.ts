import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { titulo, descricao, data, hora, hora_fim, cidade, endereco, local_nome, tipo, estilo } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const estiloInstrucao = estilo === "curto"
      ? "Gere um texto CURTO e direto, máximo 3 linhas, apenas o essencial (o que, quando, onde)."
      : estilo === "longo"
      ? "Gere um texto LONGO e completo, com saudação calorosa, detalhes do evento, contexto político, importância da presença e encerramento motivacional. Mínimo 6 linhas."
      : "Gere um texto DETALHADO mas conciso, com saudação, informações do evento e convite à participação. Entre 4 e 6 linhas.";

    const horarioTexto = hora_fim ? `${hora} às ${hora_fim}` : hora;

    const prompt = `Você é um assessor parlamentar profissional. Gere uma mensagem para enviar via Telegram convidando lideranças para um evento político.

${estiloInstrucao}

Use emojis de forma moderada e profissional. O texto deve ser acolhedor mas institucional.

Informações do evento:
- Título: ${titulo}
- Tipo: ${tipo || "Evento"}
- Descrição: ${descricao || "Não informada"}
- Data: ${data}
- Horário: ${horarioTexto || "A definir"}
- Cidade: ${cidade}
- Local: ${local_nome || "A definir"}
- Endereço: ${endereco || "A definir"}

Gere APENAS o texto da mensagem, sem aspas, sem explicações adicionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um assessor parlamentar brasileiro especialista em comunicação política via Telegram." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos nas configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const text = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
