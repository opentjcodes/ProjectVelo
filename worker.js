export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request);
  }
};

// ---------------------------------------------------------------------------
// 1. AD-BLOCKER & TRACKER SHIELD
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
  /(^|\.)imasdk\.googleapis\.com$/i, // Video Ad SDK
  /(^|\.)pagead2\.googlesyndication\.com$/i
];

function isAd(url) {
  try {
    const host = new URL(url).hostname;
    return AD_DOMAINS.some(pattern => pattern.test(host));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. CORE PROXY HANDLER
// ---------------------------------------------------------------------------
async function handleRequest(request) {
  const reqUrl = new URL(request.url);
  const proxyBase = reqUrl.origin + reqUrl.pathname + '?url=';
  let query = reqUrl.searchParams.get('url');

  // A. Handle CORS Preflight immediately
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

  // B. Retrieve host origin from session cookie
  const cookieHeader = request.headers.get('Cookie') || '';
  const lastOriginMatch = cookieHeader.match(/(?:^|;\s*)__proxy_host=([^;]+)/);
  const lastKnownOrigin = lastOriginMatch ? decodeURIComponent(lastOriginMatch[1]) : null;

  // C. Fallback routing for missing ?url= parameter
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

    // Default to Bing home page
    query = 'https://www.bing.com/';
  }

  // D. Resolve Target URL
  let targetUrl;
  if (isUrl(query)) {
    targetUrl = query.startsWith('http') ? query : 'https://' + query;
  } else {
    targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
  }

  // Return non-breaking empty response for ad requests
  if (isAd(targetUrl)) {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  let parsedTargetUrl;
  try {
    parsedTargetUrl = new URL(targetUrl);
  } catch {
    return new Response('Malformed Target URL', { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // 3. ADAPTIVE HEADERS & WEBSOCKET HANDLING
  // ---------------------------------------------------------------------------
  const clientUa = request.headers.get('User-Agent') || '';
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(clientUa);

  // E. Native WebSocket forwarding for live chats and live feeds
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
    return fetch(parsedTargetUrl.href, {
      method: request.method,
      headers: request.headers
    });
  }

  const proxyHeaders = new Headers();

  // Responsive device profiles
  if (isMobile) {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0');
    proxyHeaders.set('Sec-CH-UA-Mobile', '?1');
    proxyHeaders.set('Sec-CH-UA-Platform', '"Android"');
  } else {
    proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    proxyHeaders.set('Sec-CH-UA-Mobile', '?0');
    proxyHeaders.set('Sec-CH-UA-Platform', '"Windows"');
  }

  // Forward Range headers for video chunking/scrubbing
  if (request.headers.has('Range')) {
    proxyHeaders.set('Range', request.headers.get('Range'));
  }
  if (request.headers.has('If-Range')) {
    proxyHeaders.set('If-Range', request.headers.get('If-Range'));
  }

  // Forward common payload and content headers
  proxyHeaders.set('Accept', request.headers.get('Accept') || '*/*');
  proxyHeaders.set('Accept-Language', request.headers.get('Accept-Language') || 'en-US,en;q=0.9');
  if (request.headers.has('Content-Type')) {
    proxyHeaders.set('Content-Type', request.headers.get('Content-Type'));
  }

  // Execute Request
  const proxyRequest = new Request(parsedTargetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: !['GET', 'HEAD'].includes(request.method) ? request.body : null,
    redirect: 'manual'
  });

  try {
    const response = await fetch(proxyRequest);

    // F. Handle HTTP Redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, parsedTargetUrl.href).href;
        return Response.redirect(proxyBase + encodeURIComponent(absLocation), response.status);
      }
    }

    // ---------------------------------------------------------------------------
    // 4. STRIP BARRIERS & PRESERVE STREAMING HEADERS
    // ---------------------------------------------------------------------------
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    // Strip frame-busting, CSP, and cross-origin locks
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Content-Security-Policy-Report-Only');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Cross-Origin-Opener-Policy');
    responseHeaders.delete('Cross-Origin-Embedder-Policy');
    responseHeaders.delete('Cross-Origin-Resource-Policy');

    // Keep origin context active for dynamic assets
    responseHeaders.append('Set-Cookie', `__proxy_host=${encodeURIComponent(parsedTargetUrl.origin)}; Path=/; SameSite=Lax; Secure`);

    // Rewrite set-cookie declarations
    if (responseHeaders.has('set-cookie')) {
      const cookies = responseHeaders.getSetCookie();
      responseHeaders.delete('set-cookie');
      for (const cookie of cookies) {
        const rewritten = cookie
          .replace(/Domain=[^;]+;?/i, '')
          .replace(/Path=[^;]+;?/i, 'Path=/;')
          .replace(/SameSite=Strict;?/i, 'SameSite=None; Secure;');
        responseHeaders.append('set-cookie', rewritten);
      }
    }

    // G. Zero-Copy Pipeline for Media, Video, and Real-Time SSE
    const contentType = (responseHeaders.get('content-type') || '').toLowerCase();
    const isHtml = contentType.includes('text/html');

    // If it is video, audio, binary, or live event streams (SSE), stream directly without processing
    if (!isHtml) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    }

    // Transform HTML documents only
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
    return new Response(`Proxy Streaming Error: ${err.message}`, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// ---------------------------------------------------------------------------
// 5. HTML REWRITING & CLIENT CONFINEMENT ENGINE
// ---------------------------------------------------------------------------
function isUrl(str) {
  if (/\s/.test(str.trim())) return false;
  try {
    const url = new URL(str.startsWith('http') ? str : 'https://' + str);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

function rewriteHTML(response, targetUrl, proxyBase) {
  class AttributeRewriter {
    constructor(attributeName) {
      this.attributeName = attributeName;
    }
    element(element) {
      // Eliminate Subresource Integrity hashes to stop asset rejection
      if (element.hasAttribute('integrity')) element.removeAttribute('integrity');
      if (element.hasAttribute('nonce')) element.removeAttribute('nonce');

      // Keep links in the same tab
      if (element.hasAttribute('target')) element.setAttribute('target', '_self');

      const val = element.getAttribute(this.attributeName);
      if (val && !val.startsWith('data:') && !val.startsWith('javascript:') && !val.startsWith('#')) {
        try {
          const absUrl = new URL(val, targetUrl).href;
          element.setAttribute(this.attributeName, proxyBase + encodeURIComponent(absUrl));
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
              const absUrl = new URL(parts[0], targetUrl).href;
              parts[0] = proxyBase + encodeURIComponent(absUrl);
            } catch {}
          }
          return parts.join(' ');
        })
        .join(', ');
      element.setAttribute('srcset', rewritten);
    }
  }

  class HeadRewriter {
    element(element) {
      const injectionScript = `
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            const targetUrl = "${targetUrl}";

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

            // 1. Force single tab: neutralise window.open breakouts
            window.open = function(url) {
              if (url) window.location.href = toProxy(url);
              return window;
            };

            // 2. Kill framebusters
            try {
              Object.defineProperty(window, 'top', { value: window, writable: false });
              Object.defineProperty(window, 'parent', { value: window, writable: false });
            } catch(e) {}

            // 3. Maintain History Navigation without page breakage
            const origPush = history.pushState;
            history.pushState = function(state, title, url) {
              if (url) {
                try {
                  const abs = new URL(url, targetUrl).href;
                  arguments[2] = proxyBase + encodeURIComponent(abs);
                } catch(e) {}
              }
              return origPush.apply(this, arguments);
            };

            const origReplace = history.replaceState;
            history.replaceState = function(state, title, url) {
              if (url) {
                try {
                  const abs = new URL(url, targetUrl).href;
                  arguments[2] = proxyBase + encodeURIComponent(abs);
                } catch(e) {}
              }
              return origReplace.apply(this, arguments);
            };

            // 4. Intercept clicks and force _self target
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

            // 5. Intercept Form Submissions
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

            // 6. Transparent fetch interception (strings and Request objects)
            const origFetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') {
                input = toProxy(input);
              } else if (input instanceof Request) {
                input = new Request(toProxy(input.url), input);
              }
              return origFetch.call(this, input, init);
            };

            // 7. XMLHttpRequest Interception
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              arguments[1] = toProxy(url);
              return origOpen.apply(this, arguments);
            };
          })();
        </script>
        <style>
          /* Structural Ad and Overlay Collapsing */
          .adsbygoogle, [id*="-ad-"], [class*="ad-unit"], [class*="advertisement"],
          div[id*="google_ads"], div[data-ad], .video-ad-overlay {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            pointer-events: none !important;
          }
        </style>
      `;
      element.prepend(injectionScript, { html: true });
    }
  }

  return new HTMLRewriter()
    .on('head', new HeadRewriter())
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
    .on('base', new AttributeRewriter('href'))
    .transform(response);
}
