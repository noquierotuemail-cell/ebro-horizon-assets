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

function encodeBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function fetchRepoFile(pathname) {
  const path = pathname.replace(/^\//, '');
  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}?ref=main`;
  const upstream = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'HABRO-RemoteApp-Worker'
    },
    cf: { cacheTtl: 86400, cacheEverything: true }
  });
  if (!upstream.ok) return { ok: false, status: upstream.status, source: 'github-api' };
  const payload = await upstream.json();
  if (!payload || payload.type !== 'file' || !payload.content) {
    return { ok: false, status: 502, source: 'github-api' };
  }
  const bytes = decodeBase64(payload.content);
  return { ok: true, status: 200, bytes, sha: payload.sha, source: 'github-api' };
}

async function assetBytes(env, origin, pathname) {
  try {
    const asset = await env.ASSETS.fetch(new Request(`${origin}${pathname}`));
    if (asset.ok) {
      const bytes = new Uint8Array(await asset.arrayBuffer());
      if (bytes.byteLength > 0) {
        return {
          ok: true,
          bytes,
          contentType: asset.headers.get('content-type') || mimeFor(pathname),
          source: 'cloudflare-assets'
        };
      }
    }
  } catch (_) {}

  try {
    const repo = await fetchRepoFile(pathname);
    if (repo.ok) {
      return { ok: true, bytes: repo.bytes, contentType: mimeFor(pathname), source: repo.source };
    }
  } catch (_) {}

  return { ok: false };
}

async function serveImage(request, env, url) {
  const resolved = await assetBytes(env, url.origin, url.pathname);
  if (!resolved.ok) return new Response('Image unavailable', { status: 404 });
  const headers = new Headers();
  headers.set('Content-Type', resolved.contentType || mimeFor(url.pathname));
  headers.set('Content-Length', String(resolved.bytes.byteLength));
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  headers.set('X-HABRO-Asset-Source', resolved.source || 'unknown');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(resolved.bytes, { status: 200, headers });
}

async function inlineSiteImages(response, request, env) {
  const html = await response.text();
  const origin = new URL(request.url).origin;
  const matches = [...html.matchAll(/<img\b[^>]*?\bsrc=(['"])([^'"]+)\1[^>]*>/gi)];
  const unique = new Map();

  for (const match of matches) {
    const raw = match[2];
    if (!raw || raw.startsWith('data:')) continue;
    let pathname;
    try {
      pathname = new URL(raw, origin).pathname;
    } catch (_) {
      continue;
    }
    if (!pathname.startsWith('/assets/') || !IMAGE_EXT.test(pathname)) continue;
    if (!unique.has(pathname)) unique.set(pathname, null);
  }

  await Promise.all([...unique.keys()].map(async pathname => {
    const resolved = await assetBytes(env, origin, pathname);
    if (!resolved.ok) return;
    const mime = resolved.contentType || mimeFor(pathname);
    unique.set(pathname, `data:${mime};base64,${encodeBase64(resolved.bytes)}`);
  }));

  let rewritten = html.replace(/<img\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)>/gi, (full, before, quote, raw, after) => {
    let pathname;
    try {
      pathname = new URL(raw, origin).pathname;
    } catch (_) {
      return full;
    }
    const dataUri = unique.get(pathname);
    if (!dataUri) return full;
    return `<img${before}src=${quote}${dataUri}${quote}${after}>`;
  });

  const failSafeStyle = '<style id="habro-render-failsafe">.reveal{opacity:1!important;transform:none!important}.reveal.is-visible{opacity:1!important;transform:none!important}</style>';
  rewritten = rewritten.replace('</head>', `${failSafeStyle}</head>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('Cache-Control', 'private, no-store');
  return new Response(rewritten, { status: response.status, statusText: response.statusText, headers });
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
    const item = { pathname };
    try {
      const r = await env.ASSETS.fetch(new Request(`${origin}${pathname}`));
      const bytes = r.ok ? new Uint8Array(await r.arrayBuffer()) : new Uint8Array();
      item.cloudflare = {
        status: r.status,
        contentType: r.headers.get('content-type'),
        bytes: bytes.byteLength,
        magic: [...bytes.slice(0, 12)].map(v => v.toString(16).padStart(2, '0')).join(' ')
      };
    } catch (error) {
      item.cloudflare = { error: String(error) };
    }
    try {
      const r = await fetchRepoFile(pathname);
      item.github = r.ok ? {
        status: 200,
        bytes: r.bytes.byteLength,
        sha: r.sha,
        magic: [...r.bytes.slice(0, 12)].map(v => v.toString(16).padStart(2, '0')).join(' ')
      } : { status: r.status };
    } catch (error) {
      item.github = { error: String(error) };
    }
    results.push(item);
  }
  return new Response(JSON.stringify({ ok: true, mode: 'server-inline-v1', results }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
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

    const response = await app.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return inlineSiteImages(response, request, env);
    }
    return response;
  }
};