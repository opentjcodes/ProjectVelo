export default {
  async fetch(request, env, ctx) {
    return await handleProxy(request);
  }
};

// The prefix used to route requests through the proxy
const PROXY_PREFIX = '/_/';

// Minimal, high-speed tracker blocking (Substring match is 10x faster than Regex)
const BLOCKED_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'adservice.google', 
  'adnxs.com', 'criteo.com', 'taboola.com', 'outbrain.com'
];

async function handleProxy(request) {
  const reqUrl = new URL(request.url);
  const proxyOrigin = reqUrl.origin;

  // 1. Instant CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 2. High-Speed Routing & Target Resolution
  let targetUrlStr = '';

  if (reqUrl.pathname.startsWith(PROXY_PREFIX)) {
    // Explicit proxy request: /_/https://example.com/path
    targetUrlStr = reqUrl.pathname.slice(PROXY_PREFIX.length) + reqUrl.search;
    targetUrlStr = targetUrlStr.replace(/^(https?):\/+/, '$1://'); // Fix normalized slashes
  } else {
    // Implicit asset request (e.g., /assets/style.css) -> Reconstruct via Referer
    const referer = request.headers.get('Referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (refUrl.pathname.startsWith(PROXY_PREFIX)) {
          const baseTargetStr = refUrl.pathname.slice(PROXY_PREFIX.length).replace(/^(https?):\/+/, '$1://');
          const baseUrl = new URL(baseTargetStr);
          targetUrlStr = new URL(reqUrl.pathname + reqUrl.search, baseUrl).href;
        }
      } catch (e) {}
    }
  }

  // 3. Fallback UI if no URL is provided
  if (!targetUrlStr || !targetUrlStr.startsWith('http')) {
    if (reqUrl.searchParams.has('url')) {
      targetUrlStr = reqUrl.searchParams.get('url');
    } else {
      return new Response(homePageUI(proxyOrigin + PROXY_PREFIX), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }
  }

  const targetUrl = new URL(targetUrlStr);

  // Fast Ad-Block Check
  if (BLOCKED_DOMAINS.some(d => targetUrl.hostname.includes(d))) {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // 4. Header Construction (The "Bridge")
  const proxyHeaders = new Headers(request.headers);
  
  // Strip Cloudflare hop-by-hop headers to prevent detection
  const hopHeaders = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto', 'x-forwarded-host', 'x-real-ip'];
  hopHeaders.forEach(h => proxyHeaders.delete(h));

  // Spoof identity to match target
  proxyHeaders.set('Host', targetUrl.host);
  proxyHeaders.set('Origin', targetUrl.origin);
  proxyHeaders.set('Referer', targetUrl.href);

  // 5. Execute Request (Native Streaming & WebSockets)
  const fetchInit = {
    method: request.method,
    headers: proxyHeaders,
    redirect: 'manual'
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    fetchInit.body = request.body;
    fetchInit.duplex = 'half';
  }

  const response = await fetch(targetUrl.href, fetchInit);

  // 6. Handle Redirects Natively
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('Location');
    if (location) {
      const absLocation = new URL(location, targetUrl.href).href;
      return Response.redirect(`${proxyOrigin}${PROXY_PREFIX}${absLocation}`, response.status);
    }
  }

  // 7. Response Sanitization
  const resHeaders = new Headers(response.headers);
  resHeaders.set('Access-Control-Allow-Origin', '*');
  resHeaders.delete('X-Frame-Options');
  resHeaders.delete('Content-Security-Policy');
  resHeaders.delete('Content-Security-Policy-Report-Only');
  resHeaders.delete('Clear-Site-Data');

  // Rewrite Cookies to stick to the proxy session
  if (resHeaders.has('set-cookie')) {
    const cookies = resHeaders.getSetCookie();
    resHeaders.delete('set-cookie');
    for (const cookie of cookies) {
      const rewritten = cookie
        .replace(/Domain=[^;]+;?/gi, '')
        .replace(/Path=[^;]+;?/gi, 'Path=/;')
        .replace(/SameSite=Strict;?/gi, 'SameSite=None; Secure;');
      resHeaders.append('set-cookie', rewritten);
    }
  }

  // 8. ZERO-COPY PIPELINE FOR VIDEO & MEDIA
  // If it's not HTML, pipe it directly to the user. This fixes the slow video streaming.
  const contentType = (resHeaders.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html')) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders
    });
  }

  // 9. Ultra-Fast HTML Injection (Only rewrites absolute URLs, ignores relative)
  return rewriteHTML(response, resHeaders, targetUrl.href, proxyOrigin + PROXY_PREFIX);
}

