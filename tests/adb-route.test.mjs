import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import app from '../src/router-20260827-v2.js';
// Cloudflare's HTMLRewriter is supplied by the Worker runtime.
globalThis.HTMLRewriter = class { on() { return this; } transform(response) { return response; } };
const origin = 'https://habroremote.com';
const html = '<!doctype html><html><head><title>HABRO ADB</title></head><body>USB</body></html>';
const env = { ASSETS: { fetch: async () => new Response(html, {headers:{'content-type':'text/html'}}) } };
test('ADB canonical URL retains query and leads to the asset directory', async () => {
 const r = await app.fetch(new Request(origin+'/adb?test=1'),env,{});
 assert.equal(r.status,308);
 assert.equal(r.headers.get('location'),origin+'/adb/?test=1');
});
test('Installer modules and the pinned binary are reachable through the active Worker', async () => {
 const assets = { ASSETS: { fetch: async request => new Response(await readFile(new URL('..' + new URL(request.url).pathname, import.meta.url))) } };
 for (const path of ['/adb/installer.css', '/adb/install-archive.mjs', '/adb/sessionwriter.mjs', '/adb/vendor/SESSIONWRITER-NOTICE.txt', '/adb/vendor/sop6-sessionwriter.dex']) {
  const response = await app.fetch(new Request(origin+path), assets, {});
  assert.equal(response.status, 200, path);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(bytes, await readFile(new URL('..'+path, import.meta.url)), path);
  if (path.endsWith('.mjs')) assert.match(response.headers.get('content-type'), /javascript/);
  if (path.endsWith('.dex')) {
   assert.equal(bytes.length, 22652);
   assert.equal(createHash('sha256').update(bytes).digest('hex'), '58303723aac47a91c8a31127a99d79c57ab435ccf21fcb28a8b772495ea2e9b8');
  }
 }
});
test('ADB HTML is served without marketing code and explicitly allows same-origin USB', async () => {
 const r = await app.fetch(new Request(origin+'/adb/'),env,{});
 assert.equal(await r.text(),html);
 assert.match(r.headers.get('permissions-policy'),/usb=\(self\)/);
 assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);
});
test('ES modules have a JavaScript MIME type and preserve their bytes', async () => {
 const r = await app.fetch(new Request(origin+'/adb/core.mjs'),{ASSETS:{fetch:async()=>new Response('export const x=1',{headers:{'content-type':'application/octet-stream'}})}},{});
 assert.match(r.headers.get('content-type'),/javascript/);
 assert.equal(await r.text(),'export const x=1');
});
test('Unknown ADB paths return 404 instead of a landing page fallback', async () => {
 const r = await app.fetch(new Request(origin+'/adb/missing'),env,{});
 assert.equal(r.status,404);
});
test('Existing branded social redirects remain unchanged', async () => {
 const r = await app.fetch(new Request(origin+'/linkedin'),env,{});
 assert.equal(r.status,302);
 assert.equal(r.headers.get('location'),origin+'/');
});
test('OTA page and its assets are served intact by the existing Worker', async () => {
 const assets = { ASSETS: { fetch: async request => {
  let path = new URL(request.url).pathname;
  if (path === '/adb/ota') path += '.html';
  return new Response(await readFile(new URL('..'+path, import.meta.url)), {headers:{'content-type':'application/octet-stream'}});
 } } };
 for (const path of ['/adb/ota.html','/adb/ota','/adb/ota.js','/adb/ota.css','/adb/ota-generator.mjs']) {
  const response = await app.fetch(new Request(origin+path), assets, {});
  assert.equal(response.status, 200, path);
  const file = path === '/adb/ota' ? path+'.html' : path;
  assert.equal(await response.text(), await readFile(new URL('..'+file, import.meta.url), 'utf8'), path);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  if (/\.(mjs|js)$/.test(path)) assert.match(response.headers.get('content-type'), /javascript/);
 }
});
