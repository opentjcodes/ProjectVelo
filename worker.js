export default {
  async fetch(request, env, ctx) {
    return await handleProxy(request);
  }
};

// ---------------------------------------------------------------------------
// 1. NETWORK-LEVEL AD & TRACKER BLOCKING
// ---------------------------------------------------------------------------
const AD_DOMAINS = [
  'doubleclick.net', 'google-analytics.com', 'googlesyndication.com',
  'googleadservices.com', 'adservice.google.com', 'adnxs.com',
  'advertising.com', 'criteo.com', 'outbrain.com', 'taboola.com',
  'scorecardresearch.com', 'amazon-adsystem.com', 'pubmatic.com',
  'rubiconproject.com', 'moatads.com', 'imasdk.googleapis.com',
  'pagead2.googlesyndication.com', 'quantserve.com', 'adtechus.com',
  'tracking.epicgames.com', 'analytics.tiktok.com', 'ads.linkedin.com'
];

function isBlocked(urlStr) {
  try {
    const hostname = new URL(urlStr).hostname;
    return AD_DOMAINS.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. CORE PROXY ENGINE (The "Bridge")
// ---------------------------------------------------------------------------
async function handleProxy(request) {
  const reqUrl = new URL(request.url);
  
  // A. Immediate CORS Preflight Resolution
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

  let targetUrlStr = reqUrl.searchParams.get('url');

  // B. SMART ASSET RECOVERY (Fixes broken CSS/JS/Images natively)
  // If a site requests a relative file (e.g., /style.css), it won't have ?url=
  // We recover the intended destination using the Referer header.
  if (!targetUrlStr) {
    const referer = request.headers.get('Referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const refTarget = refUrl.searchParams.get('url');
        if (refTarget) {
          // Reconstruct the broken path against the original target URL
          const resolvedUrl = new URL(reqUrl.pathname + reqUrl.search, refTarget).href;
          return Response.redirect(reqUrl.origin + '/?url=' + encodeURIComponent(resolvedUrl), 302);
        }
      } catch (e) {}
    }
    
    // Default Landing Page
    return new Response(
      `<html>
        <head><title>Proxy Bridge</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #111; color: #fff;">
          <form style="background: #222; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <h2 style="margin-top: 0;">Proxy Bridge</h2>
            <input name="url" placeholder="https://example.com" type="url" required style="width: 300px; padding: 10px; border-radius: 6px; border: 1px solid #444; background: #111; color: #fff; margin-right: 10px;" />
            <button style="padding: 10px 20px; border-radius: 6px; border: none; background: #007bff; color: #fff; cursor: pointer;">Go</button>
          </form>
        </body>
      </html>`, 
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!targetUrlStr.startsWith('http')) {
    targetUrlStr = 'https://' + targetUrlStr;
  }

  // C. Block Ads at the Network Level (Saves Bandwidth)
  if (isBlocked(targetUrlStr)) {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch {
    return new Response('Invalid Target URL', { status: 400 });
  }

  // D. Header Spoofing & Proxy Preparation
  const proxyHeaders = new Headers(request.headers);
  
  // Strip Cloudflare specific headers to avoid detection
  const hopHeaders = [
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker',
    'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
    'cdn-loop'
  ];
  hopHeaders.forEach(h => proxyHeaders.delete(h));

  // Spoof essential headers to match the target
  proxyHeaders.set('Host', targetUrl.host);
  proxyHeaders.set('Origin', targetUrl.origin);
  proxyHeaders.set('Referer', targetUrl.href);

  // Emulate a standard desktop browser if not already set
  const ua = proxyHeaders.get('User-Agent') || '';
  if (!ua.includes('Mozilla')) {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  }

  const fetchInit = {
    method: request.method,
    headers: proxyHeaders,
    redirect: 'manual'
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    fetchInit.body = request.body;
    fetchInit.duplex = 'half';
  }

  try {
    // E. DIRECT STREAMING FETCH
    const response = await fetch(targetUrl.href, fetchInit);

    // Handle Redirects natively
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, targetUrl.href).href;
        return Response.redirect(reqUrl.origin + '/?url=' + encodeURIComponent(absLocation), response.status);
      }
    }

    const responseHeaders = new Headers(response.headers);
    
    // Unlock CORS completely
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Allow-Methods', '*');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');
    
    // Strip security headers that prevent embedding/proxying
    const secHeaders = [
      'Content-Security-Policy', 'Content-Security-Policy-Report-Only',
      'X-Frame-Options', 'Cross-Origin-Opener-Policy',
      'Cross-Origin-Embedder-Policy', 'Cross-Origin-Resource-Policy',
      'Clear-Site-Data'
    ];
    secHeaders.forEach(h => responseHeaders.delete(h));

    // Rewrite Cookies to work on the proxy domain
    if (responseHeaders.has('set-cookie')) {
      const cookies = responseHeaders.getSetCookie();
      responseHeaders.delete('set-cookie');
      for (const cookie of cookies) {
        const rewritten = cookie
          .replace(/Domain=[^;]+;?/gi, '')
          .replace(/Path=[^;]+;?/gi, 'Path=/;')
          .replace(/SameSite=(Strict|Lax);?/gi, 'SameSite=None; Secure;');
        responseHeaders.append('set-cookie', rewritten);
      }
    }

    const contentType = (responseHeaders.get('content-type') || '').toLowerCase();

    // F. ZERO-COPY STREAMING FOR MEDIA & APIS (Fixes Video Streaming)
    // If it's a video, audio, image, or API response, DO NOT parse it.
    // Stream it directly to the client.
    if (!contentType.includes('text/html')) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

    // G. HTML REWRITING (Streaming Parser)
    return rewriteHTML(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      }),
      targetUrl.href,
      reqUrl.origin
    );

  } catch (err) {
    return new Response(`Proxy Bridge Error: ${err.message}`, { status: 502 });
  }
}

