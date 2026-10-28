import test from 'node:test';
import assert from 'node:assert/strict';
const methods = await import('../adb/install-method.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const kit = await import('../adb/desay-installer.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const providers = await import('../adb/desay-helper.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const hash = async blob => Buffer.from(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())).toString('hex');
const file = new File(['fixture apk'], 'fixture.apk');
// Synthetic bytes, not the private helper. The preparation hook only models a contract.
const helper = new Blob(['synthetic helper fixture']);
const policy = { size: helper.size, sha256: await hash(helper), prepare: async ({ run }) => { await run('fixture-prepare'); } };
const metadata = { format: 'apk', packageName: 'com.example.fixture', versionCode: '42', splitNames: [] };
const properties = {
  'ro.product.model': 'DesaySV', 'ro.product.manufacturer': 'DesaySV',
  'ro.product.device': 'msmnile_gvmq', 'ro.build.display.id': 'G7PH_CHERY_T1E24_INT_CS_SOP3_03_16570_250806_R',
  'ro.build.fingerprint': 'DesaySV/fixture', 'ro.build.version.release': '11', 'ro.build.version.sdk': '30',
};
function vehicle(options = {}) {
  const calls = [], uploads = new Map(); let installed = false, connected = true;
  const transport = {
    current: () => connected,
    async push(blob, path) { calls.push(['push', path]); uploads.set(path, blob); },
    async size(path) { return options.truncated ? 0n : BigInt(uploads.get(path).size); },
    async run(wrapped, config = {}) {
      const marker = /HABRO_EXIT_[a-f0-9]+/.exec(wrapped)?.[0];
      const script = wrapped.split('\nhabro_exit_status=$?')[0]; calls.push(['run', script, config]);
      let stdout = '', status = 0;
      if (script.startsWith('getprop ')) stdout = ({ ...properties, ...options.properties })[script.slice(8)] ?? '';
      else if (script === 'am get-current-user') stdout = String(options.user ?? 0);
      else if (script === 'id') stdout = options.identity ?? 'uid=2000(shell) gid=2000(shell)';
      else if (script.startsWith('if [ -f ')) stdout = options.running ? 'running' : options.unknownProcess ? 'unknown' : 'stopped';
      else if (script.startsWith('pm list packages')) {
        const version = installed ? (options.finalVersion ?? '42') : options.existingVersion;
        if (version) stdout = `package:${options.finalPackage && installed ? options.finalPackage : metadata.packageName} versionCode:${version}`;
      } else if (script.startsWith('pm path')) stdout = options.noPath ? '' : 'package:/data/app/fixture/base.apk';
      else if (script.startsWith('sha256sum ')) {
        const path = /'([^']+)'/.exec(script)[1];
        stdout = (options.badRemoteHash ? '0'.repeat(64) : await hash(uploads.get(path))) + '  ' + path;
      } else if (script.includes('MonjiShellInstaller')) {
        installed = options.install !== false;
        if (options.disconnect) { connected = false; throw new Error('USB desconectado'); }
        if (options.timeout) throw new Error('Tiempo agotado');
        stdout = options.output ?? 'Success'; status = options.exitCode ?? 0;
      } else if (script.startsWith('rm -rf') && options.cleanupFails) status = 1;
      return { stdout: stdout + '\n' + (options.noMarker && script.includes('MonjiShellInstaller') ? '' : `${marker}:${status}\n`), stderr: '', exitCode: options.legacy ? null : status };
    },
  };
  return { transport, calls, uploads, reconnect: () => { connected = true; } };
}
const execute = (v, extra = {}) => kit.installWithDesay({ file, metadata, transport: v.transport, policy, helperProvider: async () => helper, ...extra });

