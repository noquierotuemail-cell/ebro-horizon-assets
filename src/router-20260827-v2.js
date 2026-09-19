import app from './index.js';

const REPO = 'noquierotuemail-cell/ebro-horizon-assets';
const IMAGE_EXT = /\.(?:webp|png|jpe?g|gif|svg)$/i;
const ANALYTICS_SCRIPT = '/js/habro-analytics-20260919.js?v=20260919-1';

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

function repositoryRef(url) {
  return url.hostname === 'beta.habroremote.com' ? 'habro-beta' : 'main';
}

async function githubAsset(pathname, ref = 'main') {
  const path = pathname.replace(/^\//, '');
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`;
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
  const ref = repositoryRef(url);
  const asset = await githubAsset(url.pathname, ref);
  if (!asset) return new Response('Image unavailable', { status: 404 });
  const bytes = decodeBase64(asset.base64);
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-HABRO-Asset-Source': 'github-only-v2',
      'X-HABRO-Asset-Branch': ref,
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
  if (start !== -1 && end > start) js = js.slice(0, start) + js.slice(end);
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
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const ref = repositoryRef(requestUrl);
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
      const asset = await githubAsset(pathname, ref);
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

  rewritten = rewritten.replace(/js\/apple-20260826\.js\?v=[^"']+/g, 'js/apple-20260826.js?v=20260919-1');
  if (!requestUrl.pathname.startsWith('/admin/analytics')) {
    rewritten = rewritten.replace('</body>', `<script src="${ANALYTICS_SCRIPT}" defer></script></body>`);
  }
  const failSafeScript = '<script id="habro-render-failsafe">window.addEventListener("load",()=>setTimeout(()=>{if(!document.documentElement.classList.contains("habro-motion-ready")){document.querySelectorAll(".reveal").forEach(el=>el.classList.add("is-visible"))}},2200),{once:true})<\/script>';
  rewritten = rewritten.replace('</head>', `${failSafeScript}</head>`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-HABRO-Render-Mode', 'github-inline-v2-no-overrides');
  return new Response(rewritten, { status: response.status, statusText: response.statusText, headers });
}

function clean(value, max = 120) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').slice(0, max);
}

function inc(obj, key) {
  const k = clean(key || 'unknown', 40) || 'unknown';
  obj[k] = (obj[k] || 0) + 1;
}

function blankAgg() {
  return {
    totalUsers: 0,
    totalVisits: 0,
    totalPageViews: 0,
    pwaInstalls: 0,
    pwaLaunches: 0,
    installAvailable: 0,
    firstEventAt: null,
    lastEventAt: null,
    usersByDevice: {},
    usersByOS: {},
    usersByBrowser: {},
    usersByCountry: {},
    installsByOS: {},
    installsByDevice: {},
    days: {}
  };
}

function ensureDay(agg, day) {
  if (!agg.days[day]) agg.days[day] = { visits: 0, users: 0, pageViews: 0, installs: 0, pwaActive: 0 };
  const keys = Object.keys(agg.days).sort();
  while (keys.length > 120) {
    const oldest = keys.shift();
    delete agg.days[oldest];
  }
  return agg.days[day];
}

export class HabroMetrics {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/event') return this.record(request);
    if (request.method === 'GET' && url.pathname === '/summary') return this.summary(url);
    return new Response('Not found', { status: 404 });
  }

  async record(request) {
    let body;
    try { body = await request.json(); } catch (_) { return new Response(null, { status: 204 }); }

    const type = clean(body.type, 48);
    const clientId = clean(body.clientId, 80);
    const sessionId = clean(body.sessionId, 80);
    if (!type || !clientId) return new Response(null, { status: 204 });

    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const device = clean(body.device, 24) || 'unknown';
    const os = clean(body.os, 24) || 'unknown';
    const browser = clean(body.browser, 24) || 'unknown';
    const country = clean(body.country, 8) || 'XX';
    const standalone = Boolean(body.standalone);

    const agg = (await this.state.storage.get('agg')) || blankAgg();
    agg.firstEventAt ||= now;
    agg.lastEventAt = now;
    const d = ensureDay(agg, day);

    const userKey = `u:${clientId}`;
    let user = await this.state.storage.get(userKey);
    if (!user) {
      user = { firstSeen: now, lastSeen: now, device, os, browser, country, pwaInstalled: false, lastPwaAt: null };
      agg.totalUsers += 1;
      inc(agg.usersByDevice, device);
      inc(agg.usersByOS, os);
      inc(agg.usersByBrowser, browser);
      inc(agg.usersByCountry, country);
    }
    user.lastSeen = now;
    user.device = device;
    user.os = os;
    user.browser = browser;
    user.country = country;

    const dayUserKey = `du:${day}:${clientId}`;
    if (!(await this.state.storage.get(dayUserKey))) {
      await this.state.storage.put(dayUserKey, true);
      d.users += 1;
    }

    if (type === 'visit') {
      const visitId = sessionId || `${clientId}:${day}`;
      const visitKey = `v:${visitId}`;
      if (!(await this.state.storage.get(visitKey))) {
        await this.state.storage.put(visitKey, now);
        agg.totalVisits += 1;
        d.visits += 1;
      }
    } else if (type === 'page_view') {
      agg.totalPageViews += 1;
      d.pageViews += 1;
    } else if (type === 'install_available') {
      agg.installAvailable += 1;
    } else if (type === 'pwa_installed' || type === 'pwa_first_standalone_launch') {
      if (!user.pwaInstalled) {
        user.pwaInstalled = true;
        user.installedAt = now;
        agg.pwaInstalls += 1;
        d.installs += 1;
        inc(agg.installsByOS, os);
        inc(agg.installsByDevice, device);
      }
      user.lastPwaAt = now;
    } else if (type === 'pwa_launch') {
      agg.pwaLaunches += 1;
      user.lastPwaAt = now;
      const pwaDayKey = `dp:${day}:${clientId}`;
      if (!(await this.state.storage.get(pwaDayKey))) {
        await this.state.storage.put(pwaDayKey, true);
        d.pwaActive += 1;
      }
      if (standalone && !user.pwaInstalled) {
        user.pwaInstalled = true;
        user.installedAt = now;
        agg.pwaInstalls += 1;
        d.installs += 1;
        inc(agg.installsByOS, os);
        inc(agg.installsByDevice, device);
      }
    }

    await this.state.storage.put(userKey, user);
    await this.state.storage.put('agg', agg);
    return new Response(null, { status: 204 });
  }

  async summary(url) {
    const agg = (await this.state.storage.get('agg')) || blankAgg();
    const now = Date.now();
    const cutoff7 = now - 7 * 86400000;
    const cutoff30 = now - 30 * 86400000;
    let activePwa7 = 0;
    let activePwa30 = 0;
    const users = await this.state.storage.list({ prefix: 'u:', limit: 1000 });
    for (const user of users.values()) {
      const ts = Number(user && user.lastPwaAt || 0);
      if (ts >= cutoff30) activePwa30 += 1;
      if (ts >= cutoff7) activePwa7 += 1;
    }

    const days = Object.entries(agg.days || {}).sort((a,b) => a[0].localeCompare(b[0]));
    const recent = n => days.slice(-n).reduce((acc, [,v]) => {
      acc.visits += v.visits || 0;
      acc.users += v.users || 0;
      acc.pageViews += v.pageViews || 0;
      acc.installs += v.installs || 0;
      acc.pwaActive += v.pwaActive || 0;
      return acc;
    }, { visits:0, users:0, pageViews:0, installs:0, pwaActive:0 });

    return Response.json({
      ok: true,
      generatedAt: now,
      totals: {
        users: agg.totalUsers || 0,
        visits: agg.totalVisits || 0,
        pageViews: agg.totalPageViews || 0,
        pwaInstalls: agg.pwaInstalls || 0,
        pwaLaunches: agg.pwaLaunches || 0,
        installAvailable: agg.installAvailable || 0,
        conversionPct: agg.totalUsers ? Math.round((agg.pwaInstalls / agg.totalUsers) * 1000) / 10 : 0,
        activePwa7,
        activePwa30
      },
      last7: recent(7),
      last30: recent(30),
      breakdown: {
        device: agg.usersByDevice || {},
        os: agg.usersByOS || {},
        browser: agg.usersByBrowser || {},
        country: agg.usersByCountry || {},
        installsByOS: agg.installsByOS || {},
        installsByDevice: agg.installsByDevice || {}
      },
      days: days.slice(-30).map(([date, values]) => ({ date, ...values }))
    }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

function analyticsStub(env) {
  const id = env.HABRO_METRICS.idFromName('global');
  return env.HABRO_METRICS.get(id);
}

async function analyticsEvent(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).hostname !== new URL(request.url).hostname) return new Response('Forbidden', { status: 403 });
    } catch (_) { return new Response('Forbidden', { status: 403 }); }
  }
  let body;
  try { body = await request.json(); } catch (_) { return new Response(null, { status: 204 }); }
  body.country = (request.cf && request.cf.country) || 'XX';
  const stub = analyticsStub(env);
  return stub.fetch('https://habro.metrics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function analyticsSummary(request, env) {
  const configured = clean(env.HABRO_ANALYTICS_ADMIN_TOKEN, 200);
  if (!configured) {
    return Response.json({ ok:false, error:'setup_required', message:'Configura el secreto HABRO_ANALYTICS_ADMIN_TOKEN en Cloudflare.' }, { status:503, headers:{'Cache-Control':'no-store'} });
  }
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${configured}`) return Response.json({ ok:false, error:'unauthorized' }, { status:401, headers:{'Cache-Control':'no-store'} });
  return analyticsStub(env).fetch('https://habro.metrics/summary');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/analytics/event') return analyticsEvent(request, env);
    if (url.pathname === '/api/analytics/summary') return analyticsSummary(request, env);

    if (url.pathname === '/api/asset-diagnostics') {
      return new Response(JSON.stringify({ ok: true, mode: 'github-inline-v2-no-overrides', analytics: Boolean(env.HABRO_METRICS) }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname === '/js/apple-20260826.js') return serveCleanMarketingJs(request, env);
    if (url.pathname.startsWith('/assets/') && IMAGE_EXT.test(url.pathname)) return serveImage(url);

    const response = await app.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return inlineImages(response, request);
    return response;
  }
};
