import test from 'node:test';
import assert from 'node:assert/strict';
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
