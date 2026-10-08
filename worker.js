export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request);
  }
};

// ---------------------------------------------------------------------------
// 1. AD-BLOCKING ENGINE (Edge Level)
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
  /(^|\.)quantserve\.com$/i,
  /(^|\.)rubiconproject\.com$/i,
  /(^|\.)pubmatic\.com$/i,
  /(^|\.)casalemedia\.com$/i,
  /(^|\.)openx\.net$/i,
  /(^|\.)moatads\.com$/i,
  /(^|\.)hotjar\.com$/i,
  /(^|\.)clarity\.ms$/i
];

function isAdOrTracker(url) {
  try {
    const host = new URL(url).hostname;
    return AD_DOMAINS.some(pattern => pattern.test(host));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. MAIN REQUEST ROUTER
// ---------------------------------------------------------------------------
async function handleRequest(request) {
  const reqUrl = new URL(request.url);
  const proxyBase = reqUrl.origin + reqUrl.pathname + '?url=';
  let query = reqUrl.searchParams.get('url');

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Session recovery: read last known host from cookie
  const cookiesHeader = request.headers.get('Cookie') || '';
  const lastOriginMatch = cookiesHeader.match(/(?:^|;\s*)__proxy_host=([^;]+)/);
  const lastKnownOrigin = lastOriginMatch ? decodeURIComponent(lastOriginMatch[1]) : null;

  // Fallback routing if ?url= is missing
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

    // Secondary fallback: use last visited host cookie for relative assets
    if (lastKnownOrigin && reqUrl.pathname !== '/') {
      const reconstructedUrl = lastKnownOrigin + reqUrl.pathname + reqUrl.search;
      return Response.redirect(proxyBase + encodeURIComponent(reconstructedUrl), 302);
    }

    // Default entrypoint: Bing
    query = 'https://www.bing.com/';
  }

  // Parse Target URL
  let targetUrl;
  if (isUrl(query)) {
    targetUrl = query.startsWith('http') ? query : 'https://' + query;
  } else {
    // Search query fallback through Bing
    targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);
  }

  // Intercept & block ads at edge
  if (isAdOrTracker(targetUrl)) {
    return new Response('/* Blocked by Proxy Ad-Shield */', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  let parsedTargetUrl;
  try {
    parsedTargetUrl = new URL(targetUrl);
  } catch (err) {
    return new Response('Invalid Target URL', { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // 3. ANONYMIZATION & REQUEST HEADERS
  // ---------------------------------------------------------------------------
  const proxyHeaders = new Headers();
  
  // Spoof consistent client profile
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  proxyHeaders.set('Accept', request.headers.get('Accept') || '*/*');
  proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9');
  proxyHeaders.set('Sec-Fetch-Dest', 'document');
  proxyHeaders.set('Sec-Fetch-Mode', 'navigate');
  proxyHeaders.set('Sec-Fetch-Site', 'none');
  proxyHeaders.set('Sec-Fetch-User', '?1');

  // Pass incoming Content-Type for POST/PUT payloads
  if (request.headers.has('Content-Type')) {
    proxyHeaders.set('Content-Type', request.headers.get('Content-Type'));
  }

  const proxyRequest = new Request(parsedTargetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: !['GET', 'HEAD'].includes(request.method) ? request.body : null,
    redirect: 'manual'
  });

  try {
    const response = await fetch(proxyRequest);

    // Handle HTTP Redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, parsedTargetUrl.href).href;
        return Response.redirect(proxyBase + encodeURIComponent(absLocation), response.status);
      }
    }

    // ---------------------------------------------------------------------------
    // 4. SANITIZE & REWRITE RESPONSE HEADERS
    // ---------------------------------------------------------------------------
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    
    // Strip framing, CSP, and security boundaries that interfere with the proxy
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Content-Security-Policy-Report-Only');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Strict-Transport-Security');
    responseHeaders.delete('Cross-Origin-Opener-Policy');
    responseHeaders.delete('Cross-Origin-Embedder-Policy');
    responseHeaders.delete('Cross-Origin-Resource-Policy');

    // Persist current target origin for dynamic subresource fetches
    responseHeaders.append('Set-Cookie', `__proxy_host=${encodeURIComponent(parsedTargetUrl.origin)}; Path=/; SameSite=Lax; Secure`);

    // Rewrite set-cookie directives
    if (responseHeaders.has('set-cookie')) {
      const cookies = responseHeaders.getSetCookie();
      responseHeaders.delete('set-cookie');
      for (const cookie of cookies) {
        let rewrittenCookie = cookie
          .replace(/Domain=[^;]+;?/i, '')
          .replace(/Path=[^;]+;?/i, 'Path=/;')
          .replace(/SameSite=Strict;?/i, 'SameSite=None; Secure;');
        responseHeaders.append('set-cookie', rewrittenCookie);
      }
    }

    let finalResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
      finalResponse = rewriteHTML(finalResponse, parsedTargetUrl.href, proxyBase);
    }

    return finalResponse;
  } catch (err) {
    return new Response(`Proxy Gateway Error: ${err.message}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// ---------------------------------------------------------------------------
// 5. HTML PARSING & CLIENT INJECTION
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
      // Strip Subresource Integrity to prevent CSS/JS load failures
      if (element.hasAttribute('integrity')) element.removeAttribute('integrity');
      if (element.hasAttribute('nonce')) element.removeAttribute('nonce');

      const attrValue = element.getAttribute(this.attributeName);
      if (attrValue && !attrValue.startsWith('data:') && !attrValue.startsWith('javascript:') && !attrValue.startsWith('#')) {
        try {
          const absUrl = new URL(attrValue, targetUrl).href;
          element.setAttribute(this.attributeName, proxyBase + encodeURIComponent(absUrl));
        } catch (e) {}
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
            } catch (e) {}
          }
          return parts.join(' ');
        })
        .join(', ');
      element.setAttribute('srcset', rewritten);
    }
  }

  class HeadRewriter {
    element(element) {
      const script = `
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            const targetUrl = "${targetUrl}";

            function toProxyUrl(url) {
              if (!url || typeof url !== 'string') return url;
              if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) return url;
              try {
                const abs = new URL(url, targetUrl).href;
                if (!abs.startsWith(window.location.origin)) {
                  return proxyBase + encodeURIComponent(abs);
                }
              } catch (e) {}
              return url;
            }

            // 1. Defeat frame-busting
            try {
              Object.defineProperty(window, 'top', { value: window, writable: false });
              Object.defineProperty(window, 'parent', { value: window, writable: false });
            } catch(e) {}

            // 2. History & Navigation Fixes
            const origPush = history.pushState;
            history.pushState = function(state, unused, url) {
              if (url) {
                try {
                  const abs = new URL(url, targetUrl).href;
                  arguments[2] = proxyBase + encodeURIComponent(abs);
                } catch(e) {}
              }
              return origPush.apply(this, arguments);
            };

            const origReplace = history.replaceState;
            history.replaceState = function(state, unused, url) {
              if (url) {
                try {
                  const abs = new URL(url, targetUrl).href;
                  arguments[2] = proxyBase + encodeURIComponent(abs);
                } catch(e) {}
              }
              return origReplace.apply(this, arguments);
            };

            // 3. Intercept Forms
            document.addEventListener('submit', function(e) {
              const form = e.target;
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

            // 4. Intercept Link Clicks
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                if (!a.href.includes(proxyBase)) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = toProxyUrl(a.getAttribute('href') || a.href);
                }
              }
            }, true);

            // 5. Intercept Fetch (Strings & Request Objects)
            const origFetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === 'string') {
                input = toProxyUrl(input);
              } else if (input instanceof Request) {
                input = new Request(toProxyUrl(input.url), input);
              }
              return origFetch.call(this, input, init);
            };

            // 6. Intercept XMLHttpRequest
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              arguments[1] = toProxyUrl(url);
              return origOpen.apply(this, arguments);
            };
          })();
        </script>
        <!-- Cosmetic Ad Blocker Styling -->
        <style>
          .ad, .ads, .advert, .advertisement, [id*="-ad-"], [class*="ad-unit"], 
          [class*="adsbygoogle"], [id*="google_ads"], div[data-ad] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            pointer-events: none !important;
          }
        </style>
      `;
      element.prepend(script, { html: true });
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
    .on('iframe', new AttributeRewriter('src'))
    .on('form', new AttributeRewriter('action'))
    .transform(response);
}