// ---------------------------------------------------------------------------
// 3. STREAMING HTML REWRITER & CLIENT SANDBOX
// ---------------------------------------------------------------------------
function rewriteHTML(response, targetUrl, proxyOrigin) {
  const proxyBase = proxyOrigin + '/?url=';

  function toProxy(urlStr) {
    if (!urlStr || urlStr.startsWith('data:') || urlStr.startsWith('javascript:') || urlStr.startsWith('#')) return urlStr;
    try {
      const absUrl = new URL(urlStr, targetUrl).href;
      return proxyBase + encodeURIComponent(absUrl);
    } catch {
      return urlStr;
    }
  }

  class AttributeRewriter {
    constructor(attr) { this.attr = attr; }
    element(element) {
      if (element.hasAttribute('integrity')) element.removeAttribute('integrity');
      if (element.hasAttribute('nonce')) element.removeAttribute('nonce');
      
      const val = element.getAttribute(this.attr);
      if (val) {
        element.setAttribute(this.attr, toProxy(val));
      }
    }
  }

  class SrcsetRewriter {
    element(element) {
      const srcset = element.getAttribute('srcset');
      if (!srcset) return;
      const rewritten = srcset.split(',').map(entry => {
        const parts = entry.trim().split(/\s+/);
        if (parts[0]) parts[0] = toProxy(parts[0]);
        return parts.join(' ');
      }).join(', ');
      element.setAttribute('srcset', rewritten);
    }
  }

  class FormRewriter {
    element(element) {
      const action = element.getAttribute('action');
      if (action) {
        element.setAttribute('action', toProxy(action));
      }
      element.setAttribute('target', '_self');
    }
  }

  class HeadInjector {
    element(element) {
      const script = `
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            const targetUrl = "${targetUrl}";
            
            function toProxy(u) {
              if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:')) return u;
              try {
                const abs = new URL(u, targetUrl).href;
                return proxyBase + encodeURIComponent(abs);
              } catch (e) { return u; }
            }

            // Intercept Fetch API
            const origFetch = window.fetch;
            window.fetch = async function(input, init) {
              if (typeof input === 'string') input = toProxy(input);
              else if (input instanceof URL) input = toProxy(input.href);
              else if (input instanceof Request) input = new Request(toProxy(input.url), input);
              return origFetch.call(this, input, init);
            };

            // Intercept XHR
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
              return origOpen.call(this, method, toProxy(url), ...rest);
            };

            // Intercept WebSockets
            const OrigWS = window.WebSocket;
            window.WebSocket = function(url, protocols) {
              try {
                const parsed = new URL(url, targetUrl);
                const httpUrl = (parsed.protocol === 'wss:' ? 'https:' : 'http:') + '//' + parsed.host + parsed.pathname + parsed.search;
                const proxied = new URL(toProxy(httpUrl));
                proxied.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                url = proxied.href;
              } catch(e) {}
              return protocols ? new OrigWS(url, protocols) : new OrigWS(url);
            };

            // Intercept History API (Prevents URL bar from breaking proxy)
            const origPush = history.pushState;
            history.pushState = function(state, title, url) {
              if (url) arguments[2] = toProxy(url);
              return origPush.apply(this, arguments);
            };
            const origReplace = history.replaceState;
            history.replaceState = function(state, title, url) {
              if (url) arguments[2] = toProxy(url);
              return origReplace.apply(this, arguments);
            };

            // Intercept window.open
            const origOpenWin = window.open;
            window.open = function(url, target, features) {
              if (url) url = toProxy(url);
              return origOpenWin.call(this, url, target, features);
            };
          })();
        </script>
        <style>
          /* Aggressive Ad & Tracker Hiding */
          .adsbygoogle, [id*="-ad-"], [class*="ad-unit"], [class*="advertisement"],
          div[id^="google_ads"], div[data-ad], .video-ad-overlay, iframe[src*="ads"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            pointer-events: none !important;
          }
        </style>
      `;
      element.prepend(script, { html: true });
    }
  }

  return new HTMLRewriter()
    .on('head', new HeadInjector())
    .on('a', new AttributeRewriter('href'))
    .on('link', new AttributeRewriter('href'))
    .on('script', new AttributeRewriter('src'))
    .on('img', new AttributeRewriter('src'))
    .on('img', new SrcsetRewriter())
    .on('source', new AttributeRewriter('src'))
    .on('source', new SrcsetRewriter())
    .on('video', new AttributeRewriter('src'))
    .on('video', new AttributeRewriter('poster'))
    .on('audio', new AttributeRewriter('src'))
    .on('iframe', new AttributeRewriter('src'))
    .on('form', new FormRewriter())
    .transform(response);
}
