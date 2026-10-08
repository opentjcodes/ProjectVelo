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
    return new Response('Advanced Proxy Active. Pass a query or URL via ?url=', { 
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 2. Smart Query Parsing
  let targetUrl;
  if (isUrl(query)) {
    targetUrl = query.startsWith('http') ? query : 'https://' + query;
  } else {
    targetUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(query);
  }

  const parsedTargetUrl = new URL(targetUrl);

  // 3. Prepare Proxy Request
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.delete('Host');
  proxyHeaders.delete('Referer');
  proxyHeaders.delete('Origin');
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

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

    // 5. Prepare Response Headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Strict-Transport-Security');

    let finalResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    // 6. Advanced HTML Rewriting + JS Injection
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

  // INJECTS JAVASCRIPT TO CATCH DYNAMIC CLICKS AND CORS FETCHES
  class HeadRewriter {
    element(element) {
      element.append(`
        <script>
          (function() {
            const proxyBase = "${proxyBase}";
            
            // 1. Intercept all clicks (Catches links made by React/Vue/Brave JS)
            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.href) {
                if (!a.href.startsWith('javascript:') && !a.href.startsWith('data:') && !a.href.startsWith('#')) {
                  if (!a.href.includes(proxyBase)) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = proxyBase + encodeURIComponent(a.href);
                  }
                }
              }
            }, true); // 'true' ensures we catch it before the website's own scripts do

            // 2. Intercept background Fetch requests (Fixes CORS errors)
            const originalFetch = window.fetch;
            window.fetch = function() {
              let args = arguments;
              let url = args[0];
              if (typeof url === 'string' && url.startsWith('http') && !url.includes(proxyBase)) {
                args[0] = proxyBase + encodeURIComponent(url);
              }
              return originalFetch.apply(this, args);
            };

            // 3. Intercept XHR requests
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
              if (typeof url === 'string' && url.startsWith('http') && !url.includes(proxyBase)) {
                url = proxyBase + encodeURIComponent(url);
              }
              return originalOpen.apply(this, [method, url, ...Array.prototype.slice.call(arguments, 2)]);
            };
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
