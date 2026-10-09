/**
 * Ultra-Fast High-Concurrency Streaming Web Gateway for Cloudflare Workers
 */

export default {
  async fetch(request, env, ctx) {
    return await handleGateway(request);
  }
};

// ---------------------------------------------------------------------------
// 1. AD-BLOCKING & TELEMETRY SHIELD
// ---------------------------------------------------------------------------
const AD_PATTERNS = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)googleadservices\.com$/i,
  /(^|\.)adservice\.google\./i,
  /(^|\.)adnxs\.com$/i,
  /(^|\.)advertising\.com$/i,
  /(^|\.)criteo\.(com|net)$/i,
  /(^|\.)outbrain\.com$/i,
  /(^|\.)taboola\.com$/i,
  /(^|\.)scorecardresearch\.com$/i,
  /(^|\.)amazon-adsystem\.com$/i,
  /(^|\.)pubmatic\.com$/i,
  /(^|\.)rubiconproject\.com$/i,
  /(^|\.)moatads\.com$/i,
  /(^|\.)imasdk\.googleapis\.com$/i,
  /(^|\.)pagead2\.googlesyndication\.com$/i,
  /(^|\.)hotjar\.com$/i,
  /(^|\.)clarity\.ms$/i
];

function isBlocked(urlStr) {
  try {
    const host = new URL(urlStr).hostname;
    return AD_PATTERNS.some(p => p.test(host));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. ROUTING & TARGET EXTRACTION ENGINE
// ---------------------------------------------------------------------------
function extractTarget(request) {
  const reqUrl = new URL(request.url);

  // Mode 1: Path Prefix -> /p/https://example.com/... or /p/http://...
  if (reqUrl.pathname.startsWith('/p/')) {
    const raw = reqUrl.pathname.slice(3) + reqUrl.search;
    return normalizeUrl(raw);
  }

  // Mode 2: Direct Protocol Path -> /https://example.com/...
  const matchDirect = reqUrl.pathname.match(/^\/(https?:\/?.+)/i);
  if (matchDirect) {
    return normalizeUrl(matchDirect[1] + reqUrl.search);
  }

  // Mode 3: Query Parameter -> ?url=https://example.com
  const qUrl = reqUrl.searchParams.get('url');
  if (qUrl) {
    return normalizeUrl(qUrl);
  }

  // Mode 4: Transparent Sub-resource Referer Fallback
  // (Fixes relative assets requested directly like /style.css or /chunk.js)
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      const refUrl = new URL(referer);
      let refTarget = null;

      if (refUrl.pathname.startsWith('/p/')) {
        refTarget = refUrl.pathname.slice(3) + refUrl.search;
      } else if (refUrl.searchParams.has('url')) {
        refTarget = refUrl.searchParams.get('url');
      }

      if (refTarget) {
        const baseTarget = new URL(normalizeUrl(refTarget));
        return new URL(reqUrl.pathname + reqUrl.search, baseTarget.origin).href;
      }
    } catch (_) {}
  }

  // Mode 5: Cookie Session Target Fallback
  const cookie = request.headers.get('Cookie') || '';
  const sessionMatch = cookie.match(/(?:^|;\s*)__pw_target=([^;]+)/);
  if (sessionMatch && reqUrl.pathname !== '/') {
    try {
      const sessionOrigin = decodeURIComponent(sessionMatch[1]);
      return new URL(reqUrl.pathname + reqUrl.search, sessionOrigin).href;
    } catch (_) {}
  }

  return null;
}

