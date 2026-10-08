export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request);
  }
};

async function handleRequest(request) {
  const reqUrl = new URL(request.url);
  const query = reqUrl.searchParams.get('url');

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

  if (!query) {
    return new Response('Ultimate Proxy Active. Pass a query or URL via ?url=', { 
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 2. Smart Query Parsing
  let targetUrl;
  if (isUrl(query)) {
    targetUrl = query.startsWith('http') ? query : 'https://' + query;
  } else {
    targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query); // Switched default to Google!
  }

  const parsedTargetUrl = new URL(targetUrl);

  // 3. Prepare Proxy Request
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.delete('Host');
  proxyHeaders.delete('Referer');
  proxyHeaders.delete('Origin');
  
  // Spoof a perfect modern browser to bypass Google/Cloudflare bot protections
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9');

  const proxyRequest = new Request(parsedTargetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'manual' 
  });

  try {
    const response = await fetch(proxyRequest);
    const proxyBase = reqUrl.origin + reqUrl.pathname + '?url=';

    // 4. Handle Redirects
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, parsedTargetUrl.href).href;
        return Response.redirect(proxyBase + encodeURIComponent(absLocation), response.status);
      }
    }

    // 5. Prepare Response Headers & Rewrite Cookies (Crucial for Google)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Strict-Transport-Security');

    // Fix Cookies: Strip domains so they save to your proxy, allowing logins/sessions
    const cookies = responseHeaders.getSetCookie();
    responseHeaders.delete('Set-Cookie');
    for (const cookie of cookies) {
      const fixedCookie = cookie.replace(/Domain=[^;]+;?/i, '').replace(/SameSite=[^;]+;?/i, 'SameSite=None; Secure;');
      responseHeaders.append('Set-Cookie', fixedCookie);
    }

    let finalResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    // 6. Advanced HTML Rewriting + Aggressive JS Injection
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
    constructor(attributeName) {
      this.attributeName = attributeName;
    }
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
      // Injecting the Ultimate Client-Side Interceptor
      element.append(`
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            const currentUrl = "${targetUrl}";

            // 1. Intercept History API (Fixes Brave Images & SPAs)
            const origPushState = history.pushState;
            history.pushState = function(state, unused, url) {
              if (url) {
                const absUrl = new URL(url, currentUrl).href;
                url = proxyBase + encodeURIComponent(absUrl);
              }
              return origPushState.apply(this, [state, unused, url]);
            };
            
            const origReplaceState = history.replaceState;
            history.replaceState = function(state, unused, url) {
              if (url) {
                const absUrl = new URL(url, currentUrl).href;
                url = proxyBase + encodeURIComponent(absUrl);
              }
              return origReplaceState.apply(this, [state, unused, url]);
            };

            // 2. Intercept all clicks (Resolves relative URLs correctly)
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.hasAttribute('href')) {
                const href = a.getAttribute('href');
                if (!href.startsWith('javascript:') && !href.startsWith('data:') && !href.startsWith('#')) {
                  e.preventDefault();
                  e.stopPropagation();
                  const absUrl = new URL(href, currentUrl).href;
                  window.location.href = proxyBase + encodeURIComponent(absUrl);
                }
              }
            }, true);

            // 3. Intercept Form Submissions (Fixes Google Search Bar)
            document.addEventListener('submit', function(e) {
              const form = e.target;
              e.preventDefault();
              e.stopPropagation();
              
              const action = form.getAttribute('action') || currentUrl;
              const absUrl = new URL(action, currentUrl);
              
              if (form.method.toLowerCase() === 'get') {
                const formData = new FormData(form);
                for (const [key, value] of formData.entries()) {
                  absUrl.searchParams.append(key, value);
                }
                window.location.href = proxyBase + encodeURIComponent(absUrl.href);
              } else {
                form.action = proxyBase + encodeURIComponent(absUrl.href);
                form.submit();
              }
            }, true);

            // 4. Intercept Background Fetches
            const originalFetch = window.fetch;
            window.fetch = function() {
              let args = arguments;
              let url = args[0];
              if (typeof url === 'string' && url.startsWith('http') && !url.includes(proxyBase)) {
                args[0] = proxyBase + encodeURIComponent(url);
              }
              return originalFetch.apply(this, args);
            };

            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              if (typeof url === 'string' && url.startsWith('http') && !url.includes(proxyBase)) {
                url = proxyBase + encodeURIComponent(url);
              }
              return originalOpen.apply(this, [method, url, ...Array.prototype.slice.call(arguments, 2)]);
            };

            // 5. Disable Service Workers (They break proxies)
            if (navigator.serviceWorker) {
              navigator.serviceWorker.register = function() { return Promise.reject('SW disabled by proxy'); };
            }
          })();
        </script>
      `, { html: true });
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
