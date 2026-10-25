import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let kit;
try { kit = await import('../adb/sessionwriter.mjs'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const dex = await readFile(new URL('../adb/vendor/sop6-sessionwriter.dex', import.meta.url));
const metadata = { format: 'apk', packageName: 'com.example.fixture', versionCode: '42', splitNames: [], extractedBytes: 4, obbCount: 0, obbEntries: [] };
const file = new File(['data'], 'fixture.apk');

function vehicle(options = {}) {
  const calls = [], uploads = new Map();
  let connected = true, installed = false;
  const adapter = {
    current: () => connected,
    async push(blob, path, signal) { signal?.throwIfAborted(); calls.push(['push', path]); uploads.set(path, BigInt(blob.size)); if (options.badUpload) uploads.set(path, 0n); },
    async size(path) { return uploads.get(path); },
    async run(wrapped, config = {}) {
      if (!connected) throw new Error('USB desconectado');
      const marker = wrapped.match(/HABRO_EXIT_[a-f0-9]+/)[0];
      const command = wrapped.split('\nhabro_exit_status=$?')[0];
      calls.push(['run', command, config]);
      let stdout = '', stderr = '', status = 0;
      if (command === 'id') stdout = options.identity || 'uid=2000(shell) gid=2000(shell)';
      else if (command === 'am get-current-user') stdout = String(options.user ?? 0);
      else if (command === 'getprop ro.build.display.id') stdout = options.build || 'G7PH_CHERY_TEST_SOP7_03_R';
      else if (command.startsWith('pm list packages')) {
        if (installed) stdout = `package:${metadata.packageName} versionCode:${options.postVersion || '42'}`;
        else if (options.existingVersion) stdout = `package:${metadata.packageName} versionCode:${options.existingVersion}`;
      } else if (command.startsWith('pm path')) stdout = installed && !options.noPath ? (options.paths || 'package:/data/app/fixture/base.apk\n') : '';
      else if (command.startsWith('dumpsys package')) stdout = `Package [${metadata.packageName}] (abc):\n    splits=[${options.splits || 'base'}]\n`;
      else if (command.includes('app_process')) {
        options.cancelDuring?.abort(new DOMException('Cancelado', 'AbortError'));
        if (options.disconnect) { connected = false; throw new Error('USB desconectado'); }
        if (options.timeout) throw new Error('El comando no ha respondido a tiempo.');
        installed = options.install !== false;
        stdout = options.output ?? `Installed package ${metadata.packageName} version 42\n`;
        stderr = options.stderr || 'Dalvik cache warning\n'; status = options.status ?? 0;
      }
      if (command.startsWith('rm -rf') && options.cleanupFails) status = 1;
      const result = { stdout: stdout + '\n' + (options.noMarker && command.includes('app_process') ? '' : marker + ':' + status + '\n'), stderr, exitCode: options.legacy ? null : status };
      config.onOutput?.(result.stdout);
      return result;
    },
  };
  return { adapter, calls, uploads };
}
const execute = async (v, options = {}) => kit.installWithSessionWriter({ file, metadata, transport: v.adapter, fetchImpl: async () => new Response(dex), ...options });

test('SessionWriter integration is present', () => assert.equal(typeof kit?.installWithSessionWriter, 'function'));

test('pinned helper is validated, expected package/version checked and own files removed', { skip: !kit }, async () => {
  const v = vehicle(); const result = await execute(v);
  assert.equal(result.status, 'success'); assert.equal(result.versionCode, '42');
  assert.equal(v.uploads.size, 2);
  assert(v.calls.some(c => c[1]?.startsWith('pm path --user 0')));
  const removals = v.calls.filter(c => c[1]?.startsWith('rm -rf'));
  assert.equal(removals.length, 1); assert.match(removals[0][1], /^rm -rf '\/data\/local\/tmp\/habro-session-[a-f0-9-]+'$/);
});

test('user, ROM, uid, changed binary and downgrade fail before uploads', { skip: !kit }, async () => {
  for (const options of [{ user: 10 }, { build: 'OTHER_ROM' }, { identity: 'uid=0(root)' }, { existingVersion: '43' }]) {
    const v = vehicle(options); await assert.rejects(execute(v)); assert.equal(v.uploads.size, 0);
  }
  const v = vehicle(); await assert.rejects(execute(v, { fetchImpl: async () => new Response(new Uint8Array(dex.length)) })); assert.equal(v.uploads.size, 0);
});

test('truncated USB upload fails without invoking helper and is cleaned up', { skip: !kit }, async () => {
  const v = vehicle({ badUpload: true }); await assert.rejects(execute(v), /transferencia|tamaño/i);
  assert(!v.calls.some(c => c[1]?.includes('app_process')));
  assert(v.calls.some(c => c[1]?.startsWith('rm -rf')));
});

test('a success-looking line cannot override failure tokens or a nonzero exit', { skip: !kit }, async () => {
  for (const options of [
    { status: 1 },
    { output: `Installed package ${metadata.packageName} version 42\nJCONFIG_INSTALL_FAILED\n` },
    { output: 'Killed\n', legacy: true },
    { output: 'Installed package com.unexpected.fixture version 42\n' },
    { output: `Installed package ${metadata.packageName} version 41\n` },
  ]) { const v = vehicle(options); await assert.rejects(execute(v)); }
});

test('legacy transport needs its own completion marker as well as positive package proof', { skip: !kit }, async () => {
  assert.equal((await execute(vehicle({ legacy: true }))).status, 'success');
  await assert.rejects(execute(vehicle({ legacy: true, noMarker: true })), error => error.uncertain === true);
});

test('existing package path alone cannot validate a mismatched version', { skip: !kit }, async () => {
  await assert.rejects(execute(vehicle({ postVersion: '41' })), error => error.uncertain === true);
  await assert.rejects(execute(vehicle({ noPath: true })), error => error.uncertain === true);
});

test('OBB skip is a partial result, not a complete success', { skip: !kit }, async () => {
  const v = vehicle({ output: `Installed package ${metadata.packageName} version 42\nJCONFIG_XAPK_OBB_SKIPPED:Android/obb/com.example.fixture/main.42.obb\n` });
  const result = await execute(v, { file: new File(['data'], 'fixture.xapk'), metadata: { ...metadata, format: 'xapk', obbCount: 1, obbEntries: ['Android/obb/com.example.fixture/main.42.obb'] } });
  assert.equal(result.status, 'partial'); assert.equal(result.obbSkipped.length, 1);
});

test('cancel during commit waits for its answer and verifies the real installed state', { skip: !kit }, async () => {
  const controller = new AbortController(), v = vehicle({ cancelDuring: controller });
  assert.equal((await execute(v, { signal: controller.signal })).status, 'success');
  const invocation = v.calls.find(c => c[1]?.includes('app_process'));
  assert.equal(invocation[2].signal, undefined);
});

test('timeout/disconnection has an uncertain outcome and leaves inputs alone', { skip: !kit }, async () => {
  for (const options of [{ timeout: true }, { disconnect: true }]) {
    const v = vehicle(options); await assert.rejects(execute(v), error => error.uncertain === true);
    assert(!v.calls.some(c => c[1]?.startsWith('rm -rf')));
  }
});

test('cleanup errors do not erase a verified installation result', { skip: !kit }, async () => {
  const result = await execute(vehicle({ cleanupFails: true }));
  assert.equal(result.status, 'success'); assert.equal(result.cleanupPending, true);
});

test('dumpsys split revision suffixes are distinct from split names', { skip: !kit }, async () => {
  const meta = { ...metadata, format: 'xapk', splitNames: ['config.xhdpi'] };
  const options = { splits: 'base:10, config.xhdpi:12', paths: 'package:/data/app/fixture/base.apk\npackage:/data/app/fixture/split.apk\n' };
  assert.equal((await execute(vehicle(options), { metadata: meta })).status, 'success');
  await assert.rejects(execute(vehicle({ ...options, splits: 'base:10, config.mdpi:12' }), { metadata: meta }), error => error.uncertain === true);
});

test('internal commit timeout and failure after Installed leave a checkable outcome', { skip: !kit }, async () => {
  for (const options of [
    { output: 'Killed\n', stderr: 'Timed out waiting for package commit result\n', status: 137 },
    { output: `Installed package ${metadata.packageName} version 42\nJCONFIG_XAPK_FAILURE:reason=internal_error\nJCONFIG_INSTALL_FAILED\n`, status: 1 },
  ]) await assert.rejects(execute(vehicle(options)), error => error.uncertain === true);
});
