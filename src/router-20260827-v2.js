import app from './index.js';

const REPO = 'noquierotuemail-cell/ebro-horizon-assets';
const IMAGE_EXT = /\.(?:webp|png|jpe?g|gif|svg)$/i;

function mimeFor(pathname) {
  if (/\.webp$/i.test(pathname)) return 'image/webp';
  if (/\.png$/i.test(pathname)) return 'image/png';
  if (/\.jpe?g$/i.test(pathname)) return 'image/jpeg';
  if (/\.gif$/i.test(pathname)) return 'image/gif';
  if (/\.svg$/i.test(pathname)) return 'image/svg+xml';
  return 'application/octet-stream';
}

function decodeBase64(value) {
  const clean = String(value || '').replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function githubAsset(pathname) {
  const path = pathname.replace(/^\//, '');
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=main`;
  const r = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'HABRO-RemoteApp-Worker'
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!r.ok) return null;
  const payload = await r.json();
  if (!payload || payload.type !== 'file' || !payload.content) return null;
  const base64 = String(payload.content).replace(/\s+/g, '');
  return { base64, sha: payload.sha, mime: mimeFor(pathname) };
}

async function serveImage(url) {
  const asset = await githubAsset(url.pathname);
  if (!asset) return new Response('Image unavailable', { status: 404 });
  const bytes = decodeBase64(asset.base64);
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-HABRO-Asset-Source': 'github-only-v2',
      'X-HABRO-Asset-SHA': asset.sha || '',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function serveCleanMarketingJs(request, env) {
  const original = await env.ASSETS.fetch(request);
  let js = await original.text();
  const marker = '\n  const hydrateInlineImage=';
  const start = js.indexOf(marker);
  const end = js.lastIndexOf('\n})();');
  if (start !== -1 && end > start) {
    js = js.slice(0, start) + js.slice(end);
  }
  const headers = new Headers(original.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('Content-Type', 'application/javascript; charset=utf-8');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-HABRO-JS-Mode', 'no-image-overrides');
  return new Response(js, { status: 200, headers });
}

async function inlineImages(response, request) {
  const html = await response.text();
  const origin = new URL(request.url).origin;
  const paths = new Set();

  for (const match of html.matchAll(/<img\b[^>]*?\bsrc=(['"])([^'"]+)\1[^>]*>/gi)) {
    const raw = match[2];
    if (!raw || raw.startsWith('data:')) continue;
    try {
      const pathname = new URL(raw, origin).pathname;
      if (pathname.startsWith('/assets/') && IMAGE_EXT.test(pathname)) paths.add(pathname);
    } catch (_) {}
  }

  const map = new Map();
  await Promise.all([...paths].map(async pathname => {
    try {
      const asset = await githubAsset(pathname);
      if (asset) map.set(pathname, `data:${asset.mime};base64,${asset.base64}`);
    } catch (_) {}
  }));

  let rewritten = html.replace(/<img\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)>/gi, (full, before, quote, raw, after) => {
    try {
      const pathname = new URL(raw, origin).pathname;
      const dataUri = map.get(pathname);
      return dataUri ? `<img${before}src=${quote}${dataUri}${quote}${after}>` : full;
    } catch (_) {
      return full;
    }
  });

  rewritten = rewritten.replace(/js\/apple-20260826\.js\?v=[^"']+/g, 'js/apple-20260826.js?v=20260827-0730');
  rewritten = rewritten.replace('</head>', '<style id="habro-render-failsafe">.reveal{opacity:1!important;transform:none!important}</style></head>');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-HABRO-Render-Mode', 'github-inline-v2-no-overrides');
  return new Response(rewritten, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/asset-diagnostics') {
      return new Response(JSON.stringify({ ok: true, mode: 'github-inline-v2-no-overrides' }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname === '/js/apple-20260826.js') {
      return serveCleanMarketingJs(request, env);
    }

    if (url.pathname.startsWith('/assets/') && IMAGE_EXT.test(url.pathname)) {
      return serveImage(url);
    }

    const response = await app.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return inlineImages(response, request);
    return response;
  }
};
