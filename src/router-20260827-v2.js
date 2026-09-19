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

function trackedPageKey(pathname) {
  let p = clean(pathname || '/', 180).split('?')[0].split('#')[0] || '/';
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
  if (p === '') p = '/';
  if (p === '/') return 'home';
  if (p === '/guia-instalacion') return 'guide';
  return null;
}

function blankPageMetric() {
  return { visits: 0, pageViews: 0, users: 0 };
}

function ensurePageMetric(container, key) {
  if (!container[key]) container[key] = blankPageMetric();
  return container[key];
}

function blankAgg() {
  return {
    totalUsers: 0,
    totalVisits: 0,
    totalPageViews: 0,
    pwaInstalls: 0,
    pwaNewInstalls: 0,
    pwaRecovered: 0,
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
    pages: {
      home: blankPageMetric(),
      guide: blankPageMetric()
    },
    days: {}
  };
}

function ensureDay(agg, day) {
  if (!agg.days[day]) agg.days[day] = { visits: 0, users: 0, pageViews: 0, installs: 0, pwaActive: 0, pages: { home: blankPageMetric(), guide: blankPageMetric() } };
  agg.days[day].pages ||= { home: blankPageMetric(), guide: blankPageMetric() };
  ensurePageMetric(agg.days[day].pages, 'home');
  ensurePageMetric(agg.days[day].pages, 'guide');
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
    const pageKey = trackedPageKey(body.path);

    const agg = (await this.state.storage.get('agg')) || blankAgg();
    agg.pwaNewInstalls = Number(agg.pwaNewInstalls || 0);
    agg.pwaRecovered = Number(agg.pwaRecovered || 0);
    agg.pages ||= { home: blankPageMetric(), guide: blankPageMetric() };
    ensurePageMetric(agg.pages, 'home');
    ensurePageMetric(agg.pages, 'guide');
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

    if ((type === 'visit' || type === 'page_view') && pageKey) {
      const pageTotal = ensurePageMetric(agg.pages, pageKey);
      const dayPage = ensurePageMetric(d.pages, pageKey);
      const pageUserKey = `pu:${pageKey}:${clientId}`;
      if (!(await this.state.storage.get(pageUserKey))) {
        await this.state.storage.put(pageUserKey, true);
        pageTotal.users += 1;
      }
      const dayPageUserKey = `dpu:${day}:${pageKey}:${clientId}`;
      if (!(await this.state.storage.get(dayPageUserKey))) {
        await this.state.storage.put(dayPageUserKey, true);
        dayPage.users += 1;
      }
    }

    if (type === 'visit') {
      const visitId = sessionId || `${clientId}:${day}`;
      const visitKey = `v:${visitId}`;
      if (!(await this.state.storage.get(visitKey))) {
        await this.state.storage.put(visitKey, now);
        agg.totalVisits += 1;
        d.visits += 1;
      }
      if (pageKey) {
        const pageVisitKey = `vp:${day}:${pageKey}:${visitId}`;
        if (!(await this.state.storage.get(pageVisitKey))) {
          await this.state.storage.put(pageVisitKey, now);
          ensurePageMetric(agg.pages, pageKey).visits += 1;
          ensurePageMetric(d.pages, pageKey).visits += 1;
        }
      }
    } else if (type === 'page_view') {
      agg.totalPageViews += 1;
      d.pageViews += 1;
      if (pageKey) {
        ensurePageMetric(agg.pages, pageKey).pageViews += 1;
        ensurePageMetric(d.pages, pageKey).pageViews += 1;
      }
    } else if (type === 'install_available') {
      agg.installAvailable += 1;
    } else if (type === 'pwa_installed' || type === 'pwa_first_standalone_launch') {
      if (!user.pwaInstalled) {
        user.pwaInstalled = true;
        user.installedAt = now;
        user.installSource = type === 'pwa_installed' ? 'new' : 'recovered';
        agg.pwaInstalls += 1;
        if (type === 'pwa_installed') agg.pwaNewInstalls += 1;
        else agg.pwaRecovered += 1;
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
        user.installSource = 'recovered';
        agg.pwaInstalls += 1;
        agg.pwaRecovered += 1;
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
        pwaNewInstalls: agg.pwaNewInstalls || 0,
        pwaRecovered: agg.pwaRecovered || 0,
        pwaLaunches: agg.pwaLaunches || 0,
        installAvailable: agg.installAvailable || 0,
        conversionPct: agg.totalUsers ? Math.round((agg.pwaInstalls / agg.totalUsers) * 1000) / 10 : 0,
        activePwa7,
        activePwa30,
        firstTrackingAt: agg.firstEventAt || null,
        lastTrackingAt: agg.lastEventAt || null
      },
      last7: recent(7),
      last30: recent(30),
      pages: {
        home: ensurePageMetric(agg.pages || {}, 'home'),
        guide: ensurePageMetric(agg.pages || {}, 'guide')
      },
      breakdown: {
        device: agg.usersByDevice || {},
        os: agg.usersByOS || {},
        browser: agg.usersByBrowser || {},
        country: agg.usersByCountry || {},
        installsByOS: agg.installsByOS || {},
        installsByDevice: agg.installsByDevice || {}
      },
      days: days.slice(-60).map(([date, values]) => ({
        date,
        ...values,
        pages: {
          home: ensurePageMetric(values.pages || {}, 'home'),
          guide: ensurePageMetric(values.pages || {}, 'guide')
        }
      }))
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


async function cloudflareZoneId(env) {
  const explicit = clean(env.HABRO_CF_ZONE_ID, 80);
  if (explicit) return explicit;
  const token = clean(env.HABRO_CF_API_TOKEN, 300);
  if (!token) return null;
  const r = await fetch('https://api.cloudflare.com/client/v4/zones?name=habroremote.com&status=active&per_page=5', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (!r.ok) throw new Error(`zone_lookup_http_${r.status}`);
  const payload = await r.json();
  const zone = payload && Array.isArray(payload.result) ? payload.result[0] : null;
  return zone && zone.id ? zone.id : null;
}

async function cloudflareWebHistory(env, firstTrackingAt) {
  const token = clean(env.HABRO_CF_API_TOKEN, 300);
  const accountTag = clean(env.HABRO_CF_ACCOUNT_ID, 80);
  if (!token || !accountTag) return null;

  const configuredStart = clean(env.HABRO_CF_HISTORY_START, 32);
  const start = configuredStart || '2026-08-01T00:00:00Z';
  const trackingTs = Number(firstTrackingAt || 0);
  const trackingDate = trackingTs ? new Date(trackingTs).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const end = `${trackingDate}T00:00:00Z`;
  if (Date.parse(end) <= Date.parse(start)) {
    return { available:true, source:'Cloudflare Web Analytics', rangeStart:start.slice(0,10), rangeEnd:trackingDate, totalVisits:0, totalPageViews:0, days:[] };
  }

  const query = `query HabroRUM($accountTag: string, $start: Time, $end: Time, $host: string) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        daily: rumPageloadEventsAdaptiveGroups(
          limit: 1000
          orderBy: [date_ASC]
          filter: {
            datetime_geq: $start
            datetime_lt: $end
            requestHost: $host
            bot: 0
          }
        ) {
          count
          sum { visits }
          dimensions { date }
        }
      }
    }
  }`;

  const gql = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({query,variables:{accountTag,start,end,host:'habroremote.com'}})
  });
  if (!gql.ok) throw new Error(`rum_graphql_http_${gql.status}`);
  const payload = await gql.json();
  if (payload?.errors?.length) throw new Error(payload.errors.map(e=>e.message).join(' | ').slice(0,300));
  const daily = payload?.data?.viewer?.accounts?.[0]?.daily || [];
  const days = daily.map(row=>({
    date:row?.dimensions?.date || '',
    visits:Number(row?.sum?.visits || 0),
    pageViews:Number(row?.count || 0),
    source:'cloudflare-web'
  })).filter(row=>row.date);

  return {
    available:true,
    source:'Cloudflare Web Analytics',
    rangeStart:start.slice(0,10),
    rangeEnd:trackingDate,
    totalVisits:days.reduce((n,d)=>n+d.visits,0),
    totalPageViews:days.reduce((n,d)=>n+d.pageViews,0),
    days
  };
}

async function cloudflareEdgeHistory(env, firstTrackingAt) {
  const token = clean(env.HABRO_CF_API_TOKEN, 300);
  if (!token) return null;
  const zoneTag = await cloudflareZoneId(env);
  if (!zoneTag) throw new Error('zone_not_found');

  const trackingTs = Number(firstTrackingAt || 0);
  const trackingDate = trackingTs ? new Date(trackingTs).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
  const end = `${trackingDate}T00:00:00Z`;
  const requestedStart = clean(env.HABRO_CF_HISTORY_START,32) || '2026-08-01T00:00:00Z';
  const attempts = [
    requestedStart,
    new Date(Date.parse(end)-30*86400000).toISOString(),
    new Date(Date.parse(end)-7*86400000).toISOString()
  ];

  let lastError = null;
  for (const start of attempts) {
    if (Date.parse(end) <= Date.parse(start)) continue;
    const query = `query HabroHistory($zoneTag: string, $start: Time, $end: Time, $host: string) {
      viewer {
        zones(filter: {zoneTag: $zoneTag}) {
          daily: httpRequestsAdaptiveGroups(
            limit: 1000
            orderBy: [date_ASC]
            filter: {
              datetime_geq: $start
              datetime_lt: $end
              requestSource: "eyeball"
              clientRequestHTTPHost: $host
            }
          ) {
            count
            sum { visits }
            dimensions { date }
          }
        }
      }
    }`;
    const gql=await fetch('https://api.cloudflare.com/client/v4/graphql',{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({query,variables:{zoneTag,start,end,host:'habroremote.com'}})
    });
    if(!gql.ok){lastError=new Error(`graphql_http_${gql.status}`);continue}
    const payload=await gql.json();
    if(payload?.errors?.length){lastError=new Error(payload.errors.map(e=>e.message).join(' | ').slice(0,300));continue}
    const daily=payload?.data?.viewer?.zones?.[0]?.daily||[];
    const days=daily.map(row=>({date:row?.dimensions?.date||'',visits:Number(row?.sum?.visits||0),requests:Number(row?.count||0),source:'cloudflare-edge'})).filter(row=>row.date);
    return {
      available:true,
      source:'Cloudflare HTTP Analytics',
      rangeStart:start.slice(0,10),
      rangeEnd:trackingDate,
      totalVisits:days.reduce((n,d)=>n+d.visits,0),
      totalRequests:days.reduce((n,d)=>n+d.requests,0),
      days
    };
  }
  throw lastError || new Error('cloudflare_history_unavailable');
}

async function cloudflareHistory(env, firstTrackingAt) {
  const token=clean(env.HABRO_CF_API_TOKEN,300);
  if(!token){
    return {available:false,setupRequired:true,reason:'HABRO_CF_API_TOKEN no configurado',source:'Cloudflare'};
  }

  try{
    const rum=await cloudflareWebHistory(env,firstTrackingAt);
    if(rum) return rum;
  }catch(error){
    // Fall back to edge analytics if account-level RUM access is unavailable.
  }

  try{
    const edge=await cloudflareEdgeHistory(env,firstTrackingAt);
    if(edge) return edge;
  }catch(error){
    return {
      available:false,
      setupRequired:false,
      reason:String(error&&error.message||error).slice(0,320),
      source:'Cloudflare'
    };
  }

  return {
    available:false,
    setupRequired:true,
    reason:'Configura HABRO_CF_ACCOUNT_ID para Web Analytics o HABRO_CF_ZONE_ID para HTTP Analytics.',
    source:'Cloudflare'
  };
}

async function cloudflarePathHistory(env, firstTrackingAt) {
  const token = clean(env.HABRO_CF_API_TOKEN, 300);
  if (!token) return { available:false, setupRequired:true, reason:'HABRO_CF_API_TOKEN no configurado', days:[] };

  let zoneTag;
  try { zoneTag = await cloudflareZoneId(env); } catch (_) { zoneTag = null; }
  if (!zoneTag) return { available:false, setupRequired:true, reason:'No se pudo resolver la zona de habroremote.com', days:[] };

  const trackingTs = Number(firstTrackingAt || 0);
  const trackingDate = trackingTs ? new Date(trackingTs).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
  const end = `${trackingDate}T00:00:00Z`;
  const requestedStart = clean(env.HABRO_CF_HISTORY_START,32) || '2026-08-01T00:00:00Z';
  const starts = [requestedStart, new Date(Date.parse(end)-30*86400000).toISOString(), new Date(Date.parse(end)-7*86400000).toISOString()];
  const specs = [
    { key:'home', path:'/' },
    { key:'guide', path:'/guia-instalacion/' }
  ];

  for (const start of starts) {
    if (Date.parse(end) <= Date.parse(start)) continue;
    try {
      const byDate = new Map();
      for (const spec of specs) {
        const query = `query HabroPath($zoneTag: string, $start: Time, $end: Time, $host: string, $path: string) {
          viewer {
            zones(filter: {zoneTag: $zoneTag}) {
              daily: httpRequestsAdaptiveGroups(
                limit: 1000
                orderBy: [date_ASC]
                filter: {
                  datetime_geq: $start
                  datetime_lt: $end
                  requestSource: "eyeball"
                  clientRequestHTTPHost: $host
                  clientRequestPath: $path
                }
              ) {
                count
                sum { visits }
                dimensions { date }
              }
            }
          }
        }`;
        const gql = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method:'POST',
          headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify({query,variables:{zoneTag,start,end,host:'habroremote.com',path:spec.path}})
        });
        if(!gql.ok) throw new Error(`path_graphql_http_${gql.status}`);
        const payload=await gql.json();
        if(payload?.errors?.length) throw new Error(payload.errors.map(e=>e.message).join(' | ').slice(0,300));
        const rows=payload?.data?.viewer?.zones?.[0]?.daily||[];
        for(const row of rows){
          const date=row?.dimensions?.date;
          if(!date) continue;
          if(!byDate.has(date)) byDate.set(date,{date,home:{accesses:0,visits:0},guide:{accesses:0,visits:0},source:'cloudflare-edge'});
          byDate.get(date)[spec.key]={
            accesses:Number(row?.count||0),
            visits:Number(row?.sum?.visits||0)
          };
        }
      }
      return {
        available:true,
        source:'Cloudflare HTTP Analytics · ruta exacta',
        rangeStart:start.slice(0,10),
        rangeEnd:trackingDate,
        days:[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date))
      };
    } catch (_) {}
  }
  return { available:false, setupRequired:false, reason:'No hay histórico por ruta disponible para el rango solicitado.', days:[] };
}

