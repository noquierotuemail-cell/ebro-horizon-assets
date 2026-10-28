import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { quote } from '../adb/core.mjs';
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
  let installAllowed = options.initialIsl ?? '';
  const transport = {
    current: () => connected,
    async push(blob, path) { calls.push(['push', path]); uploads.set(path, blob); },
    async size(path) { return options.truncated ? 0n : BigInt(uploads.get(path).size); },
    async run(wrapped, config = {}) {
      const marker = /HABRO_EXIT_[a-f0-9]+/.exec(wrapped)?.[0];
      const script = wrapped.split('\nhabro_exit_status=$?')[0]; calls.push(['run', script, config]);
      let stdout = '', status = 0;
      if (script === 'setprop persist.sys.sv.isl true') { status = options.setpropFails ? 1 : 0; if (!status) installAllowed = options.islAfterSet ?? 'true'; }
      else if (script === 'getprop persist.sys.sv.isl') stdout = installAllowed;
      else if (script.startsWith('getprop ')) stdout = ({ ...properties, ...options.properties })[script.slice(8)] ?? '';
      else if (script === 'am get-current-user') stdout = String(options.user ?? 0);
      else if (script === 'id') stdout = options.identity ?? 'uid=2000(shell) gid=2000(shell)';
      else if (script.startsWith('test -d /system')) status = options.badEnvironment ? 1 : 0;
      else if (script.startsWith('mkdir -m 700') && script.includes('/runtime')) status = options.badRuntime ? 1 : 0;
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
  return { transport, calls, uploads, readIsl: () => installAllowed, reconnect: () => { connected = true; } };
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
test('missing trusted helper policy aborts without changes', async () => { const v = vehicle(); await assert.rejects(execute(v, { policy: {} }), /auxiliar.*disponible/i); assert.equal(v.uploads.size, 0); });
test('downgrade aborts without uploading', async () => { const v = vehicle({ existingVersion: '43' }); await assert.rejects(execute(v), /reciente|versión/i); assert.equal(v.uploads.size, 0); });
test('empty Desay platform property is set to true and immediately verified before helper execution', async () => {
  const v = vehicle({ initialIsl: '' }); assert.equal(v.readIsl(), '');
  assert.equal((await execute(v)).status, 'success'); assert.equal(v.readIsl(), 'true');
  const setIndex = v.calls.findIndex(c => c[1] === 'setprop persist.sys.sv.isl true');
  assert(setIndex >= 0);
  assert.equal(v.calls[setIndex + 1][1], 'getprop persist.sys.sv.isl');
  assert(v.calls.findIndex(c => c[1]?.includes('MonjiShellInstaller')) > setIndex + 1);
});
test('Desay platform property must remain exactly true or helper execution is aborted', async () => {
  for (const options of [{ islAfterSet: '' }, { islAfterSet: 'false' }, { islAfterSet: 'TRUE' }, { islAfterSet: 'true extra' }, { islAfterSet: 'true\nfalse' }, { setpropFails: true }]) {
    const v = vehicle(options); let invoking = false;
    await assert.rejects(execute(v, { onInvoking: () => { invoking = true; } }));
    assert(!invoking);
    assert(!v.calls.some(c => c[1]?.includes('MonjiShellInstaller')));
    assert(v.calls.some(c => c[1]?.startsWith('rm -rf')));
  }
});
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
  let fetched = false; await assert.rejects(providers.loadDesayHelper({ policy: {}, fetchImpl: async () => { fetched = true; } }), /disponible/i); assert.equal(fetched, false);
});

