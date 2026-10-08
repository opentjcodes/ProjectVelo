export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request);
  }
};

async function handleRequest(request) {
  const reqUrl = new URL(request.url);
  const query = reqUrl.searchParams.get('url');
  const proxyBase = reqUrl.origin + reqUrl.pathname + '?url=';

  // 1. Handle CORS Preflight
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

  // 2. THE REFERER FALLBACK (Fixes Brave Images & Escaped URLs)
  // If a site uses JS to navigate to "/images" without our ?url= parameter,
  // we catch it here, look at where it came from, and force it back into the proxy.
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
    return new Response('Advanced Anonymous Proxy Active. Pass a query or URL via ?url=', { 
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 3. Smart Query Parsing (Brave Default)
  let targetUrl;
  if (isUrl(query)) {
    targetUrl = query.startsWith('http') ? query : 'https://' + query;
  } else {
    targetUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(query);
  }
  const parsedTargetUrl = new URL(targetUrl);

  // 4. TOTAL ANONYMIZATION & HEADER SPOOFING
  const proxyHeaders = new Headers(request.headers);
  
  // Strip identifying headers
  proxyHeaders.delete('Host');
  proxyHeaders.delete('Referer');
  proxyHeaders.delete('Origin');
  proxyHeaders.delete('CF-Connecting-IP');
  proxyHeaders.delete('X-Forwarded-For');
  proxyHeaders.delete('X-Real-IP');
  proxyHeaders.delete('True-Client-IP');
  proxyHeaders.delete('CF-Ray');
  proxyHeaders.delete('CF-Visitor');

  // Spoof a standard desktop browser to bypass bot protection
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9');
  proxyHeaders.set('Sec-Fetch-Dest', 'document');
  proxyHeaders.set('Sec-Fetch-Mode', 'navigate');
  proxyHeaders.set('Sec-Fetch-Site', 'none');

  const proxyRequest = new Request(parsedTargetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'manual' 
  });

  try {
    const response = await fetch(proxyRequest);

    // 5. Handle Redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, parsedTargetUrl.href).href;
        return Response.redirect(proxyBase + encodeURIComponent(absLocation), response.status);
      }
    }

    // 6. Prepare Response Headers (Bypass Security & Rewrite Cookies)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // Strip headers that block iframes (Fixes Google)
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Content-Security-Policy-Report-Only');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Strict-Transport-Security');
    responseHeaders.delete('Cross-Origin-Opener-Policy');
    responseHeaders.delete('Cross-Origin-Embedder-Policy');

    // Rewrite Cookies so logins work inside the proxy
    if (responseHeaders.has('set-cookie')) {
      const cookies = responseHeaders.getSetCookie();
      responseHeaders.delete('set-cookie');
      for (const cookie of cookies) {
        // Remove Domain and Path restrictions so the browser accepts it for the worker domain
        let rewrittenCookie = cookie.replace(/Domain=[^;]+;?/i, '').replace(/Path=[^;]+;?/i, 'Path=/;');
        // Remove SameSite=Strict which breaks iframe cookies
        rewrittenCookie = rewrittenCookie.replace(/SameSite=Strict;?/i, 'SameSite=None; Secure;');
        responseHeaders.append('set-cookie', rewrittenCookie);
      }
    }

    let finalResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    // 7. Inject the "God Script" into HTML
    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
      finalResponse = rewriteHTML(finalResponse, parsedTargetUrl.href, proxyBase);
    }

    return finalResponse;
    
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// --- Helper Functions ---

function isUrl(str) {
  if (/\s/.test(str.trim())) return false;
  try {
    const url = new URL(str.startsWith('http') ? str : 'https://' + str);
    return url.hostname.includes('.');
  } catch (e) {
    return false;
  }
}

function rewriteHTML(response, targetUrl, proxyBase) {
  class AttributeRewriter {
    constructor(attributeName) { this.attributeName = attributeName; }
    element(element) {
      const attribute = element.getAttribute(this.attributeName);
      if (attribute && !attribute.startsWith('data:') && !attribute.startsWith('javascript:') && !attribute.startsWith('#')) {
        try {
          const absUrl = new URL(attribute, targetUrl).href;
          element.setAttribute(this.attributeName, proxyBase + encodeURIComponent(absUrl));
        } catch (e) {}
      }
    }
  }

  class HeadRewriter {
    element(element) {
      // THE GOD SCRIPT: Kills framebusting, intercepts History API, Forms, and Clicks
      const script = `
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            const targetUrl = "${targetUrl}";

            // 1. KILL FRAMEBUSTING (Fixes Google)
            try {
              Object.defineProperty(window, 'top', { value: window, writable: false, configurable: false });
              Object.defineProperty(window, 'parent', { value: window, writable: false, configurable: false });
            } catch(e) {}

            // 2. INTERCEPT HISTORY API (Fixes Brave Images Tab)
            const origPush = history.pushState;
            history.pushState = function(state, unused, url) {
              if (url) {
                try {
                  let absUrl = new URL(url, targetUrl).href;
                  if (!absUrl.includes(proxyBase)) url = proxyBase + encodeURIComponent(absUrl);
                } catch(e) {}
              }
              return origPush.apply(this, [state, unused, url]);
            };
            const origReplace = history.replaceState;
            history.replaceState = function(state, unused, url) {
              if (url) {
                try {
                  let absUrl = new URL(url, targetUrl).href;
                  if (!absUrl.includes(proxyBase)) url = proxyBase + encodeURIComponent(absUrl);
                } catch(e) {}
              }
              return origReplace.apply(this, [state, unused, url]);
            };

            // 3. INTERCEPT FORMS (Fixes Search Bars inside sites)
            document.addEventListener('submit', function(e) {
              const form = e.target;
              if (form.action && !form.action.includes(proxyBase)) {
                e.preventDefault();
                const formData = new FormData(form);
                const params = new URLSearchParams();
                for (const pair of formData.entries()) params.append(pair[0], pair[1]);
                
                if (form.method.toLowerCase() === 'get') {
                  const urlObj = new URL(form.action, targetUrl);
                  urlObj.search = params.toString();
                  window.location.href = proxyBase + encodeURIComponent(urlObj.href);
                } else {
                  form.action = proxyBase + encodeURIComponent(new URL(form.action, targetUrl).href);
                  form.submit();
                }
              }
            }, true);

            // 4. INTERCEPT CLICKS
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('data:') && !a.href.startsWith('#')) {
                if (!a.href.includes(proxyBase)) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = proxyBase + encodeURIComponent(a.href);
                }
              }
            }, true);

            // 5. INTERCEPT FETCH & XHR (Fixes dynamic content loading)
            const originalFetch = window.fetch;
            window.fetch = function() {
              let args = arguments;
              if (typeof args[0] === 'string' && !args[0].startsWith('data:') && !args[0].startsWith('blob:')) {
                try {
                  let absUrl = new URL(args[0], targetUrl).href;
                  if (!absUrl.includes(proxyBase)) args[0] = proxyBase + encodeURIComponent(absUrl);
                } catch(e) {}
              }
              return originalFetch.apply(this, args);
            };
          })();
        </script>
      `;
      element.prepend(script, { html: true });
    }
  }

  return new HTMLRewriter()
    .on('head', new HeadRewriter())
    .on('a', new AttributeRewriter('href'))
    .on('link', new AttributeRewriter('href'))
    .on('img', new AttributeRewriter('src'))
    .on('source', new AttributeRewriter('src'))
    .on('script', new AttributeRewriter('src'))
    .on('iframe', new AttributeRewriter('src'))
    .on('form', new AttributeRewriter('action'))
    .transform(response);
}
