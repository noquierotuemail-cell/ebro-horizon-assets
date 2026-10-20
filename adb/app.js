import { quote, validPackage, devicePath, safeFileName, packagesFrom, packagePaths, normalizeShellCommand, parseStorage, formatBytes, runShell, collectBinary } from './core.mjs';

const L = window.HabroAdbLib;
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const state = { adb: null, device: null, attempt: 0, connecting: false, apps: [], filter: 'all', selected: new Set(), user: null, currentApp: null, operation: null, command: null, screen: null, screenAttempt: 0, screenStarting: null, history: [], historyIndex: 0, filesPath: '/sdcard/Download', files: [] };
const SCRCPY_PATH = '/data/local/tmp/habro-scrcpy-3.3.3.jar';
const SCRCPY_HASH = '7e70323ba7f259649dd4acce97ac4fefbae8102b2c6d91e2e7be613fd5354be0';
const icon = name => `<i data-icon="${name}"></i>`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const text = (id, value) => { $(id).textContent = String(value ?? '—'); };
function icons() { L?.createIcons({ icons: L, nameAttr: 'data-icon', attrs: { class: 'icon', 'aria-hidden': 'true' } }); }
let toastTimer;
function toast(message) { text('toast', message); $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 6500); }
function activity(message, error = false) {
  if ($('activityLog').querySelector('.empty-state')) $('activityLog').replaceChildren();
  const item = document.createElement('div'); item.className = 'activity-item' + (error ? ' error' : '');
  item.innerHTML = `${icon(error ? 'alert-circle' : 'check-circle-2')}<div>${escapeHtml(message)}<small>${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small></div>`;
  $('activityLog').prepend(item); while ($('activityLog').children.length > 60) $('activityLog').lastElementChild.remove(); icons();
}
function report(error) { if (error?.name === 'AbortError') { toast('Operación cancelada.'); return; } const message = String(error?.message || error || 'No se ha podido completar la operación.'); toast(message); activity(message, true); }
function invoke(fn) { Promise.resolve().then(fn).catch(report); }
function requireAdb() { if (!state.adb) throw new Error('Conecta primero el coche por USB.'); return state.adb; }
function assertSession(adb) { if (!adb || state.adb !== adb) throw new Error('La conexión ha cambiado. Vuelve a iniciar la operación.'); }
function activeUser() { if (!Number.isInteger(state.user)) throw new Error('No se ha podido identificar el usuario Android. Reconecta el dispositivo.'); return state.user; }
async function shell(command, adb = requireAdb(), options = {}) { assertSession(adb); return runShell(adb, command, options); }
function syncControls() {
  const disabled = !state.adb || !!state.operation;
  all('[data-device], [data-key], [data-app-action], [data-bulk]').forEach(el => el.disabled = disabled);
  const label = state.connecting ? 'Cancelar conexión' : state.adb ? 'Desconectar' : 'Conectar coche';
  $('connectButton').innerHTML = icon(state.adb ? 'cable' : 'usb') + `<span>${label}</span>`;
  $('heroConnect').innerHTML = icon(state.adb ? 'cable' : 'plug-zap') + `<span>${state.connecting ? 'Cancelar conexión' : state.adb ? 'Desconectar USB' : 'Conectar por USB'}</span>`;
  $('connectionState').className = 'connection' + (state.adb ? ' connected' : state.connecting ? ' connecting' : '');
  $('connectionState').innerHTML = '<i class="dot"></i><span>' + (state.adb ? 'Conectado' : state.connecting ? 'Autorizando…' : 'Desconectado') + '</span>';
  $('stopCommand').disabled = !state.command;
  $('startLogcat').disabled = !state.adb || !!state.command;
  $('startScreen').disabled = !state.adb || !!state.operation || state.screenStarting !== null;
  icons();
}
function showView(name) {
  if (!['dashboard', 'apps', 'console', 'screen', 'files'].includes(name)) name = 'dashboard';
  all('.view').forEach(el => { const active = el.id === 'view-' + name; el.hidden = !active; el.classList.toggle('active', active); });
  all('[data-view]').forEach(el => { const active = el.dataset.view === name; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  if (name === 'apps' && state.adb && !state.apps.length) invoke(refreshApps);
  if (name === 'files' && state.adb && !state.files.length) invoke(() => loadFiles(state.filesPath));
  if (name !== 'screen' && (state.screen || state.screenStarting !== null)) invoke(stopScreen);
  window.scrollTo({ top: 0 });
}
function confirmAction(title, description, acceptLabel = 'Continuar', cancelLabel = 'Cancelar') {
  if ($('confirmDialog').open) return Promise.resolve(false);
  text('confirmTitle', title); text('confirmDescription', description); text('confirmAccept', acceptLabel); text('confirmCancel', cancelLabel);
  return new Promise(resolve => {
    const dialog = $('confirmDialog');
    const finish = result => { $('confirmAccept').onclick = null; $('confirmCancel').onclick = null; dialog.oncancel = null; dialog.onclose = null; dialog.close(); resolve(result); };
    $('confirmAccept').onclick = () => finish(true); $('confirmCancel').onclick = () => finish(false);
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    dialog.onclose = () => finish(false); dialog.showModal(); $('confirmCancel').focus();
  });
}
function setTheme(theme) { document.documentElement.dataset.theme = theme; $('themeButton').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon'); $('themeButton').setAttribute('aria-label', theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'); try { localStorage.setItem('habro-adb-theme', theme); } catch {} icons(); }
function compatibility() {
  let message = '';
  if (!L) message = 'No se ha podido cargar el motor ADB. Recarga la página y comprueba que la carpeta vendor está incluida.';
  else if (!window.isSecureContext) message = 'La conexión USB necesita una página HTTPS o localhost. Abre el enlace publicado o consulta la guía de conexión.';
  else if (!navigator.usb) message = 'Este navegador permite revisar el diseño, pero no conectar por USB. Para conectar el coche, abre esta página en Chrome o Edge desde un ordenador.';
  else if (document.permissionsPolicy?.allowsFeature && !document.permissionsPolicy.allowsFeature('usb')) message = 'La vista integrada no permite acceder al USB. Abre la herramienta en una pestaña completa del navegador.';
  $('compatibilityBanner').hidden = !message; text('compatibilityBanner', message); return message;
}
async function toggleConnection() {
  if (state.adb || state.connecting) { await disconnect(); return; }
  const problem = compatibility(); if (problem) { toast(problem); return; }
  const attempt = ++state.attempt;
  state.connecting = true; syncControls();
  let device, transport, timer;
  try {
    device = await L.AdbDaemonWebUsbDeviceManager.BROWSER.requestDevice();
    if (!device) return;
    if (attempt !== state.attempt) return;
    state.device = device;
    text('deviceName', 'Autoriza la conexión en el coche');
    text('deviceDescription', 'Acepta la huella RSA que aparece en la pantalla de Android. Puedes cancelar la conexión desde aquí.');
    const connection = await device.connect();
    if (attempt !== state.attempt) { await device.raw.close(); return; }
    const authentication = L.AdbDaemonTransport.authenticate({ serial: device.serial, connection, credentialStore: new L.AdbWebCredentialStore('HABRO ADB') });
    authentication.then(t => { if (attempt !== state.attempt) void t.close(); }, () => {});
    transport = await Promise.race([authentication, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('El coche no ha autorizado la conexión. Revisa el aviso de depuración USB en su pantalla.')), 90000); })]);
    clearTimeout(timer);
    if (attempt !== state.attempt) { await transport.close(); return; }
    const adb = new L.Adb(transport); state.adb = adb; state.connecting = false;
    state.user = null; state.apps = []; state.files = []; state.selected.clear(); state.currentApp = null;
    adb.disconnected.then(() => { if (state.adb === adb) invoke(() => disconnect(false)); }, error => { if (state.adb === adb) { report(error); invoke(() => disconnect(false)); } });
    text('deviceName', device.name || 'Android conectado');
    text('deviceDescription', 'Conexión USB autorizada. Ya puedes utilizar las herramientas.');
    text('deviceEyebrow', 'CONEXIÓN AUTORIZADA'); text('statSession', 'Conectado'); text('statSessionDetail', 'USB · ADB autorizado');
    text('deviceMeta', 'Dispositivo: ' + (device.serial || 'sin número de serie')); $('deviceMeta').hidden = false;
    syncControls(); activity('Conexión ADB autorizada');
    await loadDeviceInfo(adb);
  } catch (error) {
    clearTimeout(timer);
    if (!state.adb) { try { await transport?.close(); await device?.raw?.close(); } catch {} }
    if (attempt === state.attempt) {
      ++state.attempt;
      if (error?.name !== 'NotFoundError' && error?.name !== 'AbortError') {
        const details = /claim|busy|interface|access denied/i.test(error?.message || '') ? 'No se puede acceder al USB. Cierra otras herramientas ADB y revisa el controlador del dispositivo en Windows. Consulta la guía de conexión.' : error;
        report(details);
      }
    }
  } finally { if (!state.adb && (attempt === state.attempt || attempt + 1 === state.attempt)) { state.connecting = false; resetDeviceInfo(); syncControls(); } }
}
function resetDeviceInfo() {
  text('deviceName', 'Conecta con tu coche'); text('deviceEyebrow', 'CONEXIÓN ADB · USB');
  text('deviceDescription', 'Conecta el cable de datos, activa la depuración USB y acepta la autorización en la pantalla del coche.'); $('deviceMeta').hidden = true;
  ['statAndroid', 'statApps', 'statStorage'].forEach(id => text(id, '—')); text('statSdk', 'Versión de Android'); text('statStorageDetail', 'Almacenamiento interno'); text('statSession', 'Sin conexión'); text('statSessionDetail', 'Esperando autorización');
}
async function disconnect(close = true) {
  ++state.attempt; const adb = state.adb, device = state.device;
  state.adb = null; state.device = null; state.connecting = false; state.user = null;
  state.operation?.controller.abort(new DOMException('Conexión cerrada', 'AbortError')); state.command?.abort();
  await stopScreen();
  if (close) { try { await adb?.close(); } catch {} try { await device?.raw?.close(); } catch {} }
  state.apps = []; state.files = []; state.selected.clear(); state.currentApp = null;
  $('appDialog').close(); resetDeviceInfo(); renderApps(); renderFiles(); syncControls();
  const canvas = $('screenCanvas'); canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); canvas.hidden = true; $('screenEmpty').hidden = false; $('saveScreen').disabled = true;
  text('screenStatus', 'Conecta el coche para ver su pantalla.'); text('screenResolution', 'Sin imagen');
  activity('Conexión USB cerrada');
}
async function loadDeviceInfo(adb) {
  const commands = ['getprop ro.product.model', 'getprop ro.build.version.release', 'getprop ro.build.version.sdk', 'df -h /data', 'am get-current-user'];
  const values = await Promise.allSettled(commands.map(command => shell(command, adb)));
  if (state.adb !== adb) return;
  const get = index => values[index].status === 'fulfilled' ? values[index].value.stdout.trim() : '';
  text('deviceName', get(0) || state.device?.name || 'Android conectado');
  if (get(1)) text('statAndroid', 'Android ' + get(1)); if (get(2)) text('statSdk', 'API ' + get(2));
  const storage = parseStorage(get(3)); if (storage) { text('statStorage', storage.free); text('statStorageDetail', storage.total + ' en total · ' + storage.percent + ' utilizado'); }
  if (/^\d+$/.test(get(4))) { state.user = Number(get(4)); text('deviceMeta', `Dispositivo: ${adb.serial || 'sin número de serie'} · Usuario Android ${state.user}`); await refreshApps(); }
  else { activity('No se ha podido identificar el usuario Android. La consola y los archivos siguen disponibles.', true); }
}
async function withOperation(label, fn) {
  const adb = requireAdb(); if (state.operation) throw new Error('Espera a que termine la operación en curso.');
  const operation = { controller: new AbortController(), adb };
  state.operation = operation; $('operationProgress').hidden = false; progress(label); syncControls();
  try { await fn(adb, operation.controller.signal); }
  finally { if (state.operation === operation) { state.operation = null; $('operationProgress').hidden = true; syncControls(); } }
}
function progress(label, value) { text('operationLabel', label); if (Number.isFinite(value)) $('operationBar').value = Math.max(0, Math.min(100, value)); else $('operationBar').removeAttribute('value'); }
async function withSync(adb, fn, signal) {
  assertSession(adb); signal?.throwIfAborted(); const sync = await adb.sync();
  const cancel = () => { void sync.dispose().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try { assertSession(adb); signal?.throwIfAborted(); return await fn(sync); }
  finally { signal?.removeEventListener('abort', cancel); await sync.dispose().catch(() => {}); }
}
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = safeFileName(name); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
async function refreshApps() {
  const adb = requireAdb(); const user = activeUser();
  const values = await Promise.all([shell(`pm list packages --user ${user}`, adb), shell(`pm list packages -s --user ${user}`, adb), shell(`pm list packages -d --user ${user}`, adb)]);
  assertSession(adb); const system = new Set(packagesFrom(values[1].stdout)), disabled = new Set(packagesFrom(values[2].stdout));
  state.apps = packagesFrom(values[0].stdout).map(pkg => ({ package: pkg, system: system.has(pkg), disabled: disabled.has(pkg) }));
  state.selected = new Set([...state.selected].filter(p => state.apps.some(a => a.package === p)));
  text('statApps', state.apps.length); renderApps();
}
function filteredApps() { const search = $('appSearch').value.trim().toLowerCase(); return state.apps.filter(app => app.package.toLowerCase().includes(search) && (state.filter === 'all' || state.filter === 'system' && app.system || state.filter === 'user' && !app.system || state.filter === 'disabled' && app.disabled)); }
function renderApps() {
  const list = filteredApps(); text('countAll', state.apps.length); text('countUser', state.apps.filter(a => !a.system).length); text('countSystem', state.apps.filter(a => a.system).length); text('countDisabled', state.apps.filter(a => a.disabled).length);
  $('appTableBody').innerHTML = list.length ? list.map(app => `<tr><td class="check-cell"><input type="checkbox" data-select-app="${escapeHtml(app.package)}" aria-label="Seleccionar ${escapeHtml(app.package)}" ${state.selected.has(app.package) ? 'checked' : ''}></td><td><button class="app-name" data-open-app="${escapeHtml(app.package)}">${escapeHtml(app.package)}<small>Usuario Android ${state.user}</small></button></td><td><span class="pill">${app.system ? 'Sistema' : 'Instalada'}</span></td><td><span class="pill ${app.disabled ? 'warning' : 'success'}">${app.disabled ? 'Desactivada' : 'Activada'}</span></td><td class="row-actions"><button class="button secondary" data-open-app="${escapeHtml(app.package)}">Gestionar</button></td></tr>`).join('') : `<tr><td colspan="5"><div class="empty-state">${icon('grid-2x2')}<strong>${state.adb ? 'No hay aplicaciones en esta vista' : 'Tus aplicaciones aparecerán aquí'}</strong><p>${state.adb ? 'Prueba otro filtro o actualiza la lista.' : 'Conecta el coche para cargar la lista.'}</p></div></td></tr>`;
  $('bulkToolbar').hidden = !state.selected.size; text('selectionCount', `${state.selected.size} seleccionadas`);
  $('selectAllApps').checked = list.length > 0 && list.every(a => state.selected.has(a.package)); $('selectAllApps').indeterminate = list.some(a => state.selected.has(a.package)) && !$('selectAllApps').checked;
  all('[data-filter]').forEach(el => el.classList.toggle('active', el.dataset.filter === state.filter)); icons(); syncControls();
}
async function openApp(pkg) {
  const adb = requireAdb(); validPackage(pkg); const app = state.apps.find(a => a.package === pkg); if (!app) return;
  state.currentApp = app; text('appDialogName', pkg); text('appDialogMeta', `${app.system ? 'Aplicación del sistema' : 'Aplicación instalada'} · ${app.disabled ? 'Desactivada' : 'Activada'} · Usuario ${activeUser()}`); text('appDetails', 'Cargando información…'); $('appDialog').showModal(); syncControls();
  const result = await shell(`dumpsys package ${quote(pkg)}`, adb); if (state.adb !== adb || state.currentApp?.package !== pkg) return;
  const lines = result.stdout.split('\n').filter(line => /versionName=|versionCode=|firstInstallTime=|lastUpdateTime=|targetSdk=|minSdk=|codePath=|dataDir=|User \d+:/.test(line));
  text('appDetails', lines.join('\n').trim() || 'Android no ha devuelto detalles de esta aplicación.');
}
async function appAction(action, packages) {
  const adb = requireAdb(); const user = activeUser(); const pkgs = packages.map(validPackage);
  if (!pkgs.length) return;
  if (action === 'download') { await exportPackages(pkgs); return; }
  const labels = { launch: 'Abrir aplicación', enable: 'Activar aplicación', disable: 'Desactivar aplicación', stop: 'Detener aplicación', clear: 'Borrar los datos de la aplicación', uninstall: 'Desinstalar aplicación', permissions: 'Abrir permisos especiales' };
  if (!labels[action]) throw new Error('Operación no válida.');
  if (['disable', 'stop', 'clear', 'uninstall'].includes(action)) {
    const system = pkgs.some(pkg => state.apps.find(a => a.package === pkg)?.system);
    const explanation = action === 'clear' ? 'Se borrarán los datos y ajustes de estas aplicaciones.' : action === 'uninstall' ? `Se desinstalarán para el usuario Android ${user}. Pueden perderse sus datos.` : 'La operación puede interrumpir funciones del sistema Android.';
    if (!await confirmAction(labels[action], `${pkgs.join('\n')}\n\n${explanation}${system ? '\nIncluye aplicaciones del sistema del coche.' : ''}`, labels[action])) return;
  }
  assertSession(adb);
  await withOperation(labels[action], async (session, signal) => {
    for (let index = 0; index < pkgs.length; index++) {
      signal.throwIfAborted(); assertSession(session); const pkg = pkgs[index]; let result;
      progress(`${labels[action]} · ${pkg}`, index / pkgs.length * 100);
      if (action === 'launch') {
        const resolved = await shell(`cmd package resolve-activity --brief --user ${user} -a android.intent.action.MAIN -c android.intent.category.LAUNCHER ${quote(pkg)}`, session, { signal }).catch(() => ({ stdout: '' }));
        const component = resolved.stdout.trim().split(/\r?\n/).findLast(line => /^[A-Za-z0-9_.$]+\/[A-Za-z0-9_.$]+$/.test(line));
        result = await shell(component ? `am start --user ${user} -n ${quote(component)}` : `monkey -p ${quote(pkg)} -c android.intent.category.LAUNCHER 1`, session, { signal });
        if (/No activities found|Error:|Exception|monkey aborted|Events injected: 0/i.test(result.stdout + result.stderr)) throw new Error(result.stdout.trim() || 'La aplicación no tiene una actividad que se pueda abrir.');
      } else {
        const commands = { enable: `pm enable --user ${user} ${quote(pkg)}`, disable: `pm disable-user --user ${user} ${quote(pkg)}`, stop: `am force-stop --user ${user} ${quote(pkg)}`, clear: `pm clear --user ${user} ${quote(pkg)}`, uninstall: `pm uninstall --user ${user} ${quote(pkg)}`, permissions: `am start --user ${user} -a android.settings.APPLICATION_DETAILS_SETTINGS -d ${quote('package:' + pkg)}` };
        result = await shell(commands[action], session, { signal });
        if (/\bFailure\b|\bError:|Exception|not allowed|SecurityException/i.test(result.stdout + result.stderr)) throw new Error((result.stdout + result.stderr).trim());
        if (['clear', 'uninstall'].includes(action) && !/\bSuccess\b/.test(result.stdout)) throw new Error('Android no confirmó la operación: ' + result.stdout.trim());
      }
      activity(`${labels[action]} · ${pkg}`);
    }
  });
  if (state.adb === adb) { await refreshApps(); $('appDialog').close(); toast('Operación completada.'); }
}
async function pushFile(adb, file, destination, signal, label = file.name) {
  let sent = 0;
  const stream = file.stream().pipeThrough(new TransformStream({ transform(chunk, controller) { signal?.throwIfAborted(); sent += chunk.byteLength; progress(`Enviando ${label} · ${formatBytes(sent)} / ${formatBytes(file.size)}`, file.size ? sent / file.size * 100 : 0); controller.enqueue(chunk); } }));
  await withSync(adb, sync => sync.write({ filename: destination, file: stream, permission: 0o644, mtime: Math.floor(Date.now() / 1000) }), signal);
}
async function installFiles(files) {
  if (!files.length) return; const adb = requireAdb(); const user = activeUser();
  if (files.some(file => !file.name.toLowerCase().endsWith('.apk'))) throw new Error('Selecciona archivos APK.');
  let split = false;
  if (files.length > 1) split = await confirmAction('¿Son partes de una misma aplicación?', 'Elige «Instalar juntas» si son base.apk y sus split APK. Elige «Por separado» si son aplicaciones distintas.', 'Instalar juntas', 'Por separado');
  if (!await confirmAction('Instalar aplicaciones en el coche', files.map(f => `${f.name} · ${formatBytes(f.size)}`).join('\n') + `\n\nSe instalarán para el usuario Android ${user}. Las aplicaciones existentes podrán actualizarse.`, 'Instalar')) return;
  assertSession(adb);
  await withOperation('Instalando APK', async (session, signal) => {
    const temporary = '/data/local/tmp/habro-install-' + crypto.randomUUID(); const paths = []; let installSession = null;
    try {
      await shell(`mkdir -p ${quote(temporary)}`, session, { signal });
      for (let i = 0; i < files.length; i++) { const path = temporary + '/' + i + '.apk'; paths.push(path); await pushFile(session, files[i], path, signal); }
      if (split) {
        const total = files.reduce((sum, file) => sum + file.size, 0);
        const created = await shell(`pm install-create -r --user ${user} -S ${total}`, session, { signal });
        installSession = created.stdout.match(/Success.*\[(\d+)\]/)?.[1]; if (!installSession) throw new Error(created.stdout.trim() || 'No se ha podido preparar la instalación.');
        for (let i = 0; i < paths.length; i++) { signal.throwIfAborted(); const write = await shell(`pm install-write -S ${files[i].size} ${installSession} ${quote('part' + i + '.apk')} ${quote(paths[i])}`, session, { signal, timeout: 120000 }); if (!/\bSuccess\b/.test(write.stdout)) throw new Error(write.stdout.trim()); }
        signal.throwIfAborted(); progress('Confirmando instalación…');
        const committed = await shell(`pm install-commit ${installSession}`, session, { timeout: 120000 });
        if (!/\bSuccess\b/.test(committed.stdout)) throw new Error(committed.stdout.trim()); installSession = null; activity('Aplicación instalada con todos sus APK');
      } else {
        for (let i = 0; i < paths.length; i++) { signal.throwIfAborted(); progress('Instalando ' + files[i].name); const result = await shell(`pm install -r --user ${user} ${quote(paths[i])}`, session, { timeout: 120000 }); if (!/\bSuccess\b/.test(result.stdout)) throw new Error(result.stdout.trim() || 'Android no confirmó la instalación.'); activity('APK instalado · ' + files[i].name); }
      }
    } finally {
      if (state.adb === session) { if (installSession) await shell(`pm install-abandon ${installSession}`, session).catch(() => {}); await shell(`rm -rf ${quote(temporary)}`, session).catch(() => {}); }
    }
  });
  if (state.adb === adb) { await refreshApps(); toast('Instalación completada.'); }
}
async function saveStream(stream, handle, signal, label) {
  const writable = await handle.createWritable(); const reader = stream.getReader(); let total = 0;
  try { while (true) { signal?.throwIfAborted(); const { done, value } = await reader.read(); if (done) break; await writable.write(value); total += value.byteLength; progress(`${label} · ${formatBytes(total)}`); } await writable.close(); }
  catch (error) { await reader.cancel(error).catch(() => {}); await writable.abort().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}
async function exportPackages(packages) {
  const pkgs = packages.map(validPackage); if (!pkgs.length) throw new Error('No hay aplicaciones para exportar.');
  const adb = requireAdb(); const user = activeUser(); let directory = null;
  if (window.showDirectoryPicker) directory = await window.showDirectoryPicker({ mode: 'readwrite', id: 'habro-apk-export' });
  assertSession(adb);
  await withOperation('Exportando aplicaciones', async (session, signal) => {
    const archive = {}, manifest = { format: 'HABRO APK export', androidUser: user, applications: [], errors: [] }; let bytes = 0;
    const root = directory ? await directory.getDirectoryHandle('HABRO-APK-' + new Date().toISOString().replace(/[:.]/g, '-'), { create: true }) : null;
    for (const pkg of pkgs) {
      signal.throwIfAborted(); assertSession(session); progress('Exportando ' + pkg);
      try {
        const paths = packagePaths((await shell(`pm path --user ${user} ${quote(pkg)}`, session, { signal })).stdout);
        if (!paths.length) throw new Error('Android no ha devuelto ningún APK.');
        const target = root ? await root.getDirectoryHandle(pkg, { create: true }) : null;
        for (let index = 0; index < paths.length; index++) {
          const path = paths[index]; const name = `${String(index).padStart(2, '0')}-${safeFileName(path.split('/').pop())}`;
          await withSync(session, async sync => {
            if (target) { const handle = await target.getFileHandle(name, { create: true }); await saveStream(sync.read(path), handle, signal, pkg + '/' + name); }
            else { const data = await collectBinary(sync.read(path), { signal, limit: 256 * 1024 * 1024 - bytes, onProgress: n => progress(`Exportando ${pkg} · ${formatBytes(n)}`) }); bytes += data.byteLength; archive[pkg + '/' + name] = data; }
          }, signal);
        }
        manifest.applications.push({ package: pkg, parts: paths.length });
      } catch (error) { if (signal.aborted || state.adb !== session || /memoria|demasiado grande/.test(error.message)) throw error; manifest.errors.push({ package: pkg, error: error.message }); activity('No se ha exportado ' + pkg + ': ' + error.message, true); }
    }
    const json = JSON.stringify(manifest, null, 2);
    if (root) { const handle = await root.getFileHandle('manifest.json', { create: true }); const writer = await handle.createWritable(); await writer.write(json); await writer.close(); }
    else { archive['manifest.json'] = L.strToU8(json); downloadBlob(new Blob([L.zipSync(archive, { level: 0 })], { type: 'application/zip' }), 'HABRO-APK.zip'); }
    if (!manifest.applications.length) throw new Error('No se ha podido exportar ninguna aplicación. Consulta el registro.');
    activity(`Exportación terminada · ${manifest.applications.length} aplicaciones${manifest.errors.length ? ' · ' + manifest.errors.length + ' errores' : ''}`); toast('Exportación terminada' + (manifest.errors.length ? ' con errores; consulta manifest.json.' : '.'));
  });
}
let filesRequest = 0;
async function loadFiles(path) {
  const adb = requireAdb(); const requested = ++filesRequest; path = devicePath(path);
  const entries = await withSync(adb, sync => sync.readdir(path)); assertSession(adb); if (requested !== filesRequest) return;
  state.filesPath = path; state.files = entries.filter(e => e.name !== '.' && e.name !== '..').sort((a, b) => (b.type === L.LinuxFileType.Directory) - (a.type === L.LinuxFileType.Directory) || a.name.localeCompare(b.name)); $('remotePath').value = path; renderFiles();
}
function renderFiles() {
  $('fileTableBody').innerHTML = state.files.length ? state.files.map((file, index) => `<tr><td><button class="file-name" data-file-index="${index}">${icon(file.type === L.LinuxFileType.Directory ? 'folder' : 'file')}<span>${escapeHtml(file.name)}${file.type === L.LinuxFileType.Link ? ' ↗' : ''}</span></button></td><td>${file.type === L.LinuxFileType.Directory ? 'Carpeta' : formatBytes(file.size)}</td><td>${Number(file.mtime) ? new Date(Number(file.mtime) * 1000).toLocaleDateString('es-ES') : '—'}</td><td class="row-actions"><button class="icon-button" data-file-index="${index}" aria-label="${file.type === L.LinuxFileType.Directory ? 'Abrir carpeta' : 'Abrir o descargar archivo'}">${icon(file.type === L.LinuxFileType.Directory ? 'chevron-right' : 'download')}</button></td></tr>`).join('') : `<tr><td colspan="4"><div class="empty-state">${icon('folder')}<strong>${state.adb ? 'Esta carpeta está vacía' : 'Explora los archivos del coche'}</strong><p>${state.adb ? 'Puedes enviar archivos a esta carpeta.' : 'Conecta el dispositivo para abrir una carpeta.'}</p></div></td></tr>`;
  icons();
}
async function openFile(index) { const adb = requireAdb(); const entry = state.files[index]; if (!entry) return; const path = devicePath(state.filesPath + '/' + entry.name); if (entry.type === L.LinuxFileType.Directory || entry.type === L.LinuxFileType.Link && await withSync(adb, sync => sync.isDirectory(path))) await loadFiles(path); else await downloadRemote(path); }
async function downloadRemote(path) {
  const adb = requireAdb(); path = devicePath(path); const name = safeFileName(path.split('/').pop());
  let handle = null; if (window.showSaveFilePicker) handle = await window.showSaveFilePicker({ suggestedName: name });
  assertSession(adb);
  await withOperation('Descargando ' + name, async (session, signal) => { await withSync(session, async sync => { if (handle) await saveStream(sync.read(path), handle, signal, name); else { const data = await collectBinary(sync.read(path), { signal, onProgress: n => progress(`Descargando ${name} · ${formatBytes(n)}`) }); downloadBlob(new Blob([data]), name); } }, signal); activity('Archivo descargado · ' + name); });
}
async function uploadFiles(files) {
  if (!files.length) return; const adb = requireAdb(); const path = devicePath(state.filesPath);
  if (!await confirmAction('Enviar archivos al coche', files.map(f => f.name).join('\n') + '\n\nDestino: ' + path + '\nSe reemplazarán los archivos que tengan el mismo nombre.', 'Enviar')) return;
  assertSession(adb);
  await withOperation('Enviando archivos', async (session, signal) => { for (const file of files) { signal.throwIfAborted(); const target = devicePath(path + '/' + safeFileName(file.name)); await pushFile(session, file, target, signal); activity('Archivo enviado · ' + target); } });
  if (state.adb === adb) await loadFiles(path);
}
function appendTerminal(value) { const output = $('terminalOutput'); output.textContent += value; if (output.textContent.length > 2_000_000) output.textContent = '[… se ha recortado la salida más antigua …]\n' + output.textContent.slice(-1_500_000); output.scrollTop = output.scrollHeight; }
async function executeCommand(command, logcat = false) {
  const adb = requireAdb(); if (state.command) throw new Error('Detén el comando actual antes de iniciar otro.'); command = normalizeShellCommand(command);
  const controller = new AbortController(); state.command = controller; syncControls();
  if (!logcat) { state.history.push(command); state.history = state.history.slice(-100); state.historyIndex = state.history.length; }
  appendTerminal('\n$ ' + command + '\n');
  try { const result = await shell(command, adb, { signal: controller.signal, timeout: 0, onOutput: appendTerminal }); if (state.adb === adb) appendTerminal(result.exitCode === null ? '\n[Comando finalizado; este Android no comunica el código de salida]\n' : `\n[Finalizado · código ${result.exitCode}]\n`); }
  catch (error) { appendTerminal(controller.signal.aborted ? '\n[Comando detenido]\n' : '\n[Error] ' + error.message + '\n'); if (!controller.signal.aborted) throw error; }
  finally { if (state.command === controller) state.command = null; syncControls(); }
}
function canvasSize(width, height) { const canvas = $('screenCanvas'); if (canvas.width !== width) canvas.width = width; if (canvas.height !== height) canvas.height = height; canvas.hidden = false; $('screenEmpty').hidden = true; $('saveScreen').disabled = false; text('screenResolution', `${width} × ${height}`); }
async function captureScreen() {
  const adb = requireAdb(); if (state.screen || state.screenStarting !== null) await stopScreen(); const socket = await adb.createSocket('exec:screencap -p'); let data;
  try { data = await collectBinary(socket.readable, { limit: 40 * 1024 * 1024, signal: AbortSignal.timeout(30000) }); } finally { await socket.close().catch(() => {}); }
  assertSession(adb); if (data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) throw new Error('El sistema no ha devuelto una captura PNG. Puede impedir la captura de esta pantalla.');
  const bitmap = await createImageBitmap(new Blob([data], { type: 'image/png' }));
  if (state.adb !== adb) { bitmap.close(); return; }
  canvasSize(bitmap.width, bitmap.height); $('screenCanvas').getContext('2d').drawImage(bitmap, 0, 0); bitmap.close(); text('screenStatus', 'Captura del coche · ' + new Date().toLocaleTimeString('es-ES')); activity('Captura de pantalla recibida');
}
async function stopScreen() {
  ++state.screenAttempt; const session = state.screen; state.screen = null; state.screenStarting = null;
  if (session) { session.decoder?.dispose(); await session.client?.close().catch(() => {}); }
  $('startScreen').innerHTML = icon('play') + 'Ver en directo'; text('screenStatus', state.adb ? 'Vista detenida. Puedes hacer una captura o iniciar el directo.' : 'Conecta el coche para ver su pantalla.'); syncControls();
}
async function startScreen() {
  if (state.screen) { await stopScreen(); return; } const adb = requireAdb();
  if (state.screenStarting !== null) return;
  if (!L.WebCodecsVideoDecoder.isSupported) throw new Error('Este navegador no admite el vídeo en directo. Puedes usar el botón Captura.');
  const epoch = ++state.screenAttempt; state.screenStarting = epoch; let client, decoder, timer;
  $('startScreen').disabled = true; text('screenStatus', 'Preparando la pantalla del coche…');
  try {
    const response = await fetch('vendor/scrcpy-server-v3.3.3'); if (!response.ok) throw new Error('Falta el servidor de pantalla. Recarga la herramienta completa.');
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (digest !== SCRCPY_HASH) throw new Error('El recurso de pantalla no supera la verificación de integridad.');
    assertSession(adb); if (epoch !== state.screenAttempt) return;
    await L.AdbScrcpyClient.pushServer(adb, new Blob([bytes]).stream(), SCRCPY_PATH);
    assertSession(adb); if (epoch !== state.screenAttempt) return;
    const options = new L.AdbScrcpyOptions3_3_3({ video: true, audio: false, control: true, videoCodec: 'h264', maxSize: 1920, maxFps: 30, videoBitRate: 4000000, tunnelForward: true, clipboardAutosync: false, powerOn: false, cleanup: true });
    const pending = L.AdbScrcpyClient.start(adb, SCRCPY_PATH, options);
    pending.then(c => { if (epoch !== state.screenAttempt || state.adb !== adb) void c.close(); }, () => {});
    client = await Promise.race([pending, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Android no ha iniciado el vídeo. Puedes usar Captura para comprobar la pantalla.')), 25000); })]); clearTimeout(timer);
    assertSession(adb); if (epoch !== state.screenAttempt) { await client.close(); return; }
    const session = { client, decoder: null, adb, epoch }; state.screen = session;
    const outputReader = client.output.getReader();
    void (async () => { try { while (true) { const { done } = await outputReader.read(); if (done) break; } } catch {} finally { outputReader.releaseLock(); } })();
    const video = await Promise.race([client.videoStream, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('No se ha recibido vídeo del coche.')), 15000); })]); clearTimeout(timer);
    if (state.screen !== session || state.adb !== adb) { await client.close(); return; }
    const renderer = { setSize(width, height) { if (state.screen === session) canvasSize(width, height); }, draw(frame) { if (state.screen === session) $('screenCanvas').getContext('2d').drawImage(frame, 0, 0); } };
    decoder = new L.WebCodecsVideoDecoder({ codec: video.metadata.codec, renderer }); session.decoder = decoder;
    void video.stream.pipeTo(decoder.writable).then(() => { if (state.screen === session) invoke(stopScreen); }, error => { if (state.screen === session) { report(new Error('Se ha interrumpido el vídeo: ' + error.message)); invoke(stopScreen); } });
    client.exited.then(() => { if (state.screen === session) invoke(stopScreen); }, () => { if (state.screen === session) invoke(stopScreen); });
    $('startScreen').innerHTML = icon('square') + 'Detener directo'; text('screenStatus', 'En directo · toca o desliza sobre la imagen'); activity('Pantalla en directo iniciada'); icons();
  } catch (error) { clearTimeout(timer); if (epoch === state.screenAttempt) ++state.screenAttempt; if (state.screen?.client === client) state.screen = null; decoder?.dispose(); await client?.close().catch(() => {}); text('screenStatus', 'No se ha podido iniciar el directo. Puedes usar Captura.'); throw error; }
  finally { clearTimeout(timer); if (state.screenStarting === epoch) state.screenStarting = null; syncControls(); }
}
async function keyEvent(code) { const adb = requireAdb(); if (state.screen?.client.controller) { const controller = state.screen.client.controller; await controller.injectKeyCode({ action: 0, keyCode: code, repeat: 0, metaState: 0 }); await controller.injectKeyCode({ action: 1, keyCode: code, repeat: 0, metaState: 0 }); } else await shell(`input keyevent ${Number(code)}`, adb); }
let pointer = null, touchQueue = Promise.resolve(), lastMove = 0;
function coordinates(event) { const canvas = $('screenCanvas'); const rect = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(canvas.width - 1, Math.round((event.clientX - rect.left) / rect.width * canvas.width))), y: Math.max(0, Math.min(canvas.height - 1, Math.round((event.clientY - rect.top) / rect.height * canvas.height))) }; }
function injectTouch(action, point, session) { const controller = session?.client.controller; if (!controller) return; const canvas = $('screenCanvas'); const message = { action, pointerId: -2n, pointerX: point.x, pointerY: point.y, videoWidth: canvas.width, videoHeight: canvas.height, pressure: action === 1 || action === 3 ? 0 : 1, actionButton: 0, buttons: 0 }; touchQueue = touchQueue.catch(() => {}).then(() => { if (state.screen === session) return controller.injectTouch(message); }); touchQueue.catch(report); }
$('screenCanvas').addEventListener('pointerdown', event => { if (!state.adb || event.button !== 0 || $('screenCanvas').hidden) return; event.preventDefault(); const point = coordinates(event); pointer = { id: event.pointerId, start: point, time: performance.now(), adb: state.adb, session: state.screen }; $('screenCanvas').setPointerCapture(event.pointerId); if (pointer.session) injectTouch(0, point, pointer.session); });
$('screenCanvas').addEventListener('pointermove', event => { if (pointer?.id !== event.pointerId || !pointer.session || performance.now() - lastMove < 25) return; lastMove = performance.now(); injectTouch(2, coordinates(event), pointer.session); });
function pointerEnd(event, cancel = false) { if (pointer?.id !== event.pointerId) return; const start = pointer; pointer = null; const point = coordinates(event); if (start.session) injectTouch(cancel ? 3 : 1, point, start.session); else if (!cancel && state.adb === start.adb) { const duration = Math.min(2000, Math.max(100, Math.round(performance.now() - start.time))); const command = Math.hypot(point.x - start.start.x, point.y - start.start.y) < 10 ? `input tap ${point.x} ${point.y}` : `input swipe ${start.start.x} ${start.start.y} ${point.x} ${point.y} ${duration}`; invoke(async () => { await shell(command, start.adb); await captureScreen(); }); } }
$('screenCanvas').addEventListener('pointerup', event => pointerEnd(event)); $('screenCanvas').addEventListener('pointercancel', event => pointerEnd(event, true));
$('screenCanvas').addEventListener('keydown', event => { const codes = { Enter: 66, Backspace: 67, Escape: 4, Tab: 61, ArrowUp: 19, ArrowDown: 20, ArrowLeft: 21, ArrowRight: 22 }; if (codes[event.key]) { event.preventDefault(); invoke(() => keyEvent(codes[event.key])); } });

