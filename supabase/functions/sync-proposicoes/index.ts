import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";

interface CamaraProposicao {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa: string;
}

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
        // Fetch propositions from Câmara API
        const url = `${CAMARA_API}/proposicoes?idDeputadoAutor=${tenant.camara_deputado_id}&ordem=DESC&ordenarPor=id&itens=100`;
        console.log(`Fetching propositions for tenant ${tenant.id}: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          results.push({ tenant_id: tenant.id, error: `API returned ${response.status}` });
          continue;
        }

        const { dados } = await response.json();
        if (!dados || dados.length === 0) {
          results.push({ tenant_id: tenant.id, count: 0 });
          continue;
        }

        console.log(`Found ${dados.length} propositions for tenant ${tenant.id}`);
        let synced = 0;
        let kanbanCreated = 0;

        // Process in batches of 5 for speed
        const BATCH_SIZE = 5;
        for (let i = 0; i < dados.length; i += BATCH_SIZE) {
          const batch = (dados as CamaraProposicao[]).slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(async (prop) => {
              // Get details
              let detailData: any = null;
              try {
                const detailRes = await fetch(`${CAMARA_API}/proposicoes/${prop.id}`);
                if (detailRes.ok) {
                  const detail = await detailRes.json();
                  detailData = detail.dados;
                }
              } catch { /* skip */ }

              const status = detailData?.statusProposicao?.descricaoSituacao || "Apresentada";

              // Get authors
              let autor = "";
              try {
                const autorRes = await fetch(`${CAMARA_API}/proposicoes/${prop.id}/autores`);
                if (autorRes.ok) {
                  const autorData = await autorRes.json();
                  autor = (autorData.dados || []).map((a: any) => a.nome).join(", ");
                }
              } catch { /* skip */ }

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
                }, {
                  onConflict: "tenant_id,camara_id",
                })
                .select("id, status_proposicao, adicionado_kanban, demanda_id")
                .single();

              if (upsertError) {
                console.error(`Upsert error for ${prop.siglaTipo} ${prop.numero}:`, upsertError.message);
                return { synced: false, kanban: false };
              }

              // Sync top 10 tramitações
              try {
                const tramRes = await fetch(`${CAMARA_API}/proposicoes/${prop.id}/tramitacoes`);
                if (tramRes.ok) {
                  const tramData = await tramRes.json();
                  const tramitacoes = (tramData.dados || []).slice(0, 10);
                  for (const tram of tramitacoes) {
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

              // Kanban integration
              const kanbanCol = mapStatusToKanban(status);
              let didCreateKanban = false;

              if (!upserted.adicionado_kanban || !upserted.demanda_id) {
                const { data: newDemanda, error: insertErr } = await supabase
                  .from("demandas")
                  .insert({
                    title: `${prop.siglaTipo} ${prop.numero}/${prop.ano}`,
                    description: prop.ementa || detailData?.ementa || "",
                    city: "Brasília",
                    col: kanbanCol,
                    priority: "Média",
                    origin: "proposicao",
                    tenant_id: tenant.id,
                  })
                  .select("id")
                  .single();

                if (insertErr) {
                  console.error(`Kanban insert error for ${prop.siglaTipo} ${prop.numero}:`, insertErr.message);
                } else if (newDemanda) {
                  await supabase
                    .from("proposicoes")
                    .update({ adicionado_kanban: true, demanda_id: newDemanda.id })
                    .eq("id", upserted.id);
                  console.log(`✅ Kanban card created: ${prop.siglaTipo} ${prop.numero}/${prop.ano} -> ${kanbanCol}`);
                  didCreateKanban = true;
                }
              } else {
                await supabase
                  .from("demandas")
                  .update({ col: kanbanCol })
                  .eq("id", upserted.demanda_id);
              }

              return { synced: true, kanban: didCreateKanban };
            })
          );

          for (const r of batchResults) {
            if (r.status === "fulfilled") {
              if (r.value.synced) synced++;
              if (r.value.kanban) kanbanCreated++;
            }
          }

          // Small delay between batches
          await new Promise(r => setTimeout(r, 100));
        }

        console.log(`Tenant ${tenant.id}: synced=${synced}, kanban_created=${kanbanCreated}`);
        results.push({ tenant_id: tenant.id, count: synced, kanban_created: kanbanCreated });
      } catch (e: any) {
        console.error(`Tenant ${tenant.id} error:`, e.message);
        results.push({ tenant_id: tenant.id, error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapStatusToKanban(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("apresentada")) return "nova";
  if (s.includes("tramitação") || s.includes("tramitando") || s.includes("tramitando em conjunto")) return "encaminhada";
  if (s.includes("análise") || s.includes("comissão") || s.includes("parecer") || s.includes("pauta") || s.includes("designação")) return "analise";
  if (s.includes("aprovada")) return "resolvida";
  if (s.includes("arquivada") || s.includes("rejeitada") || s.includes("devolvida")) return "resolvida";
  return "nova";
}
