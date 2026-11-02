import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../adb/core.mjs';
import * as methods from '../adb/install-method.mjs';

// Run the existing browser entry point with a minimal DOM boundary; handlers
// and state transitions are real. No test hooks are shipped in application code.
async function browser(storage = new Map()) {
  const html = await readFile(new URL('../adb/index.html', import.meta.url), 'utf8');
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1], {
    textContent: '', innerHTML: '', hidden: false, disabled: false, value: '', dataset: {}, open: false,
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, scrollIntoView() {},
    classList: { add() {}, remove() {}, toggle() {} },
  }]));
  const select = nodes.get('installerMethod');
  select.value = /<select id="installerMethod"[^>]*>\s*<option value="([^"]+)"/.exec(html)[1];
  const listeners = new Map();
  const context = vm.createContext({ ...core, ...methods, Blob, File, DOMException, AbortController, console,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    document: { getElementById: id => { assert(nodes.has(id), 'Missing DOM node ' + id); return nodes.get(id); }, querySelectorAll: () => [], documentElement: { dataset: {} }, addEventListener() {} },
    window: { addEventListener: (name, fn) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); }, scrollTo() {} },
    location: { hash: '#installer' }, navigator: {}, history: {}, setTimeout, clearTimeout,
    loadPendingInstall: undefined, savePendingInstall: undefined, clearPendingInstall: undefined,
  });
  const pending = await import('../adb/pending-install.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
  Object.assign(context, pending);
  const source = (await readFile(new URL('../adb/app.js', import.meta.url), 'utf8')).replace(/^import .+;\n/gm, '');
  vm.runInContext(source + '\nglobalThis.ui = { installer, state, installFiles };', context);
  return { nodes, ui: context.ui, pagehide: () => { for (const fn of listeners.get('pagehide') || []) fn(); } };
}

test('method change clears prior result and diagnostic while retaining uncertain attempt', async () => {
  const b = await browser(); assert.equal(b.nodes.get('installerMethod').value, 'auto');
  b.nodes.get('installerLog').textContent = 'old private diagnostic'; b.nodes.get('installerResultTitle').textContent = 'old result';
  b.nodes.get('installerDiagnostics').open = true;
  const pending = { method: 'desay', metadata: { packageName: 'com.example.app', versionCode: '42' } }; b.ui.installer.pending = pending;
  b.nodes.get('installerMethod').value = 'standard'; b.nodes.get('installerMethod').onchange();
  assert.equal(b.nodes.get('installerLog').textContent, ''); assert.equal(b.nodes.get('installerResultTitle').textContent, '');
  assert.equal(b.nodes.get('installerResult').hidden, true); assert.equal(b.nodes.get('installerDiagnostics').open, false);
  assert.equal(b.ui.installer.pending, pending); assert.equal(b.nodes.get('installerStart').disabled, true);
});
test('Apps installation entry point refuses unresolved attempt', async () => {
  const b = await browser(); b.ui.state.adb = {}; b.ui.state.user = 0;
  b.ui.installer.pending = { method: 'desay' };
  await assert.rejects(b.ui.installFiles([new File(['apk'], 'test.apk')]), /pendiente|anterior/i);
});
test('pending attempt survives reload and pagehide without exposing APK bytes', async () => {
  const { savePendingInstall } = await import('../adb/pending-install.mjs');
  const storage = new Map(), b = await browser(storage);
  const attempt = { method: 'desay', user: 0, serial: 'vehicle', temporary: '/data/local/tmp/habro-desay-12345678-1234-4123-8123-123456789abc', metadata: { format: 'apk', packageName: 'com.example.app', versionCode: '42', splitNames: [] } };
  savePendingInstall(attempt, { setItem: (k, v) => storage.set(k, v) });
  const loaded = await browser(storage); assert.equal(loaded.ui.installer.pending.serial, 'vehicle');
  loaded.pagehide(); const restored = await browser(storage);
  assert.equal(restored.ui.installer.pending.metadata.packageName, 'com.example.app');
  assert.equal(restored.nodes.get('installerStart').disabled, true);
});
