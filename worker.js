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

  // 2. Empty state
  if (!query) {
    return new Response('Advanced Proxy Active. Pass a query or URL via ?url=', { 
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 3. Smart Query Parsing (URL vs Brave Search)
  let targetUrl;
  if (isUrl(query)) {
    // If it's a URL but missing http://, add it
    targetUrl = query.startsWith('http') ? query : 'https://' + query;
  } else {
    // If it's a normal text query, use Brave Search
    targetUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(query);
  }

  const parsedTargetUrl = new URL(targetUrl);

  // 4. Prepare Advanced Proxy Request
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.delete('Host');
  proxyHeaders.delete('Referer');
  proxyHeaders.delete('Origin');
  
  // Spoof User-Agent to prevent sites from blocking the Cloudflare Worker bot
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const proxyRequest = new Request(parsedTargetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'manual' // Crucial: We handle redirects manually to keep them in the proxy
  });

  try {
    const response = await fetch(proxyRequest);
    const proxyBase = reqUrl.origin + reqUrl.pathname + '?url=';

    // 5. Handle Redirects (Keep user inside the proxy)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const absLocation = new URL(location, parsedTargetUrl.href).href;
        return Response.redirect(proxyBase + encodeURIComponent(absLocation), response.status);
      }
    }

    // 6. Prepare Response Headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // Strip headers that prevent embedding and break proxying
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('Clear-Site-Data');
    responseHeaders.delete('Strict-Transport-Security');

    let finalResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

    // 7. Advanced HTML Rewriting
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

// Detects if the user typed a URL or a Search Query
function isUrl(str) {
  // If it contains spaces, it's definitely a search query
  if (/\s/.test(str.trim())) return false;
  try {
    const url = new URL(str.startsWith('http') ? str : 'https://' + str);
    // Must have a dot (like .com) to be considered a valid domain
    return url.hostname.includes('.');
  } catch (e) {
    return false;
  }
}

// Rewrites HTML to keep all links, images, and forms inside the proxy
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

  // Handles responsive images (srcset)
  class SrcsetRewriter {
    element(element) {
      const srcset = element.getAttribute('srcset');
      if (srcset) {
        const rewritten = srcset.split(',').map(part => {
          const [url, size] = part.trim().split(/\s+/);
          if (url && !url.startsWith('data:')) {
            try {
              const absUrl = new URL(url, targetUrl).href;
              return `${proxyBase}${encodeURIComponent(absUrl)} ${size || ''}`.trim();
            } catch (e) { return part; }
          }
          return part;
        }).join(', ');
        element.setAttribute('srcset', rewritten);
      }
    }
  }

  return new HTMLRewriter()
    .on('a', new AttributeRewriter('href'))
    .on('link', new AttributeRewriter('href'))
    .on('img', new AttributeRewriter('src'))
    .on('img', new SrcsetRewriter())
    .on('source', new AttributeRewriter('src'))
    .on('source', new SrcsetRewriter())
    .on('script', new AttributeRewriter('src'))
    .on('iframe', new AttributeRewriter('src'))
    .on('form', new AttributeRewriter('action'))
    .transform(response);
}