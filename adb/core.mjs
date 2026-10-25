export function quote(value) {
  const text = String(value);
  if (text.includes('\0')) throw new Error('El valor contiene un carácter no permitido.');
  return "'" + text.replaceAll("'", "'\\''") + "'";
}
export function validPackage(value) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*$/.test(value)) throw new Error('Nombre de paquete no válido.');
  return value;
}
export function devicePath(value) {
  const text = String(value).trim();
  if (!text.startsWith('/') || /[\0\r\n]/.test(text)) throw new Error('Introduce una ruta absoluta del dispositivo.');
  const parts = [];
  for (const p of text.split('/')) { if (p === '..') parts.pop(); else if (p && p !== '.') parts.push(p); }
  return '/' + parts.join('/');
}
export function safeFileName(value) {
  return String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^\.+$/, '_').slice(0, 180) || 'archivo';
}
export function packagesFrom(output) {
  return [...new Set(output.split(/\r?\n/).map(line => line.trim().match(/^package:(?:.*=)?([A-Za-z][A-Za-z0-9_.]*)$/)?.[1]).filter(Boolean))].sort();
}
export function packagePaths(output) {
  return output.split(/\r?\n/).map(s => s.trim()).filter(s => s.startsWith('package:/')).map(s => devicePath(s.slice(8)));
}
export function normalizeShellCommand(value) {
  let text = String(value).trim();
  if (/^adb\s+shell\s+/.test(text)) text = text.replace(/^adb\s+shell\s+/, '');
  if (/^adb(?:\s|$)/.test(text)) throw new Error('Esta consola ejecuta órdenes de Android. Usa las pestañas para instalar APK o transferir archivos; para una orden shell, escribe adb shell seguido del comando, o solo el comando.');
  if (!text || text.includes('\0')) throw new Error('Escribe un comando válido.');
  return text;
}
export function parseStorage(text) {
  const line = text.trim().split(/\r?\n/).findLast(s => /\s\d+%\s+/.test(s));
  if (!line) return null;
  const columns = line.trim().split(/\s+/);
  if (columns.length < 6) return null;
  return { total: columns.at(-5), used: columns.at(-4), free: columns.at(-3), percent: columns.at(-2) };
}
export function formatBytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return (n / 1024 ** exponent).toLocaleString('es-ES', { maximumFractionDigits: exponent > 0 ? 1 : 0 }) + ' ' + units[exponent];
}
export async function drainText(stream, onText, maxBytes = 8 * 1024 * 1024) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '', size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      size += value.byteLength;
      onText?.(text);
      if (size <= maxBytes) result += text;
      else if (!onText) throw new Error('La respuesta supera el límite de lectura. Usa el registro de consola.');
    }
    const tail = decoder.decode();
    onText?.(tail);
    return result + tail;
  } catch (error) { await reader.cancel(error).catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}
export async function runShell(adb, command, { signal, onOutput, onProcess, timeout = 30000, check = true } = {}) {
  const controller = new AbortController();
  const forward = () => controller.abort(signal.reason);
  if (signal?.aborted) controller.abort(signal.reason);
  else signal?.addEventListener('abort', forward, { once: true });
  const timer = timeout ? setTimeout(() => controller.abort(new Error('El comando no ha respondido a tiempo.')), timeout) : null;
  let process, abortHandler;
  let output = { stdout: '', stderr: '', exitCode: null };
  const stop = () => { try { Promise.resolve(process?.kill?.()).catch(() => {}); } catch {} };
  const aborted = new Promise((_, reject) => {
    abortHandler = () => { stop(); reject(controller.signal.reason); };
    controller.signal.addEventListener('abort', abortHandler, { once: true });
  });
  try {
    controller.signal.throwIfAborted();
    const service = adb.subprocess.shellProtocol || adb.subprocess.noneProtocol;
    process = await Promise.race([service.spawn(['sh', '-c', quote(command)], controller.signal).then(value => {
      if (controller.signal.aborted) { try { Promise.resolve(value.kill?.()).catch(() => {}); } catch {} }
      return value;
    }), aborted]);
    onProcess?.(process);
    const exitPromise = Promise.resolve(process.exited);
    if (process.stdout) {
      const [stdout, stderr, exitCode] = await Promise.race([Promise.all([drainText(process.stdout, onOutput), drainText(process.stderr, onOutput), exitPromise]), aborted]);
      output = { stdout, stderr, exitCode };
      controller.signal.throwIfAborted();
      if (check && exitCode !== 0) throw new Error((stderr || stdout || `El comando terminó con código ${exitCode}.`).trim());
      return output;
    }
    const [stdout] = await Promise.race([Promise.all([drainText(process.output, onOutput), exitPromise]), aborted]);
    output = { stdout, stderr: '', exitCode: null };
    controller.signal.throwIfAborted();
    return output;
  } catch (error) {
    stop(); const failure = controller.signal.aborted ? controller.signal.reason : error;
    if (failure && typeof failure === 'object') Object.assign(failure, output);
    throw failure;
  }
  finally { if (timer) clearTimeout(timer); signal?.removeEventListener('abort', forward); controller.signal.removeEventListener('abort', abortHandler); }
}
export async function collectBinary(stream, { signal, limit = 256 * 1024 * 1024, onProgress } = {}) {
  const reader = stream.getReader(); const parts = []; let total = 0;
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('El archivo es demasiado grande para guardarlo en memoria. Usa la descarga directa a una carpeta en Chrome o Edge.');
      parts.push(value.slice()); onProgress?.(total);
    }
    signal?.throwIfAborted();
    const output = new Uint8Array(total); let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
    return output;
  } catch (error) { await reader.cancel(error).catch(() => {}); throw error; }
  finally { signal?.removeEventListener('abort', cancel); reader.releaseLock(); }
}