function normalizeUrl(u) {
  if (!u) return null;
  u = decodeURIComponent(u);
  u = u.replace(/^(https?:\/)(?!\/)/i, '$1/'); // fix single slash
  if (!/^https?:\/\//i.test(u)) {
    // If not a URL, resolve as a web search
    if (!u.includes('.') || u.includes(' ')) {
      return `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    }
    u = 'https://' + u;
  }
  return u;
}

// ---------------------------------------------------------------------------
// 3. CORE GATEWAY HANDLER
// ---------------------------------------------------------------------------
async function handleGateway(request) {
  const reqUrl = new URL(request.url);

  // A. Instant CORS Preflight Resolution
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

  const targetUrl = extractTarget(request);

  // B. Serve Landing Dashboard if visiting the root without a target
  if (!targetUrl) {
    if (reqUrl.pathname === '/') {
      return renderDashboard(reqUrl.origin);
    }
    return new Response('404 Target Not Found', { status: 404 });
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response('Malformed Target URL', { status: 400 });
  }

  // C. Edge Ad & Telemetry Blocker
  if (isBlocked(parsedTarget.href)) {
    if (parsedTarget.pathname.endsWith('.js') || request.headers.get('Sec-Fetch-Dest') === 'script') {
      return new Response('/* [Gateway] Ad blocked */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' }
      });
    }
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // D. WebSocket Direct Passthrough
  const isWs = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
  if (isWs) {
    const wsHeaders = new Headers(request.headers);
    wsHeaders.set('Host', parsedTarget.host);
    wsHeaders.set('Origin', parsedTarget.origin);
    return fetch(parsedTarget.href, {
      method: request.method,
      headers: wsHeaders
    });
  }

  // E. Header Spoofing & Fingerprint Emulation
  const proxyHeaders = new Headers(request.headers);

  // Strip cloud & internal hop headers
  const hopHeaders = [
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker',
    'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
    'cdn-loop', 'x-amzn-trace-id'
  ];
  hopHeaders.forEach(h => proxyHeaders.delete(h));

  // Set destination headers
  proxyHeaders.set('Host', parsedTarget.host);
  proxyHeaders.set('Origin', parsedTarget.origin);
  proxyHeaders.set('Referer', parsedTarget.href);

  // Video Streaming Optimization: Pass through Range headers cleanly
  if (request.headers.has('range')) {
    proxyHeaders.set('Range', request.headers.get('range'));
  }

  // Modern browser UA and Client-Hints
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  proxyHeaders.set('Sec-CH-UA', '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"');
  proxyHeaders.set('Sec-CH-UA-Mobile', '?0');
  proxyHeaders.set('Sec-CH-UA-Platform', '"Windows"');
  proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9');

  // Avoid unsupported compressions (e.g., Zstandard) that could break edge decoders
  proxyHeaders.set('Accept-Encoding', 'gzip, deflate, br');

  // Bypass Google Consent loop wall
  if (parsedTarget.hostname.includes('google.')) {
    let currentCookie = proxyHeaders.get('Cookie') || '';
    if (!currentCookie.includes('CONSENT=')) {
      currentCookie = (currentCookie ? currentCookie + '; ' : '') + 'CONSENT=YES+cb.20230531-04-p0.en+FX+999';
      proxyHeaders.set('Cookie', currentCookie);
    }
  }

  // Clean internal proxy cookie from outgoing request
  const rawCookie = proxyHeaders.get('Cookie') || '';
  const filteredCookie = rawCookie.replace(/(?:^|;\s*)__pw_target=[^;]*/g, '').trim().replace(/^;+|;+$/g, '');
  if (filteredCookie) {
    proxyHeaders.set('Cookie', filteredCookie);
  } else {
    proxyHeaders.delete('Cookie');
  }

  // F. Execute Outbound Fetch
  const fetchInit = {
    method: request.method,
    headers: proxyHeaders,
    redirect: 'manual'
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    fetchInit.body = request.body;
    fetchInit.duplex = 'half';
  }

  const proxyBase = `${reqUrl.origin}/p/`;

  try {
    const response = await fetch(parsedTarget.href, fetchInit);

    // G. Handle HTTP Redirects (301, 302, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const loc = response.headers.get('Location');
      if (loc) {
        const absoluteRedirect = new URL(loc, parsedTarget.href).href;
        return Response.redirect(`${proxyBase}${encodeURIComponent(absoluteRedirect)}`, response.status);
      }
    }

    // H. Response Headers Unlocking
    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    resHeaders.set('Access-Control-Allow-Headers', '*');
    resHeaders.set('Access-Control-Expose-Headers', '*');

    // Strip frame isolation and security policies that break proxies
    resHeaders.delete('X-Frame-Options');
    resHeaders.delete('Content-Security-Policy');
    resHeaders.delete('Content-Security-Policy-Report-Only');
    resHeaders.delete('Cross-Origin-Opener-Policy');
    resHeaders.delete('Cross-Origin-Embedder-Policy');
    resHeaders.delete('Cross-Origin-Resource-Policy');
    resHeaders.delete('Clear-Site-Data');

    // Retain origin memory in cookie for relative resources
    resHeaders.append('Set-Cookie', `__pw_target=${encodeURIComponent(parsedTarget.origin)}; Path=/; SameSite=Lax; Secure`);

    // Rewrite Set-Cookie to work on current domain
    if (resHeaders.has('set-cookie')) {
      const cookies = resHeaders.getSetCookie();
      resHeaders.delete('set-cookie');
      for (const c of cookies) {
        const rewritten = c
          .replace(/Domain=[^;]+;?/gi, '')
          .replace(/Path=[^;]+;?/gi, 'Path=/;')
          .replace(/SameSite=Strict;?/gi, 'SameSite=Lax;');
        resHeaders.append('set-cookie', rewritten);
      }
    }

    // I. ZERO-COPY STREAMING PIPELINE
    // If it's a Video/Audio chunk (206 Partial Content), CSS, JS, Image, or JSON, STREAM DIRECTLY!
    const contentType = (resHeaders.get('Content-Type') || '').toLowerCase();
    const isHtml = response.status === 200 && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'));

    if (!isHtml || response.status === 206) {
      // Ensure Byte-Range seeking is preserved for media
      if (response.headers.has('content-range')) {
        resHeaders.set('Content-Range', response.headers.get('content-range'));
      }
      if (response.headers.has('accept-ranges')) {
        resHeaders.set('Accept-Ranges', response.headers.get('accept-ranges'));
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders
      });
    }

    // J. Process HTML through the lightweight sandbox injector
    return injectSandbox(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders
      }),
      parsedTarget.href,
      proxyBase
    );

  } catch (err) {
    return new Response(`[Gateway Error]: ${err.message}`, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. CLIENT-SIDE SANDBOX INJECTOR (In-Browser Virtual DOM)
// ---------------------------------------------------------------------------
function injectSandbox(response, targetUrl, proxyBase) {
  const targetOrigin = new URL(targetUrl).origin;

  const sandboxScript = `
    <script>
      (() => {
        const PROXY_BASE = ${JSON.stringify(proxyBase)};
        const TARGET_URL = ${JSON.stringify(targetUrl)};
        const TARGET_ORIGIN = ${JSON.stringify(targetOrigin)};

        function qualify(u) {
          if (!u || typeof u !== 'string') return u;
          if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:') || u.startsWith('#')) return u;
          if (u.startsWith(PROXY_BASE)) return u;
          try {
            const abs = new URL(u, TARGET_URL).href;
            return PROXY_BASE + encodeURIComponent(abs);
          } catch (e) {
            return u;
          }
        }

        // 1. Spoof Location & Domain
        try {
          Object.defineProperty(document, 'domain', { get: () => new URL(TARGET_URL).hostname });
        } catch (_) {}

        // 2. Intercept window.fetch
        const nativeFetch = window.fetch;
        window.fetch = function(resource, init) {
          if (typeof resource === 'string') {
            resource = qualify(resource);
          } else if (resource instanceof URL) {
            resource = qualify(resource.href);
          } else if (resource instanceof Request) {
            resource = new Request(qualify(resource.url), resource);
          }
          return nativeFetch.call(this, resource, init);
        };

        // 3. Intercept XMLHttpRequest
        const nativeOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
          return nativeOpen.call(this, method, qualify(url), async !== false, user, pass);
        };

        // 4. Intercept WebSockets
        const NativeWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
          try {
            const parsed = new URL(url, TARGET_URL);
            const scheme = parsed.protocol === 'wss:' ? 'https:' : 'http:';
            const httpUrl = scheme + '//' + parsed.host + parsed.pathname + parsed.search;
            const proxied = new URL(qualify(httpUrl), window.location.href);
            proxied.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            url = proxied.href;
          } catch (_) {}
          return protocols ? new NativeWebSocket(url, protocols) : new NativeWebSocket(url);
        };
        window.WebSocket.prototype = NativeWebSocket.prototype;

        // 5. Intercept SSE (Server-Sent Events)
        if (window.EventSource) {
          const NativeEventSource = window.EventSource;
          window.EventSource = function(url, cfg) {
            return new NativeEventSource(qualify(url), cfg);
          };
          window.EventSource.prototype = NativeEventSource.prototype;
        }

        // 6. Intercept History pushState & replaceState
        const nativePush = history.pushState;
        history.pushState = function(state, title, url) {
          if (url) {
            try {
              arguments[2] = PROXY_BASE + encodeURIComponent(new URL(url, TARGET_URL).href);
            } catch (_) {}
          }
          return nativePush.apply(this, arguments);
        };

        const nativeReplace = history.replaceState;
        history.replaceState = function(state, title, url) {
          if (url) {
            try {
              arguments[2] = PROXY_BASE + encodeURIComponent(new URL(url, TARGET_URL).href);
            } catch (_) {}
          }
          return nativeReplace.apply(this, arguments);
        };

        // 7. Prevent popups from breaking the proxy
        window.open = function(url) {
          if (url) window.location.href = qualify(url);
          return window;
        };

        // 8. Gracefully disable ServiceWorker registration
        if (navigator.serviceWorker) {
          navigator.serviceWorker.register = () => Promise.reject(new Error('[Gateway] ServiceWorker disabled.'));
        }

        // 9. Intercept Links & Navigation
        document.addEventListener('click', e => {
          const a = e.target.closest('a');
          if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
            e.preventDefault();
            window.location.href = qualify(a.getAttribute('href') || a.href);
          }
        }, true);

        // 10. Intercept Form Submissions
        document.addEventListener('submit', e => {
          const form = e.target;
          if (form.action) {
            e.preventDefault();
            const fullAction = new URL(form.getAttribute('action') || '', TARGET_URL);
            if ((form.method || 'get').toLowerCase() === 'get') {
              const data = new FormData(form);
              const params = new URLSearchParams(data);
              fullAction.search = params.toString();
              window.location.href = qualify(fullAction.href);
            } else {
              form.action = qualify(fullAction.href);
              form.submit();
            }
          }
        }, true);
      })();
    </script>
    <style>
      /* Cosmetic Ad Blocker */
      .adsbygoogle, [id*="-ad-"], [class*="ad-unit"], [class*="advertisement"],
      div[id*="google_ads"], div[data-ad], .video-ad-overlay {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
      }
    </style>
  `;

  class HeadRewriter {
    element(element) {
      element.prepend(sandboxScript, { html: true });
    }
  }

  class MetaStripper {
    element(element) {
      const httpEquiv = (element.getAttribute('http-equiv') || '').toLowerCase();
      if (httpEquiv === 'content-security-policy') {
        element.remove();
      }
    }
  }

  // Stream HTML modifications without buffering the whole response
  return new HTMLRewriter()
    .on('head', new HeadRewriter())
    .on('meta', new MetaStripper())
    .transform(response);
}

// ---------------------------------------------------------------------------
// 5. NATIVE CLIENT DASHBOARD
// ---------------------------------------------------------------------------
function renderDashboard(origin) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edge Gateway</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card: #151d30;
      --accent: #3b82f6;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 680px;
      text-align: center;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #60a5fa, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p { color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; }
    .search-box {
      display: flex;
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 1.1rem;
      padding: 12px 16px;
    }
    button {
      background: var(--accent);
      color: #fff;
      border: none;
      outline: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .badges {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }
    .badge {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .shortcuts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-top: 2rem;
    }
    .shortcut-card {
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 14px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text);
      font-weight: 500;
      transition: transform 0.2s, border-color 0.2s;
    }
    .shortcut-card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Web Gateway</h1>
    <p>Zero-Copy Stream Pipeline • Full CORS Bypass • Built-in Ad Shield</p>
    <form class="search-box" onsubmit="go(event)">
      <input type="text" id="target" placeholder="Enter full URL or search query..." autofocus required />
      <button type="submit">Launch</button>
    </form>
    <div class="badges">
      <span class="badge">⚡ Zero-Copy Range Streaming</span>
      <span class="badge">🛡️ Ad & Tracker Shield</span>
      <span class="badge">🌐 WebSocket & SSE Active</span>
    </div>
    <div class="shortcuts">
      <a class="shortcut-card" href="/p/https://www.google.com">Google</a>
      <a class="shortcut-card" href="/p/https://www.youtube.com">YouTube</a>
      <a class="shortcut-card" href="/p/https://en.wikipedia.org">Wikipedia</a>
      <a class="shortcut-card" href="/p/https://github.com">GitHub</a>
    </div>
  </div>
  <script>
    function go(e) {
      e.preventDefault();
      const val = document.getElementById('target').value.trim();
      if (!val) return;
      window.location.href = '/p/' + encodeURIComponent(val);
    }
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
}
