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

async function fetchRepoFile(pathname) {
  const path = pathname.replace(/^\//, '');
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}?ref=main`;
  const upstream = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'HABRO-RemoteApp-Worker'
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!upstream.ok) {
    return { ok: false, status: upstream.status, source: 'github-api' };
  }
  const payload = await upstream.json();
  if (!payload || payload.type !== 'file' || !payload.content) {
    return { ok: false, status: 502, source: 'github-api' };
  }
  const bytes = decodeBase64(payload.content);
  return { ok: true, status: 200, bytes, sha: payload.sha, source: 'github-api' };
}

async function serveImage(request, env, url) {
  try {
    const repo = await fetchRepoFile(url.pathname);
    if (repo.ok) {
      const headers = new Headers();
      headers.set('Content-Type', mimeFor(url.pathname));
      headers.set('Content-Length', String(repo.bytes.byteLength));
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
      headers.set('X-HABRO-Asset-Source', repo.source);
      headers.set('X-HABRO-Asset-SHA', repo.sha || '');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(repo.bytes, { status: 200, headers });
    }
  } catch (error) {
    // Fall through to Cloudflare Static Assets.
  }

  const fallback = await env.ASSETS.fetch(request);
  const headers = new Headers(fallback.headers);
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  headers.set('X-HABRO-Asset-Source', 'cloudflare-fallback');
  headers.delete('content-disposition');
  return new Response(fallback.body, {
    status: fallback.status,
    statusText: fallback.statusText,
    headers
  });
}

async function assetDiagnostics(env, origin) {
  const paths = [
    '/assets/hero-header-20260826.webp',
    '/assets/lifestyle-woman-phone-20260826.webp',
    '/assets/lifestyle-woman-watch-trunk-20260826.webp',
    '/assets/hero-home-20260817.webp',
    '/assets/hero-energy-20260817.webp',
    '/assets/hero-climate-20260817.webp',
    '/assets/solar.webp',
    '/assets/mantenimiento.webp',
    '/assets/vehiculo.webp'
  ];
  const results = [];
  for (const pathname of paths) {
    let cloudflare = null;
    let github = null;
    try {
      const r = await env.ASSETS.fetch(new Request(`${origin}${pathname}`));
      cloudflare = {
        status: r.status,
        contentType: r.headers.get('content-type'),
        contentLength: r.headers.get('content-length')
      };
    } catch (error) {
      cloudflare = { error: String(error) };
    }
    try {
      const r = await fetchRepoFile(pathname);
      github = r.ok
        ? { status: 200, bytes: r.bytes.byteLength, sha: r.sha }
        : { status: r.status };
    } catch (error) {
      github = { error: String(error) };
    }
    results.push({ pathname, cloudflare, github });
  }
  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/asset-diagnostics') {
      return assetDiagnostics(env, url.origin);
    }

    if (url.pathname.startsWith('/assets/') && IMAGE_EXT.test(url.pathname)) {
      return serveImage(request, env, url);
    }

    return app.fetch(request, env, ctx);
  }
};
