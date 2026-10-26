import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import app, { HabroMetrics } from '../src/router-20260827-v2.js';

globalThis.HTMLRewriter = class { on() { return this; } transform(response) { return response; } };
const origin = 'https://habroremote.com';
const html = '<!doctype html><html><head><title>HABRO ADB</title></head><body>USB</body></html>';

function authEnv(assetFetch = async () => new Response(html, {headers:{'content-type':'text/html'}})) {
  const stub = {
    async fetch(url, init = {}) {
      const path = new URL(url).pathname;
      const body = init.body ? JSON.parse(init.body) : {};
      if (path === '/adb/validate') return Response.json({ok:true,valid:body.session === 'a'.repeat(64)});
      if (path === '/adb/redeem') return body.token === 'b'.repeat(64)
        ? Response.json({ok:true,session:'a'.repeat(64),expiresAt:Date.now()+86400000})
        : Response.json({ok:false,error:'invalid_or_used_token'},{status:401});
      if (path === '/adb/mint') return Response.json({ok:true,token:'b'.repeat(64),persistent:body.persistent === true,twelveHours:body.twelveHours === true,expiresAt:body.persistent === true?null:Date.now()+(body.twelveHours===true?43200000:1800000),sessionTtlMs:86400000});
      if (path === '/adb/registry') return Response.json({ok:true,records:[]});
      return new Response('Not found',{status:404});
    }
  };
  return {
    ASSETS:{fetch:assetFetch},
    HABRO_METRICS:{idFromName:()=> 'global', get:()=> stub},
    HABRO_ANALYTICS_ADMIN_TOKEN:'admin-secret'
  };
}
const authed = { Cookie:'habro_adb_session=' + 'a'.repeat(64) };

test('ADB canonical URL retains query and leads to the asset directory', async () => {
  const r = await app.fetch(new Request(origin+'/adb?test=1'),authEnv(),{});
  assert.equal(r.status,308);
  assert.equal(r.headers.get('location'),origin+'/adb/?test=1');
});

test('ADB redirects anonymous navigation to the one-time-token login', async () => {
  const r = await app.fetch(new Request(origin+'/adb/',{headers:{Accept:'text/html'}}),authEnv(),{});
  assert.equal(r.status,302);
  assert.match(r.headers.get('location'), /^https:\/\/habroremote\.com\/adb\/access\?next=/);
});

test('ADB access page uses the official HABRO identity', async () => {
  const r = await app.fetch(new Request(origin+'/adb/access',{headers:{Accept:'text/html'}}),authEnv(),{});
  assert.equal(r.status,200);
  const body = await r.text();
  assert.match(body,/habro-remoteapp-horizontal-v8641\.svg/);
  assert.match(body,/\/assets\/app-icon\.webp/);
  assert.match(body,/Acceso privado a HABRO ADB/);
  assert.match(r.headers.get('content-security-policy'),/img-src 'self'/);
});

test('tokens in query strings are never redeemed', async () => {
  const r = await app.fetch(new Request(origin+'/adb/access?token='+ 'b'.repeat(64),{headers:{Accept:'text/html'}}),authEnv(),{});
  assert.equal(r.status,200);
  assert.equal(r.headers.get('set-cookie'),null);
  assert.match(await r.text(),/Introduce tu token/);
});

test('A valid session can load the protected installer resources', async () => {
  const assets = authEnv(async request => new Response(await readFile(new URL('..' + new URL(request.url).pathname, import.meta.url))));
  for (const path of ['/adb/installer.css', '/adb/install-archive.mjs', '/adb/sessionwriter.mjs', '/adb/vendor/sop6-sessionwriter.dex']) {
    const response = await app.fetch(new Request(origin+path,{headers:authed}), assets, {});
    assert.equal(response.status,200,path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(bytes, await readFile(new URL('..'+path, import.meta.url)), path);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.match(response.headers.get('x-robots-tag'),/noindex/);
    if (path.endsWith('.dex')) {
      assert.equal(bytes.length,22652);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),'58303723aac47a91c8a31127a99d79c57ab435ccf21fcb28a8b772495ea2e9b8');
    }
  }
});

test('sensitive downloadable bundle and integration notice are no longer web routes', async () => {
  const env = authEnv(async request => new Response('should not be served'));
  for (const path of ['/adb/HABRO-ADB-recursos.zip','/adb/vendor/SESSIONWRITER-NOTICE.txt','/adb/code-generator.mjs','/adb/ota-generator.mjs']) {
    const r=await app.fetch(new Request(origin+path,{headers:authed}),env,{});
    assert.equal(r.status,404,path);
  }
});

