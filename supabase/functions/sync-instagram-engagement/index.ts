import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get sync config for this tenant
    const { data: config, error: configErr } = await supabase
      .from("engagement_sync_config")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (configErr || !config) {
      return new Response(JSON.stringify({ error: "Configuração de engajamento não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.apify_api_key || !config.instagram_handle) {
      return new Response(JSON.stringify({ error: "API Key do Apify ou handle do Instagram não configurados" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instagramHandle = config.instagram_handle.replace("@", "");

    // 2. Call Apify Instagram Scraper - fetch last 5 posts
    console.log(`[${tenant_id}] Buscando últimos 5 posts de @${instagramHandle}`);

    const apifyInput = {
      directUrls: [`https://www.instagram.com/${instagramHandle}/`],
      resultsType: "posts",
      resultsLimit: 5,
      addParentData: false,
    };

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${config.apify_api_key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput),
      }
    );

    if (!runRes.ok) {
      const errText = await runRes.text();
      console.error(`[${tenant_id}] Apify error: ${runRes.status} ${errText}`);
      
      await supabase
        .from("engagement_sync_config")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "erro",
          last_sync_error: `Apify retornou ${runRes.status}`,
        })
        .eq("tenant_id", tenant_id);

      return new Response(JSON.stringify({ error: "Erro na API do Apify", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const posts = await runRes.json();
    console.log(`[${tenant_id}] Recebidos ${posts.length} posts`);

    if (!Array.isArray(posts) || posts.length === 0) {
      await supabase
        .from("engagement_sync_config")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "ok",
          last_sync_error: null,
        })
        .eq("tenant_id", tenant_id);

      return new Response(JSON.stringify({ message: "Nenhum post encontrado", processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get already processed post IDs for this tenant
    const postIds = posts.map((p: any) => p.id || p.shortCode || p.url).filter(Boolean);
    const { data: existingPosts } = await supabase
      .from("engagement_processed_posts")
      .select("post_id")
      .eq("tenant_id", tenant_id)
      .in("post_id", postIds);

    const processedPostIds = new Set((existingPosts || []).map((p: any) => p.post_id));

    // 4. Get lideranças with instagram handles for this tenant
    const { data: liderancas } = await supabase
      .from("liderancas")
      .select("id, name, instagram")
      .eq("tenant_id", tenant_id)
      .not("instagram", "is", null);

    // Build lookup map: lowercase instagram handle → leader info
    const leaderMap = new Map<string, { id: string; name: string }>();
    (liderancas || []).forEach((l: any) => {
      if (l.instagram) {
        const handle = l.instagram.replace("@", "").toLowerCase().trim();
        if (handle) leaderMap.set(handle, { id: l.id, name: l.name });
      }
    });

    console.log(`[${tenant_id}] ${leaderMap.size} lideranças com Instagram cadastrado`);

    let totalNewPosts = 0;
    let totalNewComments = 0;
    let totalMatches = 0;

    // 5. Process each new post
    for (const post of posts) {
      const postId = post.id || post.shortCode || post.url;
      if (!postId || processedPostIds.has(postId)) {
        continue; // Skip already processed
      }

      totalNewPosts++;

      // Get comments for this post
      const comments = post.latestComments || post.comments || [];
      console.log(`[${tenant_id}] Post ${postId}: ${comments.length} comentários`);

      // Get already processed comment IDs
      const commentIds = comments.map((c: any) => c.id || c.pk || `${postId}_${c.text?.substring(0, 20)}`).filter(Boolean);
      
      let existingCommentIds = new Set<string>();
      if (commentIds.length > 0) {
        const { data: existingComments } = await supabase
          .from("engagement_logs")
          .select("comment_id")
          .eq("tenant_id", tenant_id)
          .in("comment_id", commentIds);
        existingCommentIds = new Set((existingComments || []).map((c: any) => c.comment_id));
      }

      const engagementInserts: any[] = [];

      for (const comment of comments) {
        const commentId = comment.id || comment.pk || `${postId}_${comment.text?.substring(0, 20)}`;
        if (!commentId || existingCommentIds.has(commentId)) continue;

        totalNewComments++;

        const commenterHandle = (comment.ownerUsername || comment.owner?.username || "").toLowerCase().trim();
        if (!commenterHandle) continue;

        const leader = leaderMap.get(commenterHandle);
        if (!leader) continue;

        // Determine score
        const commentText = (comment.text || "").toLowerCase();
        const mentionsDeputy = commentText.includes(`@${instagramHandle.toLowerCase()}`);
        const score = mentionsDeputy ? 10 : 5;
        const tipo = mentionsDeputy ? "mencao" : "comentario";

        totalMatches++;

        engagementInserts.push({
          tenant_id,
          leader_id: leader.id,
          instagram_username: commenterHandle,
          post_id: postId,
          comment_id: commentId,
          comment_text: (comment.text || "").substring(0, 500),
          tipo_interacao: tipo,
          score,
        });
      }

      // Insert engagement logs
      if (engagementInserts.length > 0) {
        const { error: insertErr } = await supabase
          .from("engagement_logs")
          .insert(engagementInserts);
        if (insertErr) {
          console.error(`[${tenant_id}] Erro ao inserir logs: ${insertErr.message}`);
        }
      }

      // Mark post as processed
      await supabase
        .from("engagement_processed_posts")
        .insert({
          tenant_id,
          post_id: postId,
          post_url: post.url || null,
          post_caption: (post.caption || "").substring(0, 500),
          post_timestamp: post.timestamp ? new Date(post.timestamp).toISOString() : null,
          comments_count: comments.length,
        });
    }

    // 6. Update sync status
    await supabase
      .from("engagement_sync_config")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "ok",
        last_sync_error: null,
      })
      .eq("tenant_id", tenant_id);

    const result = {
      message: "Sincronização concluída",
      posts_processados: totalNewPosts,
      comentarios_analisados: totalNewComments,
      matches_encontrados: totalMatches,
    };

    console.log(`[${tenant_id}] Resultado:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Erro geral:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
