export default {
  async fetch(request, env, ctx) {
    return await handleProxy(request);
  }
};

// ---------------------------------------------------------------------------
// 1. AD-BLOCKING & TELEMETRY ENGINE
// ---------------------------------------------------------------------------
const AD_DOMAINS = [
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
  /(^|\.)pagead2\.googlesyndication\.com$/i
];

function isBlocked(url) {
  try {
    const host = new URL(url).hostname;
    return AD_DOMAINS.some(p => p.test(host));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. CORE GATEWAY HANDLER
// ---------------------------------------------------------------------------
async function handleProxy(request) {
  const reqUrl = new URL(request.url);
  const proxyBase = reqUrl.origin + reqUrl.pathname + '?url=';
  let query = reqUrl.searchParams.get('url');

  // A. Immediate CORS Preflight resolution
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // B. Retrieve host context from persistent proxy cookie
  const cookieHeader = request.headers.get('Cookie') || '';
  const lastOriginMatch = cookieHeader.match(/(?:^|;\s*)__proxy_host=([^;]+)/);
  const lastKnownOrigin = lastOriginMatch ? decodeURIComponent(lastOriginMatch[1]) : null;

  // C. Fallback routing if ?url= is missing
  if (!query) {
    const referer = request.headers.get('Referer');
    if (referer && referer.includes('?url=')) {
      try {
        const refUrl = new URL(referer);
        const refTarget = new URL(refUrl.searchParams.get('url'));
        const reconstructedUrl = refTarget.origin + reqUrl.pathname + reqUrl.search;
        return Response.redirect(proxyBase + encodeURIComponent(reconstructedUrl), 302);
      } catch (e) {}
    }

    if (lastKnownOrigin && reqUrl.pathname !== '/') {
      const reconstructedUrl = lastKnownOrigin + reqUrl.pathname + reqUrl.search;
      return Response.redirect(proxyBase + encodeURIComponent(reconstructedUrl), 302);
    }

    query = 'https://www.bing.com/';
  }

  // D. Recursive loop unwrapping (prevents Worker calling itself -> Error 1042)
  let targetUrl = query.startsWith('http') ? query : 'https://' + query;
  if (!isUrl(query)) {
    targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
  }

  let parsedTargetUrl;
  try {
    parsedTargetUrl = new URL(targetUrl);
    
    // Unwrap nested ?url= parameters
    while (parsedTargetUrl.hostname === reqUrl.hostname && parsedTargetUrl.searchParams.has('url')) {
      parsedTargetUrl = new URL(parsedTargetUrl.searchParams.get('url'));
    }

    // Guard against self-referential subrequests
    if (parsedTargetUrl.hostname === reqUrl.hostname) {
      if (lastKnownOrigin) {
        parsedTargetUrl = new URL(lastKnownOrigin + parsedTargetUrl.pathname + parsedTargetUrl.search);
      } else {
        return Response.redirect(proxyBase + encodeURIComponent('https://www.bing.com/'), 302);
      }
    }
  } catch {
    return new Response('Malformed Target URL', { status: 400 });
  }

  // Filter known trackers and ad providers
  if (isBlocked(parsedTargetUrl.href)) {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // ---------------------------------------------------------------------------
  // 3. WEBSOCKET PASSTHROUGH (For Live Chat & Streaming)
  // ---------------------------------------------------------------------------
  const isWs = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
  if (isWs) {
    const wsHeaders = new Headers(request.headers);
    wsHeaders.set('Host', parsedTargetUrl.host);
    wsHeaders.set('Origin', parsedTargetUrl.origin);
    return fetch(parsedTargetUrl.href, {
      method: request.method,
      headers: wsHeaders
    });
  }

  // ---------------------------------------------------------------------------
  // 4. HEADER PRESERVATION & SPOOFING (Fixes Chatbot Authentication & CSRF)
  // ---------------------------------------------------------------------------
  // Retain all inbound headers (Authorization, Accept, etc.)
  const proxyHeaders = new Headers(request.headers);

  // Strip Cloudflare / edge hop headers
  const hopHeaders = [
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker',
    'x-real-ip', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
    'cdn-loop', 'x-amzn-trace-id'
  ];
  hopHeaders.forEach(h => proxyHeaders.delete(h));

  // Spoof Host, Origin, and Referer to match destination origin
  proxyHeaders.set('Host', parsedTargetUrl.host);
  proxyHeaders.set('Origin', parsedTargetUrl.origin);
  proxyHeaders.set('Referer', parsedTargetUrl.href);

  // Client emulation
  const clientUa = request.headers.get('User-Agent') || '';
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(clientUa);
  if (isMobile) {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0');
    proxyHeaders.set('Sec-CH-UA-Mobile', '?1');
    proxyHeaders.set('Sec-CH-UA-Platform', '"Android"');
  } else {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    proxyHeaders.set('Sec-CH-UA-Mobile', '?0');
    proxyHeaders.set('Sec-CH-UA-Platform', '"Windows"');
  }

  // Sanitize incoming cookies (remove internal tracking cookie)
  const incomingCookie = request.headers.get('Cookie') || '';
  const cleanedCookie = incomingCookie.replace(/(?:^|;\s*)__proxy_host=[^;]*/g, '').trim().replace(/^;+|;+$/g, '');
  if (cleanedCookie) {
    proxyHeaders.set('Cookie', cleanedCookie);
  } else {
    proxyHeaders.delete('Cookie');
  }

  // Execute Request (enabling half-duplex for request streaming)
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
    const response = await fetch(parsedTargetUrl.href, fetchInit);

    // E. Handle Redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, parsedTargetUrl.href).href;
        return Response.redirect(proxyBase + encodeURIComponent(absLocation), response.status);
      }
    }

    // ---------------------------------------------------------------------------
    // 5. RESPONSE SANITIZATION & CORS UNLOCK
    // ---------------------------------------------------------------------------
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');

    // Strip frame restrictions and security barriers
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Content-Security-Policy-Report-Only');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Cross-Origin-Opener-Policy');
    responseHeaders.delete('Cross-Origin-Embedder-Policy');
    responseHeaders.delete('Cross-Origin-Resource-Policy');

    // Cache current host in session cookie for relative fetches
    responseHeaders.append('Set-Cookie', `__proxy_host=${encodeURIComponent(parsedTargetUrl.origin)}; Path=/; SameSite=None; Secure`);

    // Rewrite Set-Cookie to work on proxy domain
    if (responseHeaders.has('set-cookie')) {
      const cookies = responseHeaders.getSetCookie();
      responseHeaders.delete('set-cookie');
      for (const cookie of cookies) {
        const rewritten = cookie
          .replace(/Domain=[^;]+;?/gi, '')
          .replace(/Path=[^;]+;?/gi, 'Path=/;')
          .replace(/SameSite=Strict;?/gi, 'SameSite=None; Secure;');
        responseHeaders.append('set-cookie', rewritten);
      }
    }

    // ---------------------------------------------------------------------------
    // 6. STREAMING ZERO-COPY PIPELINE
    // ---------------------------------------------------------------------------
    const contentType = (responseHeaders.get('content-type') || '').toLowerCase();
    const isHtml = contentType.includes('text/html');

    // Raw pass-through for SSE (Chatbot typing streams), media chunks, JSON, and WebSockets
    if (!isHtml) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

    // Process and inject client environment into HTML
    return rewriteHTML(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      }),
      parsedTargetUrl.href,
      proxyBase
    );
  } catch (err) {
    return new Response(`Gateway Subrequest Error: ${err.message}`, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// ---------------------------------------------------------------------------
// 7. CLIENT SANDBOX ENGINE (Full API Interception)
// ---------------------------------------------------------------------------
function isUrl(str) {
  if (/\s/.test(str.trim())) return false;
  try {
    const u = new URL(str.startsWith('http') ? str : 'https://' + str);
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

function rewriteHTML(response, targetUrl, proxyBase) {
  class AttributeRewriter {
    constructor(attr) { this.attr = attr; }
    element(element) {
      if (element.hasAttribute('integrity')) element.removeAttribute('integrity');
      if (element.hasAttribute('nonce')) element.removeAttribute('nonce');
      if (element.hasAttribute('target')) element.setAttribute('target', '_self');

      const val = element.getAttribute(this.attr);
      if (val && !val.startsWith('data:') && !val.startsWith('javascript:') && !val.startsWith('#')) {
        try {
          const abs = new URL(val, targetUrl).href;
          element.setAttribute(this.attr, proxyBase + encodeURIComponent(abs));
        } catch {}
      }
    }
  }

  class SrcsetRewriter {
    element(element) {
      const srcset = element.getAttribute('srcset');
      if (!srcset) return;
      const rewritten = srcset
        .split(',')
        .map(entry => {
          const parts = entry.trim().split(/\s+/);
          if (parts[0]) {
            try {
              parts[0] = proxyBase + encodeURIComponent(new URL(parts[0], targetUrl).href);
            } catch {}
          }
          return parts.join(' ');
        })
        .join(', ');
      element.setAttribute('srcset', rewritten);
    }
  }

  class BaseStripper {
    element(element) {
      element.remove();
    }
  }

  class HeadInjector {
    element(element) {
      const sandboxScript = `
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            const targetUrl = "${targetUrl}";
            const targetOrigin = new URL(targetUrl).origin;

            function toProxy(u) {
              if (!u || typeof u !== 'string') return u;
              if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:')) return u;
              try {
                const abs = new URL(u, targetUrl).href;
                if (!abs.startsWith(window.location.origin)) {
                  return proxyBase + encodeURIComponent(abs);
                }
              } catch (e) {}
              return u;
            }

            // A. Mock document origin to fool site checks
            try {
              Object.defineProperty(document, 'domain', { get: () => new URL(targetUrl).hostname });
            } catch(e) {}

            // B. Enforce single tab (prevent breakouts)
            window.open = function(url) {
              if (url) window.location.href = toProxy(url);
              return window;
            };

            try {
              Object.defineProperty(window, 'top', { value: window, writable: false });
              Object.defineProperty(window, 'parent', { value: window, writable: false });
            } catch(e) {}

            // C. Intercept history operations
            const origPush = history.pushState;
            history.pushState = function(state, title, url) {
              if (url) {
                try {
                  arguments[2] = proxyBase + encodeURIComponent(new URL(url, targetUrl).href);
                } catch(e) {}
              }
              return origPush.apply(this, arguments);
            };

            const origReplace = history.replaceState;
            history.replaceState = function(state, title, url) {
              if (url) {
                try {
                  arguments[2] = proxyBase + encodeURIComponent(new URL(url, targetUrl).href);
                } catch(e) {}
              }
              return origReplace.apply(this, arguments);
            };

            // D. Comprehensive Fetch Interception (Supports Strings, URLs, and Request objects)
            const origFetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') {
                input = toProxy(input);
              } else if (input instanceof URL) {
                input = toProxy(input.href);
              } else if (input instanceof Request) {
                input = new Request(toProxy(input.url), input);
              }
              return origFetch.call(this, input, init);
            };

            // E. Intercept XMLHttpRequest
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
              return origOpen.call(this, method, toProxy(url), async !== false, user, password);
            };

            // F. Intercept WebSockets (Converts wss:// into Proxied Upgrade Requests)
            const OrigWebSocket = window.WebSocket;
            window.WebSocket = function(url, protocols) {
              try {
                const parsed = new URL(url, targetUrl);
                const scheme = parsed.protocol === 'wss:' ? 'https:' : 'http:';
                const targetHttp = scheme + '//' + parsed.host + parsed.pathname + parsed.search;
                const proxied = new URL(toProxy(targetHttp), window.location.href);
                proxied.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                url = proxied.href;
              } catch(e) {}
              return protocols ? new OrigWebSocket(url, protocols) : new OrigWebSocket(url);
            };
            window.WebSocket.prototype = OrigWebSocket.prototype;

            // G. Intercept EventSource (Server-Sent Events used by Chatbots)
            if (window.EventSource) {
              const OrigEventSource = window.EventSource;
              window.EventSource = function(url, config) {
                return new OrigEventSource(toProxy(url), config);
              };
              window.EventSource.prototype = OrigEventSource.prototype;
            }

            // H. Intercept Beacon telemetry
            if (navigator.sendBeacon) {
              const origBeacon = navigator.sendBeacon;
              navigator.sendBeacon = function(url, data) {
                return origBeacon.call(this, toProxy(url), data);
              };
            }

            // I. Intercept UI clicks and link navigations
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a) {
                a.target = '_self';
                const href = a.getAttribute('href');
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = toProxy(href);
                }
              }
            }, true);

            // J. Intercept Form submissions
            document.addEventListener('submit', function(e) {
              const form = e.target;
              form.target = '_self';
              if (form.action && !form.action.includes(proxyBase)) {
                e.preventDefault();
                const formData = new FormData(form);
                const params = new URLSearchParams();
                for (const pair of formData.entries()) params.append(pair[0], pair[1]);
                
                const fullAction = new URL(form.action, targetUrl);
                if (form.method.toLowerCase() === 'get') {
                  fullAction.search = params.toString();
                  window.location.href = proxyBase + encodeURIComponent(fullAction.href);
                } else {
                  form.action = proxyBase + encodeURIComponent(fullAction.href);
                  form.submit();
                }
              }
            }, true);
          })();
        </script>
        <style>
          .adsbygoogle, [id*="-ad-"], [class*="ad-unit"], [class*="advertisement"],
          div[id*="google_ads"], div[data-ad], .video-ad-overlay {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            pointer-events: none !important;
          }
        </style>
      `;
      element.prepend(sandboxScript, { html: true });
    }
  }

  return new HTMLRewriter()
    .on('head', new HeadInjector())
    .on('base', new BaseStripper())
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
    .on('form', new AttributeRewriter('action'))
    .transform(response);
}
