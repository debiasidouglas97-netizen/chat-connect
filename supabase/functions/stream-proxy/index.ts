const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the remote resource
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'MandatoGov-StreamProxy/1.0',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Upstream error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // For .m3u8 playlists, rewrite relative URLs to go through proxy
    if (targetUrl.endsWith('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      let body = await response.text();
      
      // Get base URL for resolving relative paths
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const proxyBase = `${supabaseUrl}/functions/v1/stream-proxy`;
      
      // Rewrite relative URLs in the playlist
      const lines = body.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          // This is a URL line (segment or sub-playlist)
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return `${proxyBase}?url=${encodeURIComponent(trimmed)}`;
          } else {
            // Relative URL
            return `${proxyBase}?url=${encodeURIComponent(baseUrl + trimmed)}`;
          }
        }
        return line;
      });
      
      body = lines.join('\n');

      return new Response(body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // For .mpd manifests, rewrite BaseURL
    if (targetUrl.endsWith('.mpd') || contentType.includes('dash')) {
      let body = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const reqUrl2 = new URL(req.url);
      const proxyBase = `${reqUrl2.origin}/functions/v1/stream-proxy`;
      
      // Add BaseURL rewriting for DASH
      body = body.replace(/<BaseURL>(.*?)<\/BaseURL>/g, (_, url) => {
        const fullUrl = url.startsWith('http') ? url : baseUrl + url;
        return `<BaseURL>${proxyBase}?url=${encodeURIComponent(fullUrl)}</BaseURL>`;
      });

      return new Response(body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/dash+xml',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // For segments (.ts, .mp4, etc.), stream directly
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
    };

    const cl = response.headers.get('content-length');
    if (cl) responseHeaders['Content-Length'] = cl;

    return new Response(response.body, {
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
