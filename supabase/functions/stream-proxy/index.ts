const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range, accept, origin",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges, content-type, cache-control",
};

function buildProxyBase() {
  return `${Deno.env.get("SUPABASE_URL")!}/functions/v1/stream-proxy`;
}

function appendPassthroughHeaders(
  source: Headers,
  target: Record<string, string>,
  keys: string[],
) {
  for (const key of keys) {
    const value = source.get(key);
    if (value) {
      target[key] = value;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqUrlObj = new URL(req.url);
    const targetUrl = reqUrlObj.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstreamHeaders = new Headers({
      "User-Agent": "MandatoGov-StreamProxy/1.0",
      Accept: req.headers.get("accept") ?? "*/*",
    });

    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      upstreamHeaders.set("Range", rangeHeader);
    }

    const response = await fetch(targetUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers: upstreamHeaders,
    });

    const baseResponseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Cache-Control": response.headers.get("cache-control") ?? "no-cache",
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
    };

    appendPassthroughHeaders(response.headers, baseResponseHeaders, [
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]);

    if (!response.ok) {
      const errorText = req.method === "HEAD" ? "" : await response.text();
      return new Response(errorText || JSON.stringify({ error: `Upstream error: ${response.status}` }), {
        status: response.status,
        headers: baseResponseHeaders,
      });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";

    if (req.method === "HEAD") {
      return new Response(null, {
        status: response.status,
        headers: baseResponseHeaders,
      });
    }

    if (targetUrl.endsWith(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")) {
      let body = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const proxyBase = buildProxyBase();

      const lines = body.split("\n").map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return line;
        }

        const resolvedUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : new URL(trimmed, baseUrl).toString();

        return `${proxyBase}?url=${encodeURIComponent(resolvedUrl)}`;
      });

      return new Response(lines.join("\n"), {
        status: response.status,
        headers: {
          ...baseResponseHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
        },
      });
    }

    if (targetUrl.endsWith(".mpd") || contentType.includes("dash")) {
      let body = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const proxyBase = buildProxyBase();

      body = body.replace(/<BaseURL>(.*?)<\/BaseURL>/g, (_match, url) => {
        const fullUrl = url.startsWith("http") ? url : new URL(url, baseUrl).toString();
        return `<BaseURL>${proxyBase}?url=${encodeURIComponent(fullUrl)}</BaseURL>`;
      });

      return new Response(body, {
        status: response.status,
        headers: {
          ...baseResponseHeaders,
          "Content-Type": "application/dash+xml",
        },
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: baseResponseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