test('admin token generator requires a recipient and offers 12h and persistent modes', async () => {
  const r = await app.fetch(new Request(origin+'/admin/adb-access',{headers:{Accept:'text/html'}}),authEnv(),{});
  assert.equal(r.status,200);
  const body = await r.text();
  assert.match(body,/name="label"[^>]*required/);
  assert.match(body,/Entregado a/);
  assert.match(body,/name="twelveHours"/);
  assert.match(body,/Token válido 12 horas/);
  assert.match(body,/name="persistent"/);
  assert.match(body,/Permitir token persistente/);
  assert.match(body,/Ver registro/);
});

test('30m, 12h and persistent token modes are distinct and registry tracks recipients and use', async () => {
  class MemoryStorage {
    constructor(){ this.map = new Map(); }
    async get(key){ return this.map.get(key); }
    async put(key,value){ this.map.set(key, structuredClone(value)); }
    async delete(key){ this.map.delete(key); }
    async list({prefix}={}) {
      return new Map([...this.map.entries()].filter(([key]) => !prefix || key.startsWith(prefix)));
    }
    async transaction(fn){ return fn(this); }
  }
  const metrics = new HabroMetrics({storage:new MemoryStorage()},{});
  const call = (path, body={}) => metrics.fetch(new Request('https://habro.metrics'+path,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  }));

  let r = await call('/adb/mint',{persistent:true,label:'Ana · S900'});
  const persistent = await r.json();
  assert.equal(persistent.persistent,true);
  assert.equal(persistent.twelveHours,false);
  assert.equal(persistent.expiresAt,null);
  for (let i=0;i<2;i++) {
    r = await call('/adb/redeem',{token:persistent.token});
    assert.equal(r.status,200);
    assert.equal((await r.json()).persistent,true);
  }

  const before12 = Date.now();
  r = await call('/adb/mint',{twelveHours:true,label:'Taller Norte'});
  const twelve = await r.json();
  assert.equal(twelve.persistent,false);
  assert.equal(twelve.twelveHours,true);
  assert.ok(twelve.expiresAt >= before12 + 12*60*60*1000);
  assert.ok(twelve.expiresAt <= Date.now() + 12*60*60*1000 + 1000);
  r = await call('/adb/redeem',{token:twelve.token});
  assert.equal(r.status,200);
  r = await call('/adb/redeem',{token:twelve.token});
  assert.equal(r.status,401);

  const before30 = Date.now();
  r = await call('/adb/mint',{label:'Carlos'});
  const once = await r.json();
  assert.equal(once.persistent,false);
  assert.equal(once.twelveHours,false);
  assert.ok(once.expiresAt >= before30 + 30*60*1000);
  assert.ok(once.expiresAt <= Date.now() + 30*60*1000 + 1000);

  r = await call('/adb/mint',{persistent:true,twelveHours:true,label:'Inválido'});
  assert.equal(r.status,400);
  r = await call('/adb/mint',{});
  assert.equal(r.status,400);

  r = await call('/adb/registry');
  assert.equal(r.status,200);
  const registry = (await r.json()).records;
  const ana = registry.find(x => x.label === 'Ana · S900');
  const taller = registry.find(x => x.label === 'Taller Norte');
  const carlos = registry.find(x => x.label === 'Carlos');
  assert.ok(ana && taller && carlos);
  assert.equal(ana.persistent,true);
  assert.equal(ana.redemptionCount,2);
  assert.ok(ana.lastUsedAt);
  assert.equal(taller.twelveHours,true);
  assert.equal(taller.redemptionCount,1);
  assert.ok(taller.usedAt);
  assert.equal(carlos.redemptionCount,0);
  assert.equal(carlos.expired,false);
  assert.match(ana.id,/^[0-9a-f]{10}$/);
});


test('one-time token exchange establishes an HttpOnly ADB session', async () => {
  const body=new URLSearchParams({token:'b'.repeat(64),next:'/adb/ota'});
  const r=await app.fetch(new Request(origin+'/adb/access',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body}),authEnv(),{});
  assert.equal(r.status,303);
  assert.equal(r.headers.get('location'),'/adb/ota');
  assert.match(r.headers.get('set-cookie'),/HttpOnly/);
  assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
});

test('server-side OTA endpoint preserves the existing output', async () => {
  const r=await app.fetch(new Request(origin+'/adb/api/ota',{method:'POST',headers:{...authed,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({vin:'123456',date:'2026-10-25'})}),authEnv(),{});
  assert.equal(r.status,200);
  assert.equal((await r.json()).code,'204800');
});

test('unknown authenticated ADB paths return 404', async () => {
  const r=await app.fetch(new Request(origin+'/adb/missing',{headers:authed}),authEnv(),{});
  assert.equal(r.status,404);
});

test('existing branded social redirects remain unchanged', async () => {
  const r=await app.fetch(new Request(origin+'/linkedin'),authEnv(),{});
  assert.equal(r.status,302);
  assert.equal(r.headers.get('location'),origin+'/');
});
