import { quote, validPackage } from './core.mjs';
import { command, parsePackageVersion, verifyInstallation } from './sessionwriter.mjs';
import { readDeviceProfile, isDesay } from './install-method.mjs';
import { DESAY_HELPER_POLICY, loadDesayHelper, requireHelperPolicy, sha256, validateHelper } from './desay-helper.mjs';

export async function verifyAndCleanDesay(transport, metadata, temporary) {
  if (!/^\/data\/local\/tmp\/habro-desay-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(temporary || '')) throw new Error('La carpeta temporal no pertenece a este instalador.');
  validPackage(metadata.packageName);
  const process = await command(transport, `if [ -f ${quote(temporary + '/helper.exit')} ]; then printf 'stopped';
elif [ -f ${quote(temporary + '/helper.pid')} ]; then
  habro_pid=$(cat ${quote(temporary + '/helper.pid')})
  case "$habro_pid" in ''|*[!0-9]*) printf 'unknown';; *) if [ -d "/proc/$habro_pid" ]; then printf 'running'; else printf 'stopped'; fi;; esac
else printf 'unknown'; fi`);
  if (process.stdout.trim() !== 'stopped') throw new Error('El proceso anterior sigue en curso o no se ha podido confirmar su terminación. Conserva la conexión y vuelve a comprobarlo.');
  // A completed rejection is a resolved failure, not an endless pending success.
  const version = await command(transport, `pm list packages --show-versioncode --user 0 ${quote(metadata.packageName)}`);
  const actual = parsePackageVersion(version.stdout, metadata.packageName);
  const result = actual === BigInt(metadata.versionCode)
    ? { ...await verifyInstallation(transport, metadata, 0), status: 'success' }
    : { status: 'failed', packageName: metadata.packageName, actualVersion: actual === null ? null : String(actual) };
  try { await command(transport, `rm -rf ${quote(temporary)}`, { timeout: 10000 }); }
  catch { result.cleanupPending = true; }
  return result;
}

export async function installWithDesay({ file, metadata, transport, signal, onStage = () => {}, onLog = () => {}, onInvoking = () => {}, policy = DESAY_HELPER_POLICY, helperProvider = loadDesayHelper }) {
  validPackage(metadata.packageName);
  if (metadata.format !== 'apk' || !/^\d+$/.test(metadata.versionCode) || metadata.splitNames?.length !== 0 || !file.size) throw new Error('El archivo no tiene una identidad APK válida.');
  const temporary = '/data/local/tmp/habro-desay-' + crypto.randomUUID();
  const apkPath = temporary + '/application.apk', dexPath = temporary + '/dex_shell_helper.dex';
  let created = false, invoked = false, verified = false, result, error, transcript = '';
  const log = chunk => { transcript = (transcript + chunk).slice(-64000); onLog(chunk); };
  const run = (script, options = {}) => command(transport, script, { signal, ...options });
  const checkVersion = async () => {
    const before = await run(`pm list packages -u --show-versioncode ${quote(metadata.packageName)}`);
    const current = parsePackageVersion(before.stdout, metadata.packageName);
    if (current !== null && current > BigInt(metadata.versionCode)) throw new Error('Ya hay una versión más reciente instalada. No se hará una bajada de versión.');
  };
  try {
    signal?.throwIfAborted(); onStage('Comprobando el sistema…');
    const profile = await readDeviceProfile(transport, { signal });
    log('Perfil avanzado: ' + JSON.stringify(profile) + '\n');
    if (!isDesay(profile)) throw new Error('Este método avanzado no es compatible con el sistema detectado.');
    if (profile.user !== 0) throw new Error('Este método requiere el usuario Android 0 activo.');
    if (!/^uid=2000\(shell\)(?:\s|$)/.test(profile.identity)) throw new Error('Este método requiere uid=2000(shell).');
    await checkVersion();
    onStage('Comprobando el auxiliar de instalación…'); requireHelperPolicy(policy);
    const helper = await validateHelper(await helperProvider({ signal, policy }), policy);
    const apkHash = await sha256(file);
    await run(`mkdir -m 700 ${quote(temporary)}`); created = true;
    for (const [blob, path, expectedHash] of [[file, apkPath, apkHash], [helper, dexPath, policy.sha256]]) {
      signal?.throwIfAborted(); onStage('Enviando y comprobando los archivos…');
      await transport.push(blob, path, signal, path === apkPath ? file.name : 'auxiliar de instalación');
      if (BigInt(await transport.size(path, signal)) !== BigInt(blob.size)) throw new Error('La transferencia está incompleta: el tamaño en el coche no coincide.');
      const remote = await run(`sha256sum ${quote(path)}`);
      if (remote.stdout.trim().split(/\s+/)[0] !== expectedHash) throw new Error('La integridad de la transferencia no coincide.');
    }
    onStage('Preparando la instalación…');
    const environment = await policy.prepare({ run, temporary, apkPath, dexPath, signal });
    // Apply assignments in the invocation shell, not a previous short-lived one.
    const environmentPrefix = ['ANDROID_ROOT', 'ANDROID_DATA'].filter(key => environment?.[key] !== undefined).map(key => {
      if (typeof environment[key] !== 'string') throw new Error('El entorno del auxiliar no es válido.');
      return `${key}=${quote(environment[key])} `;
    }).join('');
    await checkVersion(); signal?.throwIfAborted();
    onStage('Instalando la aplicación. Mantén el cable conectado…');
    // The UI persists this intent before the command can reach Android.
    await onInvoking({ temporary });
    invoked = true;
    // Cancellation/closing a shell is not rollback. Always verify after execution.
    const execution = await command(transport, `umask 077
${environmentPrefix}CLASSPATH=${quote(dexPath)} /system/bin/app_process /data/local/tmp MonjiShellInstaller ${quote(apkPath)} &
habro_install_pid=$!
printf '%s\\n' "$habro_install_pid" > ${quote(temporary + '/helper.pid')}
wait "$habro_install_pid"
habro_helper_status=$?
printf '%s\\n' "$habro_helper_status" > ${quote(temporary + '/helper.exit')}
(exit "$habro_helper_status")`, { timeout: 300000, check: false, onOutput: log });
    if (execution.exitCode !== 0 || /INSTALL_FAILED_|(?:^|\n)\s*(?:Failure\b|Killed\b)|(?:Exception|Error):/m.test(execution.stdout + '\n' + execution.stderr)) {
      throw Object.assign(new Error('Android no ha confirmado la instalación. Revisa el diagnóstico avanzado.'), execution);
    }
    onStage('Verificando la aplicación instalada…');
    const installed = await verifyInstallation(transport, metadata, 0); verified = true;
    result = { ...installed, status: 'success', obbSkipped: [], temporary, cleanupPending: false };
  } catch (cause) {
    error = cause instanceof Error ? cause : new Error(String(cause));
    if (invoked && !verified) { error.uncertain = true; error.temporary = temporary; }
  } finally {
    if (created && (!invoked || verified) && transport.current()) {
      try { await command(transport, `rm -rf ${quote(temporary)}`, { timeout: 10000 }); }
      catch { if (result) result.cleanupPending = true; log('\nLimpieza pendiente: ' + temporary + '\n'); }
    } else if (created) log('\nTemporales conservados hasta comprobar el resultado: ' + temporary + '\n');
  }
  if (error) { error.diagnostic = (transcript + '\n' + error.message + '\n' + (error.stdout || '') + '\n' + (error.stderr || '')).slice(-64000); throw error; }
  result.diagnostic = transcript;
  return result;
}