function combinedPageSeries(pathHistory, ownDays) {
  const byDate = new Map();
  for (const d of (pathHistory?.days || [])) {
    byDate.set(d.date, {
      date:d.date,
      source:'cloudflare',
      home:{ users:null, visits:Number(d.home?.visits||0), accesses:Number(d.home?.accesses||0) },
      guide:{ users:null, visits:Number(d.guide?.visits||0), accesses:Number(d.guide?.accesses||0) }
    });
  }
  for (const d of (ownDays || [])) {
    byDate.set(d.date, {
      date:d.date,
      source:'habro',
      home:{
        users:Number(d.pages?.home?.users||0),
        visits:Number(d.pages?.home?.visits||0),
        accesses:Number(d.pages?.home?.pageViews||0)
      },
      guide:{
        users:Number(d.pages?.guide?.users||0),
        visits:Number(d.pages?.guide?.visits||0),
        accesses:Number(d.pages?.guide?.pageViews||0)
      }
    });
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-60);
}


function combinedVisitSeries(history, ownDays) {
  const byDate = new Map();
  for (const d of (history?.days || [])) byDate.set(d.date, { date: d.date, visits: Number(d.visits || 0), source: 'cloudflare' });
  for (const d of (ownDays || [])) byDate.set(d.date, { date: d.date, visits: Number(d.visits || 0), source: 'habro' });
  return [...byDate.values()].sort((a,b) => a.date.localeCompare(b.date)).slice(-60);
}