test('production policy rejects a same-size counterfeit before uploads', async () => {
  const v = vehicle();
  await assert.rejects(kit.installWithDesay({ file, metadata, transport: v.transport, helperProvider: async () => new Blob([new Uint8Array(8568)]) }), /integridad/i);
  assert.equal(v.uploads.size, 0);
});
test('production provider fails closed for unavailable private delivery', async () => {
  let fetched = false;
  await assert.rejects(providers.loadDesayHelper({ fetchImpl: async () => { fetched = true; return new Response(null, { status: 503 }); } }), /sesión protegida/i);
  assert.equal(fetched, true);
});
test('invocation shell applies runtime variables and writes numeric process evidence', async () => {
  const v = vehicle();
  const result = await execute(v, { policy: { ...policy, prepare: providers.DESAY_HELPER_POLICY.prepare } });
  const invocation = v.calls.find(c => c[1]?.includes('MonjiShellInstaller'))[1];
  const local = await mkdtemp(join(tmpdir(), 'habro runtime '));
  try {
    const runner = join(local, 'fake app_process');
    await writeFile(runner, `#!/bin/sh\nprintf '%s\\n' "$ANDROID_ROOT" "$ANDROID_DATA" "$CLASSPATH" "$BOOTCLASSPATH" "$LD_LIBRARY_PATH" "$@" > ${quote(join(local, 'observed'))}\nprintf 'Success\\n'\n`, { mode: 0o700 });
    // Replace only the external Android executable and remote filesystem root.
    // Execute HABRO's real generated shell rather than mocking printf/wait/env.
    const script = invocation.replace('/system/bin/app_process', quote(runner)).replaceAll(result.temporary, local);
    await promisify(execFile)('sh', ['-c', script], { env: { ...process.env, BOOTCLASSPATH: 'inherited-boot', LD_LIBRARY_PATH: 'inherited-libraries' } });
    assert.match(await readFile(join(local, 'helper.pid'), 'utf8'), /^\d+\n$/);
    assert.equal(await readFile(join(local, 'helper.exit'), 'utf8'), '0\n');
    assert.equal((await stat(join(local, 'helper.pid'))).mode & 0o777, 0o600);
    assert.deepEqual((await readFile(join(local, 'observed'), 'utf8')).trim().split('\n'), [
      '/system', local + '/runtime', local + '/dex_shell_helper.dex', 'inherited-boot', 'inherited-libraries', '/data/local/tmp', 'MonjiShellInstaller', local + '/application.apk',
    ]);
  } finally { await rm(local, { recursive: true, force: true }); }
});

let privateDex;
try { privateDex = await readFile(process.env.HABRO_DESAY_HELPER_PATH || new URL('../adb/.private/dex_shell_helper.dex', import.meta.url)); }
catch (error) { if (error.code !== 'ENOENT' || process.env.HABRO_DESAY_HELPER_PATH) throw error; }

test('local private DEX passes the production policy and authenticated provider', { skip: !privateDex && 'Private DEX is intentionally not committed' }, async () => {
  const blob = await providers.loadDesayHelper({ fetchImpl: async () => new Response(privateDex) });
  assert.equal(blob.size, 8568);
  assert.equal(await hash(blob), '2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15');
  assert.equal(new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 8)), 'dex\n038\0');
});
test('default production installer prepares private runtime and verifies the real helper installation', { skip: !privateDex && 'Private DEX is intentionally not committed' }, async () => {
  const v = vehicle({ output: 'monji: session=123 flags=0x116\nmonji: wrote 11 bytes\nSuccess\n' });
  const result = await kit.installWithDesay({ file, metadata, transport: v.transport, helperProvider: async () => new Blob([privateDex]) });
  assert.equal(result.status, 'success');
  const checkIndex = v.calls.findIndex(c => c[1]?.startsWith('test -d /system'));
  const prepareIndex = v.calls.findIndex(c => c[1]?.startsWith('mkdir -m 700') && c[1].includes('/runtime'));
  const invokeIndex = v.calls.findIndex(c => c[1]?.includes('MonjiShellInstaller'));
  assert(checkIndex >= 0 && prepareIndex > checkIndex && invokeIndex > prepareIndex);
  const invocation = v.calls[invokeIndex][1];
  assert.match(invocation, /ANDROID_ROOT='\/system'/);
  assert.match(invocation, /ANDROID_DATA='\/data\/local\/tmp\/habro-desay-[a-f0-9-]+\/runtime'/);
  assert.match(invocation, /CLASSPATH='[^']+\/dex_shell_helper\.dex' \/system\/bin\/app_process \/data\/local\/tmp MonjiShellInstaller '[^']+\/application\.apk'/);
  assert(!invocation.includes('--flags')); // Use the reviewed helper defaults, never enable downgrade.
  assert(!invocation.includes('BOOTCLASSPATH='));
  assert(v.calls.some(c => c[1]?.startsWith('pm path --user 0')));
});
for (const options of [{ badEnvironment: true }, { badRuntime: true }]) test('runtime preparation failure prevents helper invocation: ' + Object.keys(options)[0], { skip: !privateDex && 'Private DEX is intentionally not committed' }, async () => {
  const v = vehicle(options);
  await assert.rejects(kit.installWithDesay({ file, metadata, transport: v.transport, helperProvider: async () => new Blob([privateDex]) }));
  assert(!v.calls.some(c => c[1]?.includes('MonjiShellInstaller')));
  assert(v.calls.some(c => c[1]?.startsWith('rm -rf')));
});
test('Node-only local development provider validates the private dependency', { skip: !privateDex && 'Private DEX is intentionally not committed' }, async () => {
  const { loadLocalDesayHelper } = await import('../tools/desay-helper-local.mjs');
  const blob = await loadLocalDesayHelper({ path: process.env.HABRO_DESAY_HELPER_PATH });
  assert.equal(await hash(blob), '2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15');
});