test('automatic installer API exists', () => {
  assert.equal(typeof methods.selectInstallMethod, 'function');
  assert.equal(typeof kit.installWithDesay, 'function');
});
for (const [name, props, format, expected] of [
  ['DesaySV SOP3', properties, 'apk', 'desay'],
  ['DesaySV SOP7', { ...properties, 'ro.build.display.id': 'G7PH_CHERY_SOP7' }, 'apk', 'desay'],
  ['G7PH without known SOP', { ...properties, 'ro.product.model': 'EBRO', 'ro.product.manufacturer': 'Other', 'ro.build.fingerprint': 'other/fixture', 'ro.build.display.id': 'G7PH_CHERY_UNKNOWN' }, 'apk', 'desay'],
  ['non Desay Android', { ...properties, 'ro.product.model': 'Pixel', 'ro.product.manufacturer': 'Google', 'ro.build.fingerprint': 'google/fixture', 'ro.build.display.id': 'TEST' }, 'apk', 'standard'],
  ['XAPK', properties, 'xapk', 'sessionwriter'],
]) test(name + ' selects ' + expected, async () => {
  const v = vehicle({ properties: props }); const profile = await methods.readDeviceProfile(v.transport);
  assert.equal(methods.selectInstallMethod(format, profile), expected);
  for (const key of Object.keys(properties)) assert(v.calls.some(c => c[1] === 'getprop ' + key));
  assert(v.calls.some(c => c[1] === 'am get-current-user')); assert(v.calls.some(c => c[1] === 'id'));
});

