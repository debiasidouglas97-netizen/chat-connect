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
  statusProposicao?: {
    descricaoSituacao?: string;
    dataHora?: string;
    despacho?: string;
    siglaOrgao?: string;
    descricaoTramitacao?: string;
    url?: string;
    sequencia?: number;
  };
  urlInteiroTeor?: string;
}

interface CamaraTramitacao {
  dataHora: string;
  sequencia: number;
  siglaOrgao: string;
  descricaoTramitacao: string;
  despacho: string;
  situacao?: string;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active tenants with camara_deputado_id
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
        // Fetch propositions authored by this deputy
        const url = `${CAMARA_API}/proposicoes?idDeputadoAutor=${tenant.camara_deputado_id}&ordem=DESC&ordenarPor=id&itens=100`;
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

        let synced = 0;

        for (const prop of dados as CamaraProposicao[]) {
          // Get full details
          let detailData: any = null;
          try {
            const detailRes = await fetch(`${CAMARA_API}/proposicoes/${prop.id}`);
            if (detailRes.ok) {
              const detail = await detailRes.json();
              detailData = detail.dados;
            }
          } catch { /* skip detail */ }

          const status = detailData?.statusProposicao?.descricaoSituacao || "Apresentada";
          const tema = detailData?.keywords || null;

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
              tema: typeof tema === "string" ? tema : null,
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
            console.error("Upsert error:", upsertError);
            continue;
          }

          // Sync tramitações
          try {
            const tramRes = await fetch(`${CAMARA_API}/proposicoes/${prop.id}/tramitacoes`);
            if (tramRes.ok) {
              const tramData = await tramRes.json();
              const tramitacoes = (tramData.dados || []) as CamaraTramitacao[];

              for (const tram of tramitacoes.slice(0, 20)) {
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
          } catch { /* skip tramitacoes */ }

          // Auto-move Kanban card if linked
          if (upserted.adicionado_kanban && upserted.demanda_id) {
            const kanbanCol = mapStatusToKanban(status);
            await supabase
              .from("demandas")
              .update({ col: kanbanCol })
              .eq("id", upserted.demanda_id);
          }

          synced++;

          // Rate limiting - be nice to the API
          await new Promise(r => setTimeout(r, 200));
        }

        results.push({ tenant_id: tenant.id, count: synced });
      } catch (e: any) {
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