async function analyticsSummary(request, env) {
  const configured = clean(env.HABRO_ANALYTICS_ADMIN_TOKEN, 200);
  if (!configured) {
    return Response.json({ ok:false, error:'setup_required', message:'Configura el secreto HABRO_ANALYTICS_ADMIN_TOKEN en Cloudflare.' }, { status:503, headers:{'Cache-Control':'no-store'} });
  }
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${configured}`) return Response.json({ ok:false, error:'unauthorized' }, { status:401, headers:{'Cache-Control':'no-store'} });

  const ownResponse = await analyticsStub(env).fetch('https://habro.metrics/summary');
  const own = await ownResponse.json();
  const [history, pathHistory] = await Promise.all([
    cloudflareHistory(env, own?.totals?.firstTrackingAt),
    cloudflarePathHistory(env, own?.totals?.firstTrackingAt)
  ]);
  const historicalVisits = history.available ? Number(history.totalVisits || 0) : 0;
  const lifetimeVisits = historicalVisits + Number(own?.totals?.visits || 0);
  const series = combinedVisitSeries(history, own?.days || []);

  return Response.json({
    ...own,
    historical: history,
    historicalPages: pathHistory,
    combined: {
      lifetimeVisits,
      historicalVisits,
      exactTrackedVisits: Number(own?.totals?.visits || 0),
      trackingStart: own?.totals?.firstTrackingAt || null,
      visitsSeries: series,
      pagesSeries: combinedPageSeries(pathHistory, own?.days || [])
    }
  }, { headers: { 'Cache-Control': 'no-store' } });
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
