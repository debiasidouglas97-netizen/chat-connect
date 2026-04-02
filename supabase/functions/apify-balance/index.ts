const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apify_api_key } = await req.json();
    if (!apify_api_key) {
      return new Response(JSON.stringify({ error: "apify_api_key obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.apify.com/v2/users/me?token=${apify_api_key}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Erro ao consultar Apify", status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const userData = data?.data;

    // Extract plan/balance info
    const plan = userData?.plan;
    const proxy = userData?.proxy;

    const result: Record<string, any> = {
      username: userData?.username,
      email: userData?.email,
      plan_description: plan?.description || plan?.id || "Free",
    };

    // Monthly usage
    if (plan?.monthlyUsageUsd !== undefined) {
      result.monthly_usage_usd = plan.monthlyUsageUsd;
    }
    if (plan?.usageTotalUsd !== undefined) {
      result.usage_total_usd = plan.usageTotalUsd;
    }
    // Available credits
    if (plan?.remainingUsageUsd !== undefined) {
      result.remaining_usd = plan.remainingUsageUsd;
    } else if (plan?.limitUsd !== undefined && plan?.monthlyUsageUsd !== undefined) {
      result.remaining_usd = Math.max(0, plan.limitUsd - plan.monthlyUsageUsd);
    }
    // Prepaid balance
    if (userData?.prepaidUsd !== undefined) {
      result.prepaid_usd = userData.prepaidUsd;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
