/**
 * Ultra-Fast Streaming Edge Proxy & Bridge
 * Optimized for HTTP/2 & HTTP/3 Media Streaming, WebSocket Passthrough,
 * and Native Browser Relative-Path Resolution.
 */

const PREFIX = '/proxy/';

// Domain blocklist for ad/tracker mitigation
const AD_PATTERNS = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)googleadservices\.com$/i,
  /(^|\.)adnxs\.com$/i,
  /(^|\.)criteo\.(com|net)$/i,
  /(^|\.)scorecardresearch\.com$/i,
  /(^|\.)amazon-adsystem\.com$/i
];

export default {
  async fetch(request, env, ctx) {
    return await handleGateway(request);
  }
};

async function handleGateway(request) {
  const reqUrl = new URL(request.url);

  // 1. Dynamic CORS Preflight Handling (RFC Compliant)
  if (request.method === 'OPTIONS') {
    return handleCorsPreflight(request);
  }

  // 2. Resolve the Target Destination
  const targetUrl = resolveTargetUrl(reqUrl);
  if (!targetUrl) {
    return serveLandingPage(reqUrl);
  }

  // 3. Ad & Telemetry Blocker
  if (isAdBlocked(targetUrl.hostname)) {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }

  // 4. WebSocket Passthrough
  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    return forwardWebSocket(request, targetUrl);
  }

  // 5. Build Upstream Headers
  const upstreamHeaders = cleanAndBuildRequestHeaders(request, targetUrl);

  // 6. Upstream Request Configuration
  const fetchInit = {
    method: request.method,
    headers: upstreamHeaders,
    redirect: 'manual', // Client handles redirects to preserve path prefixing
    cf: {
      cacheEverything: false,
      scrapeShield: false,
      mirage: false,
      minify: { javascript: false, css: false, html: false }
    }
  };

  // Streaming request body for POST/PUT/PATCH
  if (!['GET', 'HEAD'].includes(request.method)) {
    fetchInit.body = request.body;
    fetchInit.duplex = 'half';
  }

  try {
    const upstreamResponse = await fetch(targetUrl.href, fetchInit);

    // 7. Handle Upstream Redirects (Preserve Proxy Path)
    if ([301, 302, 303, 307, 308].includes(upstreamResponse.status)) {
      return handleRedirect(upstreamResponse, reqUrl, targetUrl);
    }

    // 8. Build Sanitized Streaming Response
    const responseHeaders = buildResponseHeaders(upstreamResponse, request, targetUrl);

    // Direct byte-stream passthrough (Zero-Copy)
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });

  } catch (err) {
    return new Response(`Gateway Bridge Error: ${err.message}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain', ...getCorsHeaders(request) }
    });
  }
}

// -----------------------------------------------------------------------------
// ROUTING & URL EXTRACTION ENGINE
// -----------------------------------------------------------------------------

function resolveTargetUrl(reqUrl) {
  // Method A: Check Path-Prefix: /proxy/https/domain.com/path
  if (reqUrl.pathname.startsWith(PREFIX)) {
    const remainder = reqUrl.pathname.slice(PREFIX.length);
    const match = remainder.match(/^(https?):?\/?\/?([^\/]+)(.*)/i);
    if (match) {
      const scheme = match[1].toLowerCase();
      const host = match[2];
      const rest = match[3] || '';
      try {
        return new URL(`${scheme}://${host}${rest}${reqUrl.search}`);
      } catch {}
    }
  }

  // Method B: Legacy Query-Param Fallback: ?url=https://domain.com
  const queryUrl = reqUrl.searchParams.get('url');
  if (queryUrl) {
    try {
      const parsed = queryUrl.startsWith('http') ? queryUrl : `https://${queryUrl}`;
      return new URL(parsed);
    } catch {}
  }

  return null;
}

function handleRedirect(upstreamResponse, clientReqUrl, currentTargetUrl) {
  const location = upstreamResponse.headers.get('Location');
  if (!location) {
    return new Response(null, { status: upstreamResponse.status });
  }

  // Resolve relative redirect against destination
  const resolvedTarget = new URL(location, currentTargetUrl.href);

  // Re-encode redirect location into proxy path
  const newProxyPath = `${PREFIX}${resolvedTarget.protocol.replace(':', '')}/${resolvedTarget.host}${resolvedTarget.pathname}${resolvedTarget.search}`;
  const redirectUrl = new URL(newProxyPath, clientReqUrl.origin);

  const headers = new Headers();
  headers.set('Location', redirectUrl.href);
  return new Response(null, { status: upstreamResponse.status, headers });
}

