import { quote, validPackage, packagePaths } from './core.mjs';

export const SESSIONWRITER = Object.freeze({
  url: new URL('./vendor/sop6-sessionwriter.dex', import.meta.url),
  size: 22652,
  sha256: '58303723aac47a91c8a31127a99d79c57ab435ccf21fcb28a8b772495ea2e9b8',
});
const EXTRACT = '/data/local/tmp/_cust_x_extract';
const nonce = () => crypto.randomUUID().replaceAll('-', '');
const joined = result => [result.stdout, result.stderr].filter(Boolean).join('\n');

function failure(message, fields = {}) { return Object.assign(new Error(message), fields); }

// The nonce also gives legacy ADB a real shell completion status. A closed
// socket, a partial success line, or `exitCode: null` is never completion proof.
async function command(transport, script, options = {}) {
  if (!transport.current()) throw failure('La conexión USB ha cambiado. Vuelve a conectar el coche.');
  options.signal?.throwIfAborted();
  const marker = 'HABRO_EXIT_' + nonce();
  const wrapped = `${script}\nhabro_exit_status=$?\nprintf '\\n${marker}:%s\\n' "$habro_exit_status"\nexit "$habro_exit_status"`;
  const result = await transport.run(wrapped, { ...options, check: false });
  const matches = [...result.stdout.matchAll(new RegExp('^' + marker + ':(\\d+)\\r?$', 'gm'))];
  if (matches.length !== 1) throw failure('No se recibió la confirmación de fin del comando.', { ...result, incomplete: true });
  const exitCode = Number(matches[0][1]);
  const output = { stdout: result.stdout.replace(matches[0][0], '').trim(), stderr: result.stderr, exitCode };
  if (result.exitCode !== null && result.exitCode !== exitCode) throw failure('La respuesta del proceso está incompleta.', { ...output, incomplete: true });
  if (options.check !== false && exitCode !== 0) throw failure(joined(output).trim() || `Android devolvió el código ${exitCode}.`, output);
  return output;
}

export function parsePackageVersion(output, packageName) {
  validPackage(packageName);
  const versions = [];
  for (const line of output.trim().split(/\r?\n/).filter(Boolean)) {
    const match = /^package:([A-Za-z][A-Za-z0-9_.]*) versionCode:(\d+)$/.exec(line.trim());
    if (!match) throw failure('Android no ha permitido comprobar las versiones instaladas.');
    if (match[1] === packageName) versions.push(BigInt(match[2]));
  }
  return versions.length ? versions.reduce((a, b) => a > b ? a : b) : null;
}

export function installationDiagnosis(output) {
  if (/Downgrade detected|INSTALL_FAILED_VERSION_DOWNGRADE/i.test(output)) return 'Ya hay una versión más reciente. Elige un archivo con una versión igual o superior.';
  if (/signatures? do not match|INSTALL_FAILED_UPDATE_INCOMPATIBLE|INSTALL_PARSE_FAILED_INCONSISTENT_CERTIFICATES/i.test(output)) return 'La firma del archivo no coincide con la aplicación instalada. Usa una actualización firmada por el mismo desarrollador.';
  if (/Restriction prevents installing|DISALLOW_INSTALL_APPS|INSTALL_FAILED_USER_RESTRICTED/i.test(output)) return 'El sistema mantiene la restricción de instalación. Este método no ha funcionado en esta ROM.';
  if (/INSTALL_FAILED_INVALID_APK|INSTALL_PARSE_FAILED|JCONFIG_XAPK_FAILURE:reason=(?:invalid|manifest|apk|zip|entry|unsupported)/i.test(output)) return 'Android ha rechazado el archivo o su estructura. Comprueba que sea un APK o XAPK completo y compatible.';
  if (/INSTALL_FAILED_INSUFFICIENT_STORAGE|No space left on device/i.test(output)) return 'No hay espacio suficiente en el coche para completar la instalación.';
  if (/INSTALL_FAILED_NO_MATCHING_ABIS/i.test(output)) return 'La aplicación no incluye una versión compatible con el procesador del coche.';
  return '';
}

