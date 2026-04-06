import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id obrigatório");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather tenant context data
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const context = await gatherContext(supabase, tenant_id, lastUserMessage);

    const systemPrompt = buildSystemPrompt(context);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Erro ao consultar IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistente error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function gatherContext(supabase: any, tenantId: string, question: string) {
  const q = question.toLowerCase();

  // Always fetch summary counts
  const [
    { count: totalCidades },
    { count: totalLiderancas },
    { count: totalEmendas },
    { count: totalDemandas },
    { count: totalEventos },
    { count: totalMobilizacoes },
  ] = await Promise.all([
    supabase.from("cidades").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("liderancas").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("emendas").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("demandas").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("eventos").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("mobilizacoes").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  const context: any = {
    resumo: { totalCidades, totalLiderancas, totalEmendas, totalDemandas, totalEventos, totalMobilizacoes },
  };

  // Conditionally load detailed data based on question intent
  const needsCidades = /cidad|voto|fraca|forte|foco|potencial|penetra|ipp|score|resum/i.test(q);
  const needsLiderancas = /lideran|ativ|engaj|prefeito|inativ|resum/i.test(q);
  const needsEmendas = /emenda|invest|valor|resum/i.test(q);
  const needsDemandas = /demanda|pendente|resolv|resum/i.test(q);
  const needsAgenda = /agenda|visit|evento|resum|há quanto/i.test(q);
  const needsMobilizacao = /mobiliza|compartilh|campanha|alcance|resum/i.test(q);
  const needsProposicoes = /proposi|andamento|relevant|resum/i.test(q);
  const needsActivity = /resum|acontec|alert|oportunidade|atividade/i.test(q);

  const fetches: Promise<void>[] = [];

  if (needsCidades) {
    fetches.push(
      supabase.from("cidades")
        .select("name, population, votos_2022, peso, regiao, liderancas, demandas, demandas_resolvidas, emendas, engajamento, comunicacao_recente, presenca_deputado")
        .eq("tenant_id", tenantId)
        .order("votos_2022", { ascending: false })
        .limit(30)
        .then(({ data }: any) => { context.cidades = data || []; })
    );
  }

  if (needsLiderancas) {
    fetches.push(
      supabase.from("liderancas")
        .select("name, cargo, cidade_principal, influencia, tipo, engajamento, classificacao_manual")
        .eq("tenant_id", tenantId)
        .order("engajamento", { ascending: false })
        .limit(30)
        .then(({ data }: any) => { context.liderancas = data || []; })
    );
  }

  if (needsEmendas) {
    fetches.push(
      supabase.from("emendas")
        .select("tipo, valor, cidade, status, prioridade, ano, titulo")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }: any) => { context.emendas = data || []; })
    );
  }

  if (needsDemandas) {
    fetches.push(
      supabase.from("demandas")
        .select("title, city, col, priority, origin, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }: any) => { context.demandas = data || []; })
    );
  }

  if (needsAgenda) {
    fetches.push(
      supabase.from("eventos")
        .select("titulo, cidade, data, hora, tipo, status, prioridade, impacto_politico")
        .eq("tenant_id", tenantId)
        .order("data", { ascending: false })
        .limit(20)
        .then(({ data }: any) => { context.eventos = data || []; })
    );
  }

  if (needsMobilizacao) {
    fetches.push(
      supabase.from("mobilizacoes")
        .select("titulo, tipo, status, total_enviado, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }: any) => { context.mobilizacoes = data || []; })
    );
  }

  if (needsProposicoes) {
    fetches.push(
      supabase.from("proposicoes")
        .select("tipo, numero, ano, ementa, status_proposicao, autor")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(10)
        .then(({ data }: any) => { context.proposicoes = data || []; })
    );
  }

  if (needsActivity) {
    fetches.push(
      supabase.from("activity_logs")
        .select("tipo_evento, entidade, descricao_bruta, descricao_ia, prioridade, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(15)
        .then(({ data }: any) => { context.activity_logs = data || []; })
    );
  }

  await Promise.all(fetches);
  return context;
}

function buildSystemPrompt(context: any) {
  return `Você é o **Assistente do Mandato**, um copiloto inteligente para gestão parlamentar de deputados brasileiros.

## REGRAS OBRIGATÓRIAS
- Responda SEMPRE em português brasileiro
- Respostas curtas e objetivas (máx 3-4 linhas)
- Destaque números importantes com **negrito**
- Use linguagem política e estratégica
- Se não houver dados suficientes, sugira uma ação concreta
- NUNCA invente dados — use apenas o contexto fornecido
- Após cada resposta, sugira 1-2 ações práticas que o deputado pode tomar

## DADOS DO MANDATO (contexto atual)
${JSON.stringify(context, null, 2)}

## FORMATO DE RESPOSTA
- Seja direto e estratégico
- Use emojis moderadamente para destaque visual
- Quando listar itens, use bullet points
- Sempre contextualize politicamente os dados
- Ao final, sugira ações com o prefixo "💡 **Sugestão:**"`;
}