// -----------------------------------------------------------------------------
// HEADER PROCESSING & CORS SANITIZATION
// -----------------------------------------------------------------------------

function cleanAndBuildRequestHeaders(request, targetUrl) {
  const headers = new Headers(request.headers);

  // Strip Hop-by-Hop & Cloudflare internal headers
  const hopHeaders = [
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker',
    'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
    'cdn-loop', 'x-amzn-trace-id'
  ];
  hopHeaders.forEach(h => headers.delete(h));

  // Spoof destination host attributes
  headers.set('Host', targetUrl.host);
  headers.set('Origin', targetUrl.origin);
  headers.set('Referer', targetUrl.href);

  // Enforce byte ranges for video seeks
  if (!headers.has('Accept-Encoding')) {
    headers.set('Accept-Encoding', 'identity');
  }

  return headers;
}

function buildResponseHeaders(upstreamResponse, request, targetUrl) {
  const headers = new Headers(upstreamResponse.headers);

  // Apply Permissive, Spec-Compliant CORS
  const origin = request.headers.get('Origin');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Expose-Headers', '*');

  // Strip restrictive security headers that prevent iframe/media integration
  headers.delete('Content-Security-Policy');
  headers.delete('Content-Security-Policy-Report-Only');
  headers.delete('X-Frame-Options');
  headers.delete('Cross-Origin-Opener-Policy');
  headers.delete('Cross-Origin-Embedder-Policy');
  headers.delete('Cross-Origin-Resource-Policy');

  // Cookie Domain Rewriting to preserve sessions
  if (headers.has('set-cookie')) {
    const rawCookies = headers.getSetCookie();
    headers.delete('set-cookie');
    for (const cookie of rawCookies) {
      const rewritten = cookie
        .replace(/Domain=[^;]+;?/gi, '')
        .replace(/Path=[^;]+;?/gi, 'Path=/;')
        .replace(/SameSite=Strict;?/gi, 'SameSite=None; Secure;');
      headers.append('set-cookie', rewritten);
    }
  }

  // Preserve streaming metadata headers
  // (Content-Range, Accept-Ranges, Content-Length are left intact automatically)

  return headers;
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    ...(origin ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
  };
}

function handleCorsPreflight(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

// -----------------------------------------------------------------------------
// WEBSOCKET FORWARDER
// -----------------------------------------------------------------------------

function forwardWebSocket(request, targetUrl) {
  const wsHeaders = new Headers(request.headers);
  wsHeaders.set('Host', targetUrl.host);
  wsHeaders.set('Origin', targetUrl.origin);

  return fetch(targetUrl.href, {
    method: request.method,
    headers: wsHeaders
  });
}

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

function isAdBlocked(hostname) {
  return AD_PATTERNS.some(p => p.test(hostname));
}

function serveLandingPage(reqUrl) {
  const demoUrl = `${reqUrl.origin}${PREFIX}https/dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd`;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>High-Throughput Gateway</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; color: #111; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; word-break: break-all; }
    input { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; margin: 1rem 0; font-size: 1rem; }
    button { background: #0066cc; color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; }
  </style>
</head>
<body>
  <h2>Streaming Edge Bridge</h2>
  <p>To proxy resources and stream media natively, prefix target URLs as follows:</p>
  <code>${reqUrl.origin}${PREFIX}https/{domain}/{path}</code>
  
  <form onsubmit="event.preventDefault(); navigate();">
    <input type="text" id="target" placeholder="https://example.com/stream.m3u8" required />
    <button type="submit">Open Bridge</button>
  </form>

  <script>
    function navigate() {
      let raw = document.getElementById('target').value.trim();
      if (!raw.startsWith('http://') && !raw.startsWith('https://')) raw = 'https://' + raw;
      const parsed = new URL(raw);
      const scheme = parsed.protocol.replace(':', '');
      window.location.href = '${PREFIX}' + scheme + '/' + parsed.host + parsed.pathname + parsed.search;
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