// ---------------------------------------------------------------------------
// HIGH-SPEED HTML REWRITER & CLIENT SANDBOX
// ---------------------------------------------------------------------------
function rewriteHTML(response, headers, targetUrl, proxyPrefix) {
  class FastAbsoluteRewriter {
    constructor(attr) { this.attr = attr; }
    element(el) {
      const val = el.getAttribute(this.attr);
      // Only rewrite absolute URLs. Relative URLs are handled natively by the browser + Referer fallback!
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        el.setAttribute(this.attr, proxyPrefix + val);
      } else if (val && val.startsWith('//')) {
        el.setAttribute(this.attr, proxyPrefix + 'https:' + val);
      }
    }
  }

  class HeadInjector {
    element(el) {
      // Inject a lightweight client-side interceptor
      el.prepend(`
        <script>
          (function() {
            const prefix = "${proxyPrefix}";
            function rewrite(u) {
              if (!u || typeof u !== 'string') return u;
              if (u.startsWith(prefix)) return u;
              if (u.startsWith('http://') || u.startsWith('https://')) return prefix + u;
              if (u.startsWith('//')) return prefix + window.location.protocol + u;
              return u;
            }

            // Intercept Fetch API
            const origFetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') input = rewrite(input);
              else if (input instanceof Request) input = new Request(rewrite(input.url), input);
              else if (input instanceof URL) input = rewrite(input.href);
              return origFetch.call(this, input, init);
            };

            // Intercept XHR
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
              return origOpen.call(this, method, rewrite(url), ...rest);
            };

            // Intercept WebSockets
            const OrigWS = window.WebSocket;
            window.WebSocket = function(url, protocols) {
              let proxied = url;
              if (typeof url === 'string' && (url.startsWith('ws://') || url.startsWith('wss://'))) {
                proxied = rewrite(url.replace(/^ws/, 'http')).replace(/^http/, 'ws');
              }
              return protocols ? new OrigWS(proxied, protocols) : new OrigWS(proxied);
            };
            window.WebSocket.prototype = OrigWS.prototype;

            // Intercept History API to keep navigation inside proxy
            const origPush = history.pushState;
            history.pushState = function(state, title, url) {
              if (url) url = rewrite(url);
              return origPush.call(this, state, title, url);
            };
          })();
        </script>
      `, { html: true });
    }
  }

  return new HTMLRewriter()
    .on('head', new HeadInjector())
    .on('a', new FastAbsoluteRewriter('href'))
    .on('link', new FastAbsoluteRewriter('href'))
    .on('img', new FastAbsoluteRewriter('src'))
    .on('script', new FastAbsoluteRewriter('src'))
    .on('iframe', new FastAbsoluteRewriter('src'))
    .on('source', new FastAbsoluteRewriter('src'))
    .on('video', new FastAbsoluteRewriter('src'))
    .on('form', new FastAbsoluteRewriter('action'))
    .transform(new Response(response.body, { status: response.status, headers }));
}

// ---------------------------------------------------------------------------
// MINIMAL UI FOR ROOT ACCESS
// ---------------------------------------------------------------------------
function homePageUI(proxyPrefix) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Edge Proxy</title>
      <style>
        body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; color: #fff; margin: 0; }
        .container { text-align: center; background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        input { padding: 12px; width: 300px; border-radius: 6px; border: none; outline: none; font-size: 16px; }
        button { padding: 12px 20px; margin-left: 8px; border: none; border-radius: 6px; background: #3b82f6; color: white; font-size: 16px; cursor: pointer; transition: 0.2s; }
        button:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🌐 Edge Proxy</h2>
        <form onsubmit="event.preventDefault(); window.location.href = '${proxyPrefix}' + document.getElementById('url').value;">
          <input type="url" id="url" placeholder="https://example.com" required>
          <button type="submit">Go</button>
        </form>
      </div>
    </body>
    </html>
  `;
}