test('incomplete profile cannot silently select standard', () => assert.throws(() => methods.selectInstallMethod('apk', null)));
for (const [key, value] of [['ro.product.model', 'DesaySV'], ['ro.product.manufacturer', 'DesaySV'], ['ro.build.fingerprint', 'DesaySV/test'], ['ro.build.display.id', 'G7PH_CHERY_NEW']]) test(key + ' alone identifies the compatible platform', async () => {
  const p = Object.fromEntries(Object.keys(properties).map(k => [k, ''])); p[key] = value;
  const profile = await methods.readDeviceProfile(vehicle({ properties: p }).transport);
  assert.equal(methods.selectInstallMethod('apk', profile), 'desay');
});
test('missing properties on unknown Android block automatic routing', async () => {
  await assert.rejects(methods.readDeviceProfile(vehicle({ properties: { 'ro.product.manufacturer': '' , 'ro.build.display.id': '', 'ro.product.model': 'Other', 'ro.build.fingerprint': 'Other' } }).transport));
});
test('Desay user other than zero is rejected', async () => { const v = vehicle({ user: 10 }); await assert.rejects(execute(v), /usuario Android 0/i); assert.equal(v.uploads.size, 0); });
test('Desay identity other than uid=2000(shell) is rejected', async () => { const v = vehicle({ identity: 'uid=0(root)' }); await assert.rejects(execute(v), /shell/i); assert.equal(v.uploads.size, 0); });
test('wrong helper hash aborts before uploading', async () => { const v = vehicle(); await assert.rejects(execute(v, { helperProvider: async () => new Blob(['x'.repeat(helper.size)]) }), /integridad/i); assert.equal(v.uploads.size, 0); });
test('missing trusted helper policy aborts without changes', async () => { const v = vehicle(); await assert.rejects(execute(v, { policy: undefined }), /auxiliar.*disponible/i); assert.equal(v.uploads.size, 0); });
test('downgrade aborts without uploading', async () => { const v = vehicle({ existingVersion: '43' }); await assert.rejects(execute(v), /reciente|versión/i); assert.equal(v.uploads.size, 0); });
for (const [name, opts] of [['incomplete transfer', { truncated: true }], ['corrupt remote transfer', { badRemoteHash: true }]]) test(name + ' aborts before invocation', async () => {
  const v = vehicle(opts); await assert.rejects(execute(v), /transferencia|integridad/i);
  assert(!v.calls.some(c => c[1]?.includes('MonjiShellInstaller')));
});
test('verified installation checks package version and path then removes only its own directory', async () => {
  const v = vehicle(); const result = await execute(v); assert.equal(result.status, 'success'); assert.equal(result.versionCode, '42');
  assert.equal(v.uploads.size, 2); assert(v.calls.some(c => c[1] === 'fixture-prepare'));
  assert(v.calls.some(c => c[1]?.startsWith('pm path')));
  const removals = v.calls.filter(c => c[1]?.startsWith('rm -rf'));
  assert.equal(removals.length, 1); assert.match(removals[0][1], /^rm -rf '\/data\/local\/tmp\/habro-desay-[a-f0-9-]+'$/);
  const invoke = v.calls.find(c => c[1]?.includes('MonjiShellInstaller')); assert(!invoke[2].signal);
});
for (const [name, opts] of [['wrong final version', { finalVersion: '41' }], ['wrong final package', { finalPackage: 'com.other.app' }], ['missing path', { noPath: true }], ['disconnect', { disconnect: true }], ['timeout', { timeout: true }], ['missing completion marker', { noMarker: true, legacy: true }]]) test(name + ' never reports success and preserves uncertain inputs', async () => {
  const v = vehicle(opts); await assert.rejects(execute(v), error => error.uncertain === true);
  assert(!v.calls.some(c => c[1]?.startsWith('rm -rf')));
});
test('cleanup failure retains verified success and warns', async () => assert.equal((await execute(vehicle({ cleanupFails: true }))).cleanupPending, true));
test('reconnected cleanup verifies first and rejects foreign paths', async () => {
  const v = vehicle(); await execute(v);
  v.calls.length = 0;
  await kit.verifyAndCleanDesay(v.transport, metadata, '/data/local/tmp/habro-desay-12345678-1234-4123-8123-123456789abc');
  assert(v.calls.findIndex(c => c[1]?.startsWith('pm list packages')) < v.calls.findIndex(c => c[1]?.startsWith('rm -rf')));
  assert(v.calls.at(-1)[1].startsWith('rm -rf'));
  await assert.rejects(kit.verifyAndCleanDesay(v.transport, metadata, '/data/local/tmp/other'));
});
test('recovery cannot clean or unlock while same-version helper is still active', async () => {
  const v = vehicle({ existingVersion: '42', disconnect: true, running: true }); let attempt;
  await assert.rejects(execute(v, { onInvoking: info => { attempt = info; } })); v.reconnect();
  assert(attempt?.temporary);
  await assert.rejects(kit.verifyAndCleanDesay(v.transport, metadata, attempt.temporary), /curso|proceso/i);
  assert(!v.calls.some(c => c[1]?.startsWith('rm -rf')));
});
test('completed rejected install is checked, resolved as failure and can be retried', async () => {
  const options = { install: false, output: 'Failure [INSTALL_FAILED_USER_RESTRICTED]', exitCode: 1 };
  const v = vehicle(options); let attempt;
  await assert.rejects(execute(v, { onInvoking: info => { attempt = info; } }));
  const result = await kit.verifyAndCleanDesay(v.transport, metadata, attempt?.temporary);
  assert.equal(result.status, 'failed'); assert.equal(result.actualVersion, null);
  assert(v.calls.some(c => c[1]?.startsWith('rm -rf')));
  options.install = true; delete options.output; delete options.exitCode;
  assert.equal((await execute(v)).status, 'success');
});
test('unknown process evidence keeps recovery pending', async () => {
  const v = vehicle({ timeout: true, unknownProcess: true }); let attempt;
  await assert.rejects(execute(v, { onInvoking: info => { attempt = info; } }));
  await assert.rejects(kit.verifyAndCleanDesay(v.transport, metadata, attempt.temporary));
  assert(!v.calls.some(c => c[1]?.startsWith('rm -rf')));
});
test('failure to save recovery metadata prevents invocation', async () => {
  const v = vehicle(); await assert.rejects(execute(v, { onInvoking: () => { throw new Error('storage unavailable'); } }));
  assert(!v.calls.some(c => c[1]?.includes('MonjiShellInstaller')));
});
test('helper provider is authenticated and refuses redirects', async () => {
  let init;
  const blob = await providers.loadDesayHelper({ policy, fetchImpl: async (url, options) => { assert.equal(url, '/adb/api/desay-helper'); init = options; return new Response(helper); } });
  assert.equal(await hash(blob), policy.sha256); assert.equal(init.credentials, 'same-origin'); assert.equal(init.redirect, 'error');
});
test('helper provider rejects corrupt bytes and unavailable policy', async () => {
  await assert.rejects(providers.loadDesayHelper({ policy, fetchImpl: async () => new Response(new Uint8Array(helper.size)) }), /integridad/i);
  let fetched = false; await assert.rejects(providers.loadDesayHelper({ fetchImpl: async () => { fetched = true; } }), /disponible/i); assert.equal(fetched, false);
});
