import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tenants, error: tenantError } = await supabase
      .from("tenants")
      .select("id, camara_deputado_id")
      .not("camara_deputado_id", "is", null)
      .eq("status", "ativo");

    if (tenantError) throw tenantError;
    if (!tenants || tenants.length === 0) {
      return new Response(JSON.stringify({ message: "No tenants with camara_deputado_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const tenant of tenants) {
      try {
        // Fetch propositions list (lightweight - no details yet)
        const url = `${CAMARA_API}/proposicoes?idDeputadoAutor=${tenant.camara_deputado_id}&ordem=DESC&ordenarPor=id&itens=100`;
        const response = await fetch(url);
        if (!response.ok) {
          results.push({ tenant_id: tenant.id, error: `API ${response.status}` });
          continue;
        }

        const { dados } = await response.json();
        if (!dados || dados.length === 0) {
          results.push({ tenant_id: tenant.id, count: 0 });
          continue;
        }

        // Get existing proposições for this tenant to check what's new/changed
        const { data: existing } = await supabase
          .from("proposicoes")
          .select("camara_id, status_proposicao, updated_at")
          .eq("tenant_id", tenant.id);

        const existingMap = new Map(
          (existing || []).map((e: any) => [e.camara_id, e])
        );

        let synced = 0;
        let kanbanCreated = 0;

        // Process in parallel batches of 5
        const BATCH_SIZE = 5;
        for (let i = 0; i < dados.length; i += BATCH_SIZE) {
          const batch = dados.slice(i, i + BATCH_SIZE);

          await Promise.allSettled(
            batch.map(async (prop: any) => {
              // Get details + authors in parallel
              const [detailRes, autorRes] = await Promise.allSettled([
                fetch(`${CAMARA_API}/proposicoes/${prop.id}`).then(r => r.ok ? r.json() : null),
                fetch(`${CAMARA_API}/proposicoes/${prop.id}/autores`).then(r => r.ok ? r.json() : null),
              ]);

              const detailData = detailRes.status === "fulfilled" ? detailRes.value?.dados : null;
              const autorData = autorRes.status === "fulfilled" ? autorRes.value?.dados : null;
              const status = detailData?.statusProposicao?.descricaoSituacao || "Apresentada";
              const autor = autorData ? autorData.map((a: any) => a.nome).join(", ") : "";

              // Upsert proposition
              const { data: upserted, error: upsertError } = await supabase
                .from("proposicoes")
                .upsert({
                  tenant_id: tenant.id,
                  camara_id: prop.id,
                  tipo: prop.siglaTipo,
                  numero: prop.numero,
                  ano: prop.ano,
                  ementa: prop.ementa || detailData?.ementa,
                  status_proposicao: status,
                  tema: typeof detailData?.keywords === "string" ? detailData.keywords : null,
                  autor: autor || null,
                  url_inteiro_teor: detailData?.urlInteiroTeor || null,
                  ultima_atualizacao: detailData?.statusProposicao?.dataHora || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: "tenant_id,camara_id" })
                .select("id, adicionado_kanban, demanda_id")
                .single();

              if (upsertError) return;
              synced++;

              // Sync top 5 tramitações only
              try {
                const tramRes = await fetch(`${CAMARA_API}/proposicoes/${prop.id}/tramitacoes`);
                if (tramRes.ok) {
                  const tramData = await tramRes.json();
                  for (const tram of (tramData.dados || []).slice(0, 5)) {
                    await supabase.from("proposicao_tramitacoes").upsert({
                      proposicao_id: upserted.id,
                      tenant_id: tenant.id,
                      data_hora: tram.dataHora,
                      sequencia: tram.sequencia,
                      sigla_orgao: tram.siglaOrgao,
                      descricao_tramitacao: tram.descricaoTramitacao,
                      despacho: tram.despacho,
                      situacao: tram.situacao || null,
                      url: tram.url || null,
                    }, { onConflict: "proposicao_id,sequencia", ignoreDuplicates: true });
                  }
                }
              } catch { /* skip */ }

              // Kanban: create or move
              const kanbanCol = mapStatusToKanban(status);

              if (!upserted.adicionado_kanban || !upserted.demanda_id) {
                const { data: newDemanda } = await supabase
                  .from("demandas")
                  .insert({
                    title: `${prop.siglaTipo} ${prop.numero}/${prop.ano}`,
                    description: prop.ementa || "",
                    city: "Brasília",
                    col: kanbanCol,
                    priority: "Média",
                    origin: "proposicao",
                    tenant_id: tenant.id,
                  })
                  .select("id")
                  .single();

                if (newDemanda) {
                  await supabase
                    .from("proposicoes")
                    .update({ adicionado_kanban: true, demanda_id: newDemanda.id })
                    .eq("id", upserted.id);
                  kanbanCreated++;
                }
              } else {
                await supabase
                  .from("demandas")
                  .update({ col: kanbanCol })
                  .eq("id", upserted.demanda_id);
              }
            })
          );

          // Small delay between batches to respect rate limits
          await new Promise(r => setTimeout(r, 50));
        }

        results.push({ tenant_id: tenant.id, synced, kanban_created: kanbanCreated });
      } catch (e: any) {
        results.push({ tenant_id: tenant.id, error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapStatusToKanban(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("apresentada")) return "nova";
  if (s.includes("tramitação") || s.includes("tramitando") || s.includes("conjunto")) return "encaminhada";
  if (s.includes("análise") || s.includes("comissão") || s.includes("parecer") || s.includes("pauta") || s.includes("designação")) return "analise";
  if (s.includes("aprovada")) return "resolvida";
  if (s.includes("arquivada") || s.includes("rejeitada") || s.includes("devolvida")) return "resolvida";
  return "nova";
}