async function helperBlob(fetchImpl, signal) {
  const response = await fetchImpl(SESSIONWRITER.url, { signal, cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw failure('No se ha podido descargar el auxiliar de instalación de HABRO.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== SESSIONWRITER.size) throw failure('El tamaño del auxiliar de instalación no coincide. Recarga la página.');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== SESSIONWRITER.sha256) throw failure('La comprobación de integridad del auxiliar de instalación ha fallado.');
  return new Blob([bytes], { type: 'application/octet-stream' });
}

export async function verifyInstallation(transport, metadata, user = 0) {
  if (!Number.isInteger(user) || user < 0) throw failure('Usuario Android no válido.');
  const pkg = validPackage(metadata.packageName), expected = BigInt(metadata.versionCode);
  const version = await command(transport, `pm list packages --show-versioncode --user ${user} ${quote(pkg)}`);
  if (parsePackageVersion(version.stdout, pkg) !== expected) throw failure(`La versión esperada todavía no aparece instalada para el usuario ${user}.`);
  const result = await command(transport, `pm path --user ${user} ${quote(pkg)}`);
  const paths = packagePaths(result.stdout);
  if (paths.length !== metadata.splitNames.length + 1) throw failure('Android no ha confirmado todos los APK de la instalación.');
  if (metadata.format === 'xapk') {
    const dump = await command(transport, `dumpsys package ${quote(pkg)}`);
    const start = dump.stdout.indexOf('Package [' + pkg + ']');
    const block = start < 0 ? '' : dump.stdout.slice(start).split(/\n\s*Package \[/)[0];
    const listed = /\bsplits=\[([^\]]*)\]/.exec(block)?.[1];
    if (listed === undefined) throw failure('Android no ha permitido verificar las partes del XAPK.');
    const names = listed.split(',').map(s => {
      const match = /^([A-Za-z0-9_.-]+)(?::\d+)?$/.exec(s.trim());
      if (!match) throw failure('Android ha devuelto una lista de partes no reconocida.');
      return match[1];
    });
    if (names.filter(name => name === 'base').length !== 1 || new Set(names).size !== names.length) throw failure('Android ha devuelto una lista de partes incompleta.');
    const splits = names.filter(s => s !== 'base').sort();
    if (JSON.stringify(splits) !== JSON.stringify([...metadata.splitNames].sort())) throw failure('Las partes instaladas no coinciden con el XAPK elegido.');
  }
  return { packageName: pkg, versionCode: String(expected), paths };
}

async function xapkDestinations(transport, metadata, signal) {
  // The supplied DEX owns a fixed extraction path and recursively deletes it.
  // Never let it touch a pre-existing directory or symlink at that path.
  await command(transport, `if [ -e ${quote(EXTRACT)} ] || [ -L ${quote(EXTRACT)} ]; then printf 'Hay una extracción XAPK anterior o en curso. Revísala antes de reintentar.\\n'; false; fi`, { signal });
  const paths = new Set(['/sdcard/Android', '/sdcard/Android/obb', '/sdcard/Android/obb/' + metadata.packageName]);
  for (const entry of metadata.obbEntries || []) {
    if (!entry.startsWith('Android/obb/' + metadata.packageName + '/') || !/^[A-Za-z0-9._/-]+\.obb$/.test(entry) || entry.split('/').some(p => !p || p === '.' || p === '..')) throw failure('La ruta OBB no es válida.');
    const path = '/sdcard/' + entry;
    paths.add(path); paths.add(path.slice(0, path.lastIndexOf('/') + 1) + '.' + path.slice(path.lastIndexOf('/') + 1) + '.jconfig.part');
  }
  for (const path of paths) await command(transport, `if [ -L ${quote(path)} ]; then printf 'La carpeta OBB contiene enlaces simbólicos. No se ha iniciado la instalación.\\n'; false; fi`, { signal });
}

export async function installWithSessionWriter({ file, metadata, transport, signal, onStage = () => {}, onLog = () => {}, fetchImpl = fetch }) {
  validPackage(metadata.packageName);
  if (!['apk', 'xapk'].includes(metadata.format) || !/^\d+$/.test(metadata.versionCode) || !file.size) throw failure('El archivo no tiene una identidad de instalación válida.');
  const temporary = '/data/local/tmp/habro-session-' + crypto.randomUUID();
  const apkPath = temporary + '/application.' + metadata.format, dexPath = temporary + '/sessionwriter.dex';
  let created = false, invoked = false, completed = false, outcome, error, pid;
  let transcript = '';
  const log = chunk => { transcript = (transcript + chunk).slice(-64000); onLog(chunk); };
  try {
    signal?.throwIfAborted(); onStage('Comprobando el sistema y la versión instalada…');
    const profile = await Promise.all(['id', 'am get-current-user', 'getprop ro.build.display.id'].map(script => command(transport, script, { signal })));
    if (!/^uid=2000\(shell\)(?:\s|$)/.test(profile[0].stdout.trim())) throw failure('El método SOP6 / SOP7 requiere una sesión ADB con usuario shell (2000).');
    if (profile[1].stdout.trim() !== '0') throw failure('Este auxiliar solo se admite con el usuario Android 0 activo. Usa el método estándar para otro perfil.');
    if (!/(?:^|[_.\s-])SOP[67](?:$|[_.\s-])/i.test(profile[2].stdout.trim())) throw failure('No se ha identificado una ROM SOP6 o SOP7. Utiliza el método estándar.');
    log('ROM: ' + profile[2].stdout.trim() + '\nUsuario Android: 0 · uid shell\n');
    // -u includes packages retained for other users; version codes are shared.
    const before = await command(transport, `pm list packages -u --show-versioncode ${quote(metadata.packageName)}`, { signal });
    const currentVersion = parsePackageVersion(before.stdout, metadata.packageName);
    if (currentVersion !== null && currentVersion > BigInt(metadata.versionCode)) throw failure('Ya hay una versión más reciente instalada. Elige una versión igual o superior; no se hará una bajada de versión.');
    if (metadata.format === 'xapk') await xapkDestinations(transport, metadata, signal);
    onStage('Comprobando el auxiliar de instalación…');
    const helper = await helperBlob(fetchImpl, signal);
    await command(transport, `mkdir -m 700 ${quote(temporary)}`, { signal }); created = true;
    for (const [blob, path, label] of [[file, apkPath, file.name], [helper, dexPath, 'auxiliar SOP6 / SOP7']]) {
      signal?.throwIfAborted(); onStage('Enviando ' + label + '…');
      await transport.push(blob, path, signal, label);
      const remoteSize = await transport.size(path, signal);
      if (BigInt(remoteSize) !== BigInt(blob.size)) throw failure('La transferencia está incompleta: el tamaño en el coche no coincide.');
    }
    signal?.throwIfAborted();
    // Recheck immediately before the only command that commits changes.
    const latest = await command(transport, `pm list packages -u --show-versioncode ${quote(metadata.packageName)}`, { signal });
    const latestVersion = parsePackageVersion(latest.stdout, metadata.packageName);
    if (latestVersion !== null && latestVersion > BigInt(metadata.versionCode)) throw failure('La aplicación se ha actualizado durante la preparación. Elige una versión igual o superior.');
    if (metadata.format === 'xapk') await xapkDestinations(transport, metadata, signal);
    signal?.throwIfAborted(); onStage('Instalando en Android. Espera su respuesta; puede tardar varios minutos.');
    const pidMarker = 'HABRO_PID_' + nonce();
    const invoke = `CLASSPATH=${quote(dexPath)} app_process /data/local/tmp sop6.SessionWriter ${metadata.format === 'xapk' ? '--xapk ' : ''}${quote(apkPath)} &\nhabro_install_pid=$!\nprintf '\\n${pidMarker}:%s\\n' "$habro_install_pid"\nwait "$habro_install_pid"`;
    invoked = true;
    // Deliberately omit the user's cancel signal after invocation. Closing an
    // ADB socket is not PackageInstaller rollback. The timeout is still bounded.
    const result = await command(transport, invoke, { check: false, timeout: metadata.format === 'xapk' ? 900000 : 300000, onOutput: chunk => {
      log(chunk); pid = new RegExp(pidMarker + ':(\\d+)').exec(transcript)?.[1] || pid;
    } });
    completed = true;
    const output = joined(result);
    if (result.exitCode !== 0 || /JCONFIG_INSTALL_FAILED|JCONFIG_XAPK_FAILURE:|Package commit failed|(?:^|\n)\s*Killed\b|(?:^|\n)[^\n]*Exception[:\s]/m.test(output)) {
      const diagnosis = installationDiagnosis(output);
      // Process completion is not transaction rollback: the helper can time
      // out after commit or fail after installing APKs but before copying OBBs.
      throw failure(diagnosis || 'Android no ha confirmado la instalación. Consulta el diagnóstico.', { ...result, uncertain: !diagnosis || /^Installed package /m.test(output) });
    }
    const successes = [...result.stdout.matchAll(/^Installed package ([A-Za-z][A-Za-z0-9_.]*) version (\d+)\r?$/gm)];
    if (successes.length !== 1 || successes[0][1] !== metadata.packageName || BigInt(successes[0][2]) !== BigInt(metadata.versionCode)) throw failure('La respuesta no confirma el paquete y la versión elegidos.', { ...result, uncertain: true });
    onStage('Verificando la aplicación instalada…');
    let verified;
    try { verified = await verifyInstallation(transport, metadata); }
    catch (cause) { throw failure(cause.message, { cause, uncertain: true }); }
    const obbSkipped = [...output.matchAll(/^JCONFIG_XAPK_OBB_SKIPPED:(.+)$/gm)].map(m => m[1].trim());
    outcome = { ...verified, status: obbSkipped.length ? 'partial' : 'success', obbSkipped, cleanupPending: false, temporary };
  } catch (caught) {
    error = caught && typeof caught === 'object' ? caught : new Error(String(caught));
    if (invoked && !completed) error.uncertain = true;
    if (error.uncertain) error.message = 'No se puede confirmar el resultado. Android puede haber instalado la app. Reconecta y comprueba su estado antes de reintentar.\n' + error.message;
    if (invoked && transport.current() && pid && /^\d+$/.test(pid)) {
      try {
        const recent = await command(transport, `logcat -b crash -d -t 120 -v brief --pid=${pid}`, { timeout: 10000 });
        if (recent.stdout) { log('\nRegistro de fallos del proceso ' + pid + ':\n' + recent.stdout + '\n'); const hint = installationDiagnosis(recent.stdout); if (hint) error.message += '\nEl registro del proceso indica: ' + hint; }
      } catch { log('\nNo se pudo obtener el registro del proceso.\n'); }
    }
  } finally {
    if (created && (!invoked || completed) && transport.current()) {
      try { await command(transport, `rm -rf ${quote(temporary)}`, { timeout: 10000 }); }
      catch { if (outcome) outcome.cleanupPending = true; log('\nLimpieza pendiente: ' + temporary + '\n'); }
    } else if (created) { if (outcome) outcome.cleanupPending = true; log('\nTemporales conservados hasta aclarar el estado: ' + temporary + '\n'); }
  }
  if (error) { error.diagnostic = (transcript + (error.stdout || '') + (error.stderr || '')).slice(-64000); throw error; }
  outcome.diagnostic = transcript;
  return outcome;
}