document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.view || button.dataset.go) showView(button.dataset.view || button.dataset.go);
  if (button.dataset.close) $(button.dataset.close).close();
  if (button.dataset.action === 'install') { try { requireAdb(); $('apkInput').click(); } catch (error) { report(error); } }
  if (button.dataset.filter) { state.filter = button.dataset.filter; renderApps(); }
  if (button.dataset.openApp) invoke(() => openApp(button.dataset.openApp));
  if (button.dataset.bulk) invoke(() => appAction(button.dataset.bulk, [...state.selected]));
  if (button.dataset.appAction && state.currentApp) invoke(() => appAction(button.dataset.appAction, [state.currentApp.package]));
  if (button.dataset.path) invoke(() => loadFiles(button.dataset.path));
  if (button.dataset.fileIndex !== undefined) invoke(() => openFile(Number(button.dataset.fileIndex)));
  if (button.dataset.key) invoke(() => keyEvent(Number(button.dataset.key)));
  if (button.dataset.command) invoke(async () => { if (button.dataset.confirm && !await confirmAction(button.dataset.confirm, 'Se interrumpirá la sesión. El coche debe estar estacionado.', 'Reiniciar')) return; showView('console'); await executeCommand(button.dataset.command); });
});
$('connectButton').onclick = () => { toggleConnection().catch(report); }; $('heroConnect').onclick = $('connectButton').onclick;
$('themeButton').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('clearActivity').onclick = () => { $('activityLog').replaceChildren(); activity('Registro limpiado'); };
$('refreshApps').onclick = () => invoke(async () => { await refreshApps(); activity('Lista de aplicaciones actualizada'); });
$('appSearch').oninput = renderApps;
$('appTableBody').onchange = event => { const pkg = event.target.dataset.selectApp; if (pkg) { event.target.checked ? state.selected.add(pkg) : state.selected.delete(pkg); renderApps(); } };
$('selectAllApps').onchange = event => { for (const app of filteredApps()) event.target.checked ? state.selected.add(app.package) : state.selected.delete(app.package); renderApps(); };
$('backupApps').onclick = () => { exportPackages(state.apps.map(a => a.package)).catch(report); };
$('apkInput').onchange = event => { const files = [...event.target.files]; event.target.value = ''; invoke(() => installFiles(files)); };
$('uploadFileButton').onclick = () => $('uploadInput').click();
$('uploadInput').onchange = event => { const files = [...event.target.files]; event.target.value = ''; invoke(() => uploadFiles(files)); };
$('pathForm').onsubmit = event => { event.preventDefault(); invoke(() => loadFiles($('remotePath').value)); };
$('parentDirectory').onclick = () => invoke(() => loadFiles(state.filesPath + '/..'));
$('downloadPathForm').onsubmit = event => { event.preventDefault(); downloadRemote($('downloadPath').value).catch(report); };
$('cancelOperation').onclick = () => { state.operation?.controller.abort(new DOMException('Cancelado por el usuario', 'AbortError')); toast('Cancelando. Si Android ya está instalando, se esperará su respuesta.'); };
$('terminalForm').onsubmit = event => { event.preventDefault(); const command = $('terminalInput').value; $('terminalInput').value = ''; invoke(() => executeCommand(command)); };
$('stopCommand').onclick = () => state.command?.abort(new DOMException('Comando detenido', 'AbortError'));
$('startLogcat').onclick = () => invoke(() => executeCommand('logcat -v threadtime', true));
$('clearConsole').onclick = () => text('terminalOutput', '');
$('saveConsole').onclick = () => downloadBlob(new Blob([$('terminalOutput').textContent], { type: 'text/plain;charset=utf-8' }), 'HABRO-ADB-registro.txt');
$('copyConsole').onclick = () => invoke(async () => { await navigator.clipboard.writeText($('terminalOutput').textContent); toast('Consola copiada.'); });
$('terminalInput').addEventListener('keydown', event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); state.historyIndex = Math.min(state.history.length, Math.max(0, state.historyIndex + (event.key === 'ArrowUp' ? -1 : 1))); event.target.value = state.history[state.historyIndex] || ''; } if (event.key === 'Tab') { const matches = all('[data-command]').map(el => el.dataset.command).filter(command => command.startsWith(event.target.value)); if (matches.length === 1) { event.preventDefault(); event.target.value = matches[0]; } } });
$('commandSuggestions').innerHTML = all('[data-command]').map(el => `<option value="${escapeHtml(el.dataset.command)}"></option>`).join('');
$('captureScreen').onclick = () => invoke(captureScreen); $('startScreen').onclick = () => invoke(startScreen);
$('saveScreen').onclick = () => $('screenCanvas').toBlob(blob => { if (blob) downloadBlob(blob, 'HABRO-pantalla.png'); }, 'image/png');
$('fullscreenButton').onclick = () => invoke(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('screenStage').requestFullscreen) await $('screenStage').requestFullscreen(); else throw new Error('Este navegador no admite pantalla completa.'); });
$('remoteTextForm').onsubmit = event => { event.preventDefault(); invoke(async () => { const adb = requireAdb(); const value = $('remoteText').value; if (!value) return; if (state.screen?.client.controller) await state.screen.client.controller.injectText(value); else { if (/[^\x20-\x7e]/.test(value) || value.includes('%s')) throw new Error('El teclado ADB de este modo admite texto latino sin acentos.'); await shell('input text ' + quote(value.replaceAll(' ', '%s')), adb); } $('remoteText').value = ''; }); };
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
window.addEventListener('pagehide', () => { state.operation?.controller.abort(); state.command?.abort(); void state.screen?.client.close().catch(() => {}); void state.adb?.close().catch(() => {}); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (state.screen || state.screenStarting !== null)) invoke(stopScreen); });
let theme = 'light'; try { theme = localStorage.getItem('habro-adb-theme') || 'light'; } catch {} setTheme(theme === 'dark' ? 'dark' : 'light');
compatibility(); syncControls(); showView(location.hash.slice(1));
