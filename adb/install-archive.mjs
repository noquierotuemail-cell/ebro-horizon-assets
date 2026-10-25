// ZIP: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
// AXML: AOSP frameworks/base/libs/androidfw/include/androidfw/ResourceTypes.h
// Version resource IDs: AOSP tools/apksig/.../apk/ApkUtils.java.
// This is a bounded metadata inspection, not an APK signature or malware check.
export const INSTALL_ARCHIVE_LIMITS = Object.freeze({
  compressedBytes: 1024 ** 3,
  extractedBytes: 1024 ** 3,
  entries: 4096,
  manifestBytes: 4 * 1024 ** 2,
  jsonBytes: 1024 ** 2,
  compressedInnerApkBytes: 256 * 1024 ** 2,
  centralDirectoryBytes: 16 * 1024 ** 2,
});
const LIMITS = INSTALL_ARCHIVE_LIMITS;
const NONE = 0xffffffff;
const ANDROID_NS = 'http://schemas.android.com/apk/res/android';
const VERSION_CODE = 0x0101021b;
const VERSION_MAJOR = 0x01010576;
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const utf16 = new TextDecoder('utf-16le', { fatal: true, ignoreBOM: true });
const PACKAGE = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/;
const IDENTIFIER = /^[A-Za-z0-9_.-]+$/;
class ArchiveInspectionError extends Error {}
function fail(message) { throw new ArchiveInspectionError(message); }
function checkAbort(signal) { signal?.throwIfAborted(); }
function bounds(offset, size, end, message = 'El ZIP está truncado o contiene desplazamientos no válidos.') {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > end) fail(message);
}
function equalBytes(a, b) { return a.length === b.length && a.every((value, index) => value === b[index]); }
function decode(bytes, decoder = utf8) {
  try { return decoder.decode(bytes); } catch { fail('El archivo contiene una cadena de texto no válida.'); }
}
function abortable(promise, signal) {
  checkAbort(signal);
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) reject(signal.reason); else resolve(value);
    }, error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) abort();
  });
}
async function readSlice(blob, offset, length, signal) {
  checkAbort(signal); bounds(offset, length, blob.size);
  const part = blob.slice(offset, offset + length);
  checkAbort(signal);
  let bytes;
  try { bytes = new Uint8Array(await abortable(part.arrayBuffer(), signal)); }
  catch (error) { checkAbort(signal); fail('No se ha podido leer el archivo seleccionado.'); }
  checkAbort(signal);
  if (bytes.length !== length) fail('El ZIP está truncado: faltan bytes del archivo.');
  return bytes;
}
function validatePath(name, asciiOnly) {
  if (!name || name.startsWith('/') || /[\\:\x00-\x1f\x7f]/.test(name) || (asciiOnly && !/^[A-Za-z0-9_.\/-]+$/.test(name))) fail('El ZIP contiene una ruta no segura o no compatible.');
  const pieces = name.split('/');
  for (let index = 0; index < pieces.length; index++) {
    if (pieces[index] === '.' || pieces[index] === '..' || (!pieces[index] && index !== pieces.length - 1)) fail('El ZIP contiene una ruta no segura.');
  }
}
function inspectExtra(bytes, local = false) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < bytes.length;) {
    // AOSP zipalign appends raw zero padding to the local extra field only.
    if (local && bytes.length - offset < 4 && bytes.subarray(offset).every(value => value === 0)) return;
    bounds(offset, 4, bytes.length, 'Los campos adicionales del ZIP están truncados.');
    const id = view.getUint16(offset, true), length = view.getUint16(offset + 2, true);
    bounds(offset + 4, length, bytes.length, 'Los campos adicionales del ZIP están truncados.');
    if (id === 1) fail('Los archivos ZIP64 no son compatibles con esta inspección.');
    if (id === 0x9901 || id === 0x0017) fail('No se admiten archivos ZIP cifrados.');
    // Avoid two competing interpretations of a filename by different readers.
    if (id === 0x7075) fail('El ZIP contiene una ruta Unicode alternativa no compatible.');
    offset += 4 + length;
  }
}

async function readZip(blob, { signal, xapk = false } = {}) {
  if (blob.size < 22) fail('El ZIP está truncado o no contiene su directorio final.');
  const tailStart = Math.max(0, blob.size - 65557);
  const tail = await readSlice(blob, tailStart, blob.size - tailStart, signal);
  const tv = new DataView(tail.buffer);
  let end = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (tv.getUint32(index, true) === 0x06054b50 && index + 22 + tv.getUint16(index + 20, true) === tail.length) { end = index; break; }
  }
  if (end < 0) fail('El ZIP está truncado o su directorio final no es válido.');
  const count = tv.getUint16(end + 10, true), directorySize = tv.getUint32(end + 12, true), directoryOffset = tv.getUint32(end + 16, true);
  if (count === 0xffff || directorySize === NONE || directoryOffset === NONE || (end >= 20 && tv.getUint32(end - 20, true) === 0x07064b50)) fail('Los archivos ZIP64 no son compatibles con esta inspección.');
  if (tv.getUint16(end + 4, true) || tv.getUint16(end + 6, true) || tv.getUint16(end + 8, true) !== count) fail('No se admiten archivos ZIP repartidos entre varios discos.');
  if (count > LIMITS.entries) fail('El ZIP supera el límite de 4096 entradas.');
  if (!count) fail('El ZIP no contiene archivos APK ni un manifiesto Android.');
  if (directorySize > LIMITS.centralDirectoryBytes) fail('El directorio del ZIP supera el límite de 16 MiB.');
  if (directoryOffset + directorySize !== tailStart + end) fail('El directorio ZIP está truncado o su posición es incoherente.');
  const directory = await readSlice(blob, directoryOffset, directorySize, signal);
  const dv = new DataView(directory.buffer), entries = [], names = new Set();
  let cursor = 0, extractedBytes = 0;
  for (let index = 0; index < count; index++) {
    checkAbort(signal); bounds(cursor, 46, directory.length);
    if (dv.getUint32(cursor, true) !== 0x02014b50) fail('La cabecera del directorio ZIP no es válida.');
    const needed = dv.getUint16(cursor + 6, true), flags = dv.getUint16(cursor + 8, true), method = dv.getUint16(cursor + 10, true);
    const crc = dv.getUint32(cursor + 16, true), compressedSize = dv.getUint32(cursor + 20, true), size = dv.getUint32(cursor + 24, true);
    const nameLength = dv.getUint16(cursor + 28, true), extraLength = dv.getUint16(cursor + 30, true), commentLength = dv.getUint16(cursor + 32, true);
    const localOffset = dv.getUint32(cursor + 42, true);
    if ([compressedSize, size, localOffset].includes(NONE)) fail('Los archivos ZIP64 no son compatibles con esta inspección.');
    if (dv.getUint16(cursor + 34, true)) fail('No se admiten archivos ZIP repartidos entre varios discos.');
    if (flags & (1 | 0x40 | 0x2000)) fail('No se admiten archivos ZIP cifrados.');
    if (flags & ~0x080e || needed > 20) fail('El ZIP utiliza funciones no compatibles con esta inspección.');
    if (method !== 0 && method !== 8) fail('El ZIP utiliza un método de compresión no compatible; se admite stored o deflate.');
    if (method === 0 && compressedSize !== size) fail('El tamaño de una entrada ZIP sin compresión es incoherente.');
    if (!nameLength || nameLength > 4096) fail('El ZIP contiene una ruta vacía o demasiado larga.');
    bounds(cursor + 46, nameLength + extraLength + commentLength, directory.length);
    const nameBytes = directory.subarray(cursor + 46, cursor + 46 + nameLength), name = decode(nameBytes);
    validatePath(name, xapk);
    if (names.has(name)) fail('El ZIP contiene una entrada duplicada: ' + name);
    names.add(name);
    const directoryEntry = name.endsWith('/');
    const unixType = (dv.getUint32(cursor + 38, true) >>> 16) & 0xf000;
    if (unixType && unixType !== 0x8000 && unixType !== 0x4000) fail('El ZIP contiene un enlace o un tipo de archivo no permitido.');
    if ((unixType === 0x4000 && !directoryEntry) || (directoryEntry && (size !== 0 || crc !== 0))) fail('El ZIP contiene un directorio no válido.');
    inspectExtra(directory.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength));
    bounds(localOffset, 30, directoryOffset);
    const local = await readSlice(blob, localOffset, 30, signal), lv = new DataView(local.buffer);
    if (lv.getUint32(0, true) !== 0x04034b50 || lv.getUint16(4, true) !== needed || lv.getUint16(6, true) !== flags || lv.getUint16(8, true) !== method) fail('Las cabeceras local y central del ZIP no coinciden.');
    const localNameLength = lv.getUint16(26, true), localExtraLength = lv.getUint16(28, true);
    if (localNameLength !== nameLength) fail('Las rutas de las cabeceras ZIP no coinciden.');
    bounds(localOffset + 30, localNameLength + localExtraLength, directoryOffset);
    const localFields = await readSlice(blob, localOffset + 30, localNameLength + localExtraLength, signal);
    if (!equalBytes(nameBytes, localFields.subarray(0, localNameLength))) fail('Las rutas de las cabeceras ZIP no coinciden.');
    inspectExtra(localFields.subarray(localNameLength), true);
    for (const [position, expected] of [[14, crc], [18, compressedSize], [22, size]]) {
      const localValue = lv.getUint32(position, true);
      if (position !== 14 && localValue === NONE) fail('Los archivos ZIP64 no son compatibles con esta inspección.');
      if (localValue !== expected && (!(flags & 8) || localValue !== 0)) fail('Los tamaños o CRC de las cabeceras ZIP no coinciden.');
    }
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    bounds(dataOffset, compressedSize, directoryOffset);
    let recordEnd = dataOffset + compressedSize;
    if (flags & 8) {
      bounds(recordEnd, 12, directoryOffset);
      const descriptor = await readSlice(blob, recordEnd, Math.min(16, directoryOffset - recordEnd), signal);
      const descriptorView = new DataView(descriptor.buffer);
      const matches = start => descriptor.length >= start + 12 && descriptorView.getUint32(start, true) === crc && descriptorView.getUint32(start + 4, true) === compressedSize && descriptorView.getUint32(start + 8, true) === size;
      if (descriptorView.getUint32(0, true) === 0x08074b50 && matches(4)) recordEnd += 16;
      else if (matches(0)) recordEnd += 12;
      else fail('El descriptor de datos ZIP está truncado o no coincide con su cabecera.');
    }
    entries.push({ name, method, crc, compressedSize, size, localOffset, dataOffset, recordEnd, directory: directoryEntry });
    extractedBytes += size;
    if (xapk && extractedBytes > LIMITS.extractedBytes) fail('El XAPK supera 1 GiB de datos descomprimidos.');
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== directory.length) fail('El directorio ZIP contiene entradas o datos adicionales no compatibles.');
  let previousEnd = 0;
  for (const entry of [...entries].sort((a, b) => a.localOffset - b.localOffset)) {
    if (entry.localOffset < previousEnd) fail('El ZIP contiene entradas solapadas.');
    previousEnd = entry.recordEnd;
  }
  return { entries, extractedBytes };
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});
async function readEntry(blob, entry, { signal, limit, collect = false } = {}) {
  checkAbort(signal);
  if (entry.size > limit) fail('La entrada ZIP supera el tamaño permitido para su inspección.');
  let stream = blob.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize).stream();
  if (entry.method === 8) {
    let decompressor;
    try { decompressor = new DecompressionStream('deflate-raw'); }
    catch { fail('Este navegador no puede descomprimir el archivo. Abre la herramienta en una versión actual de Chrome o Edge.'); }
    stream = stream.pipeThrough(decompressor);
  }
  const reader = stream.getReader(), parts = []; let total = 0, crc = 0xffffffff;
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      checkAbort(signal);
      const { done, value } = await reader.read();
      checkAbort(signal); if (done) break;
      total += value.byteLength;
      if (total > limit || total > entry.size) fail('El tamaño real descomprimido no coincide con el declarado en el ZIP.');
      for (let index = 0; index < value.length; index++) crc = (crc >>> 8) ^ crcTable[(crc ^ value[index]) & 255];
      if (collect) parts.push(value);
    }
    if (total !== entry.size) fail('El ZIP está truncado: el tamaño descomprimido no coincide.');
    if (((crc ^ 0xffffffff) >>> 0) !== entry.crc) fail('La verificación CRC del ZIP ha fallado; el archivo está dañado.');
    return collect ? new Blob(parts) : null;
  } catch (error) {
    await reader.cancel(error).catch(() => {}); checkAbort(signal);
    if (error instanceof ArchiveInspectionError) throw error;
    fail('No se ha podido descomprimir el ZIP; el archivo está dañado o truncado.');
  } finally { signal?.removeEventListener('abort', cancel); reader.releaseLock(); }
}

function stringPool(bytes, start, header, size) {
  const end = start + size, view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bad = 'La tabla de cadenas AXML del manifiesto no es válida.';
  if (header < 28) fail(bad);
  const count = view.getUint32(start + 8, true), styles = view.getUint32(start + 12, true), flags = view.getUint32(start + 16, true);
  const stringsStart = view.getUint32(start + 20, true), stylesStart = view.getUint32(start + 24, true);
  if (count > 65536 || styles > count || flags & ~0x101 || stringsStart < header + (count + styles) * 4 || stringsStart > size || (styles && (!stylesStart || stylesStart < stringsStart || stylesStart > size)) || (!styles && stylesStart)) fail(bad);
  bounds(start + header, (count + styles) * 4, start + stringsStart, bad);
  const stringsEnd = stylesStart ? start + stylesStart : end;
  const result = [], cache = new Map(); let decodedUnits = 0;
  for (let index = 0; index < count; index++) {
    const relative = view.getUint32(start + header + index * 4, true);
    let at = start + stringsStart + relative;
    bounds(at, flags & 0x100 ? 1 : 2, stringsEnd, bad);
    if (cache.has(relative)) { result.push(cache.get(relative)); continue; }
    let value;
    if (flags & 0x100) {
      const length = () => { bounds(at, 1, stringsEnd, bad); const first = bytes[at++]; if (!(first & 0x80)) return first; bounds(at, 1, stringsEnd, bad); return ((first & 0x7f) << 8) | bytes[at++]; };
      const units = length(), byteLength = length();
      bounds(at, byteLength + 1, stringsEnd, bad);
      if (bytes[at + byteLength] !== 0) fail(bad);
      value = decode(bytes.subarray(at, at + byteLength));
      if (value.length !== units) fail(bad);
    } else {
      let units = view.getUint16(at, true); at += 2;
      if (units & 0x8000) { bounds(at, 2, stringsEnd, bad); units = (units & 0x7fff) * 65536 + view.getUint16(at, true); at += 2; }
      bounds(at, units * 2 + 2, stringsEnd, bad);
      if (view.getUint16(at + units * 2, true) !== 0) fail(bad);
      value = decode(bytes.subarray(at, at + units * 2), utf16);
      if (value.length !== units) fail(bad);
    }
    decodedUnits += value.length;
    if (value.includes('\0') || decodedUnits > LIMITS.manifestBytes * 2) fail(bad);
    cache.set(relative, value); result.push(value);
  }
  const validatedStyles = new Set(); let styleSteps = 0;
  for (let index = 0; index < styles; index++) {
    const relative = view.getUint32(start + header + (count + index) * 4, true);
    if (relative === NONE || validatedStyles.has(relative)) continue;
    let at = start + stylesStart + relative;
    for (;;) {
      if (++styleSteps > LIMITS.manifestBytes / 4) fail(bad);
      bounds(at, 4, end, bad); const name = view.getUint32(at, true);
      if (name === NONE) break;
      bounds(at, 12, end, bad);
      if (name >= count || view.getUint32(at + 4, true) > view.getUint32(at + 8, true)) fail(bad);
      at += 12;
    }
    validatedStyles.add(relative);
  }
  return result;
}

/** Read Android's binary XML; never use an XAPK JSON identity as a substitute. */
export function parseAndroidManifest(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
  const bad = 'El manifiesto Android AXML no es válido o está truncado.';
  if (!bytes || bytes.length < 8 || bytes.length > LIMITS.manifestBytes) fail('El manifiesto Android debe ser AXML binario y no superar 4 MiB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== 3 || view.getUint16(2, true) !== 8 || view.getUint32(4, true) !== bytes.length) fail(bad);
  let strings = null, resources = [], resourceMapSeen = false, xmlStarted = false, rootSeen = false, rootClosed = false, identity = null;
  const stack = [], namespaces = [];
  const string = index => { if (index === NONE) return null; if (!strings || index >= strings.length) fail(bad); return strings[index]; };
  const namespace = index => { const uri = string(index); if (uri !== null && !namespaces.some(item => item.uri === uri)) fail('El manifiesto AXML contiene un espacio de nombres sin declarar.'); return uri; };
  const typedValue = offset => {
    if (view.getUint16(offset, true) !== 8 || bytes[offset + 2] !== 0) fail(bad);
    const type = bytes[offset + 3], data = view.getUint32(offset + 4, true);
    if (!(type <= 8 || type >= 0x10 && type <= 0x12 || type >= 0x1c && type <= 0x1f)) fail(bad);
    return { type, data, text: type === 3 ? string(data) : null };
  };
  for (let cursor = 8; cursor < bytes.length;) {
    bounds(cursor, 8, bytes.length, bad);
    const type = view.getUint16(cursor, true), header = view.getUint16(cursor + 2, true), size = view.getUint32(cursor + 4, true);
    if (header < 8 || size < header || size % 4 || cursor % 4) fail(bad);
    bounds(cursor, size, bytes.length, bad); const end = cursor + size;
    if (type === 1) {
      if (strings || xmlStarted || resourceMapSeen) fail(bad);
      strings = stringPool(bytes, cursor, header, size);
    } else if (type === 0x180) {
      if (!strings || xmlStarted || resourceMapSeen || header !== 8 || (size - 8) / 4 > strings.length) fail(bad);
      resourceMapSeen = true;
      resources = Array.from({ length: (size - 8) / 4 }, (_, index) => view.getUint32(cursor + 8 + index * 4, true));
    } else {
      if (!strings || header !== 16) fail(bad);
      xmlStarted = true; string(view.getUint32(cursor + 12, true));
      const extension = cursor + header;
      if (type === 0x100 || type === 0x101) {
        bounds(extension, 8, end, bad);
        const prefix = string(view.getUint32(extension, true)), uri = string(view.getUint32(extension + 4, true));
        if (!uri) fail(bad);
        if (type === 0x100) {
          if (rootClosed || namespaces.length >= 256 || namespaces.some(item => item.prefix === prefix && item.depth === stack.length)) fail(bad);
          namespaces.push({ prefix, uri, depth: stack.length });
        } else {
          const index = namespaces.findLastIndex(item => item.prefix === prefix && item.uri === uri && item.depth === stack.length);
          if (index < 0) fail(bad); namespaces.splice(index, 1);
        }
      } else if (type === 0x102) {
        bounds(extension, 20, end, bad);
        const ns = namespace(view.getUint32(extension, true)), name = string(view.getUint32(extension + 4, true));
        const start = view.getUint16(extension + 8, true), attributeSize = view.getUint16(extension + 10, true), count = view.getUint16(extension + 12, true);
        if (!name || start < 20 || attributeSize < 20 || count > 4096 || rootClosed || stack.length >= 256) fail(bad);
        bounds(extension + start, attributeSize * count, end, bad);
        for (const field of [14, 16, 18]) if (view.getUint16(extension + field, true) > count) fail(bad);
        const attributes = [], seen = new Set();
        for (let index = 0; index < count; index++) {
          const at = extension + start + index * attributeSize;
          const attributeNs = namespace(view.getUint32(at, true)), nameIndex = view.getUint32(at + 4, true), attributeName = string(nameIndex);
          const raw = string(view.getUint32(at + 8, true)), typed = typedValue(at + 12);
          const key = JSON.stringify([attributeNs, attributeName]);
          if (!attributeName || seen.has(key)) fail('El manifiesto AXML contiene atributos duplicados.');
          seen.add(key); attributes.push({ ns: attributeNs, name: attributeName, raw, ...typed, resource: resources[nameIndex] ?? 0 });
        }
        if (!stack.length) {
          if (rootSeen || ns !== null || name !== 'manifest') fail(bad);
          rootSeen = true;
          let packageName = null, splitName = null, minor = 0n, major = 0n;
          const identityFields = new Set();
          for (const attribute of attributes) {
            const expectedResource = attribute.name === 'versionCode' ? VERSION_CODE : attribute.name === 'versionCodeMajor' ? VERSION_MAJOR : 0;
            if ((attribute.resource === VERSION_CODE || attribute.resource === VERSION_MAJOR) && expectedResource !== attribute.resource) fail('El manifiesto AXML contiene identificadores de versión ambiguos.');
            if (expectedResource) {
              if (attribute.ns !== ANDROID_NS || attribute.resource !== expectedResource || ![0x10, 0x11].includes(attribute.type) || identityFields.has(attribute.name)) fail('El manifiesto AXML contiene una versión ambigua o no numérica.');
              identityFields.add(attribute.name);
              const value = BigInt(attribute.data);
              if (attribute.raw !== null && (attribute.raw.length > 12 || !/^(?:\d+|0x[0-9a-f]+)$/i.test(attribute.raw) || BigInt(attribute.raw) !== value)) fail('Los valores de versión del manifiesto AXML no coinciden.');
              if (attribute.name === 'versionCode') minor = value; else major = value;
            } else if (attribute.name === 'package' || attribute.name === 'split') {
              if (attribute.ns !== null || attribute.resource !== 0 || attribute.type !== 3 || attribute.text === null || identityFields.has(attribute.name) || (attribute.raw !== null && attribute.raw !== attribute.text)) fail('La identidad del manifiesto AXML es ambigua.');
              identityFields.add(attribute.name);
              if (attribute.name === 'package') packageName = attribute.text; else splitName = attribute.text || null;
            }
          }
          if (!packageName || packageName.length > 255 || !PACKAGE.test(packageName) || (splitName !== null && (splitName.length > 255 || !IDENTIFIER.test(splitName)))) fail('El manifiesto Android contiene un paquete o split no válido.');
          if (major > 0x7fffffffn) fail('El código mayor de versión del manifiesto no puede ser negativo.');
          identity = { packageName, versionCode: ((major << 32n) | minor).toString(), splitName };
        }
        stack.push({ ns, name });
      } else if (type === 0x103) {
        bounds(extension, 8, end, bad);
        const ns = namespace(view.getUint32(extension, true)), name = string(view.getUint32(extension + 4, true)), current = stack.pop();
        if (!current || current.ns !== ns || current.name !== name) fail(bad);
        if (!stack.length) rootClosed = true;
      } else if (type === 0x104) {
        bounds(extension, 12, end, bad);
        if (!stack.length) fail(bad); string(view.getUint32(extension, true)); typedValue(extension + 4);
      } else fail('El manifiesto contiene un tipo de bloque AXML no compatible.');
    }
    cursor += size;
  }
  if (!identity || !rootClosed || stack.length || namespaces.length) fail(bad);
  return identity;
}

async function inspectApk(blob, signal) {
  const { entries } = await readZip(blob, { signal });
  const manifest = entries.find(entry => entry.name === 'AndroidManifest.xml');
  if (!manifest || manifest.directory) fail('El APK no contiene AndroidManifest.xml en su raíz.');
  if (manifest.size > LIMITS.manifestBytes) fail('El manifiesto Android supera el límite de 4 MiB.');
  const content = await readEntry(blob, manifest, { signal, limit: LIMITS.manifestBytes, collect: true });
  const bytes = await readSlice(content, 0, content.size, signal);
  const identity = parseAndroidManifest(bytes); checkAbort(signal); return identity;
}
function jsonInteger(value, label) {
  if (typeof value === 'number') { if (!Number.isSafeInteger(value) || value < 0) fail('El manifiesto XAPK contiene ' + label + ' sin precisión o no válido.'); return BigInt(value); }
  if (typeof value !== 'string' || !/^\d+$/.test(value) || value.length > 20) fail('El manifiesto XAPK contiene ' + label + ' no válido.');
  return BigInt(value);
}
function validateXapkManifest(manifest, apks, base, entries) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('El manifest.json del XAPK no es válido.');
  if (manifest.xapk_version !== 2) {
    if (base.entry.name !== 'base.apk') fail('El XAPK necesita base.apk o un manifest.json de versión 2 válido.');
    return;
  }
  if (manifest.package_name !== base.identity.packageName || jsonInteger(manifest.version_code, 'version_code') !== BigInt(base.identity.versionCode)) fail('El paquete o la versión de manifest.json no coincide con los APK reales.');
  if (!Array.isArray(manifest.split_apks) || manifest.split_apks.length !== apks.length || !Array.isArray(manifest.split_configs)) fail('El manifiesto XAPK no describe todos los APK.');
  const files = new Map(), ids = new Set();
  for (const part of manifest.split_apks) {
    if (!part || typeof part !== 'object' || Array.isArray(part) || Object.keys(part).some(key => key !== 'file' && key !== 'id') || typeof part.file !== 'string' || typeof part.id !== 'string' || !IDENTIFIER.test(part.id) || files.has(part.file) || ids.has(part.id)) fail('El manifiesto XAPK contiene una lista de splits no válida.');
    files.set(part.file, part.id); ids.add(part.id);
  }
  for (const part of apks) if (files.get(part.entry.name) !== (part.identity.splitName ?? 'base')) fail('La selección de base o splits de manifest.json no coincide con los APK reales.');
  const expectedSplits = new Set(apks.filter(part => part !== base).map(part => part.identity.splitName));
  const configurations = new Set(manifest.split_configs);
  if (configurations.size !== manifest.split_configs.length || configurations.size !== expectedSplits.size || [...configurations].some(value => typeof value !== 'string' || !expectedSplits.has(value))) fail('Los split_configs del manifiesto XAPK no coinciden con los APK reales.');
  const payloadSize = entries.filter(entry => !entry.directory && (entry.name.endsWith('.apk') || entry.name.endsWith('.obb'))).reduce((sum, entry) => sum + entry.size, 0);
  if (jsonInteger(manifest.total_size, 'total_size') !== BigInt(payloadSize)) fail('El tamaño total de manifest.json no coincide con el contenido del XAPK.');
  if (Object.hasOwn(manifest, 'icon') && (manifest.icon !== 'icon.png' || !entries.some(entry => entry.name === 'icon.png'))) fail('El icono declarado en manifest.json no existe o no es compatible.');
}

/** Inspect a user-selected APK/XAPK locally. No commands, uploads or mutations. */
export async function inspectInstallArchive(file, { signal } = {}) {
  checkAbort(signal);
  if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || typeof file.slice !== 'function') fail('Selecciona un archivo APK o XAPK válido.');
  if (file.size > LIMITS.compressedBytes) fail('El archivo comprimido supera el límite de 1 GiB.');
  const extension = String(file.name ?? '').toLowerCase().match(/\.(apk|xapk)$/)?.[1];
  if (!extension) fail('Selecciona un archivo con extensión .apk o .xapk.');
  if (extension === 'apk') {
    const identity = await inspectApk(file, signal);
    if (identity.splitName !== null) fail('Este APK es un split. Selecciona un XAPK completo o utiliza la instalación estándar de APK divididos.');
    return { format: 'apk', packageName: identity.packageName, versionCode: identity.versionCode, splitNames: [], extractedBytes: file.size, obbCount: 0, obbEntries: [] };
  }
  const { entries, extractedBytes } = await readZip(file, { signal, xapk: true });
  const apks = [], obbEntries = []; let manifestEntry = null;
  for (const entry of entries) {
    if (entry.directory) {
      if (!['Android/', 'Android/obb/'].includes(entry.name) && !/^Android\/obb\/[^/]+\/$/.test(entry.name)) fail('El XAPK contiene un directorio no compatible con el instalador.');
    } else if (/^[^/]+\.apk$/.test(entry.name)) {
      if (entry.method === 8 && entry.size > LIMITS.compressedInnerApkBytes) fail('Un APK comprimido dentro del XAPK supera 256 MiB. Usa un XAPK que guarde sus APK sin comprimir o la instalación estándar.');
      apks.push({ entry, identity: null });
    } else if (entry.name === 'manifest.json') {
      if (entry.size > LIMITS.jsonBytes) fail('El manifest.json del XAPK supera el límite de 1 MiB.');
      manifestEntry = entry;
    } else if (entry.name === 'icon.png') {
      // The image remains opaque; only ZIP size and integrity are checked.
    } else if (/^Android\/obb\/[^/]+\/[^/]+\.obb$/.test(entry.name)) obbEntries.push(entry.name);
    else fail('El XAPK contiene una ruta o un archivo no compatible con el instalador.');
  }
  if (!apks.length) fail('El XAPK no contiene un APK base.');
  let manifest = null;
  for (const entry of entries) {
    checkAbort(signal); if (entry.directory) continue;
    const part = apks.find(item => item.entry === entry);
    const collect = entry === manifestEntry || part && entry.method === 8;
    const content = await readEntry(file, entry, { signal, limit: entry === manifestEntry ? LIMITS.jsonBytes : part && entry.method === 8 ? LIMITS.compressedInnerApkBytes : LIMITS.extractedBytes, collect });
    if (part) {
      // Stored APKs retain a slice of the original Blob instead of a full buffer.
      const apkBlob = content ?? file.slice(entry.dataOffset, entry.dataOffset + entry.size);
      part.identity = await inspectApk(apkBlob, signal);
    } else if (entry === manifestEntry) {
      const bytes = await readSlice(content, 0, content.size, signal);
      try { manifest = JSON.parse(decode(bytes)); }
      catch (error) { if (error instanceof ArchiveInspectionError) throw error; fail('El manifest.json del XAPK no contiene JSON válido.'); }
    }
  }
  const bases = apks.filter(part => part.identity.splitName === null);
  if (bases.length !== 1) fail('El XAPK debe contener exactamente un APK base.');
  const base = bases[0], splitNames = new Set();
  for (const part of apks) {
    if (part.identity.packageName !== base.identity.packageName || part.identity.versionCode !== base.identity.versionCode) fail('Todos los APK del XAPK deben tener el mismo paquete y versión.');
    if (part !== base) {
      if (part.entry.name === 'base.apk') fail('El XAPK usa base.apk para un split y provocaría una colisión con el APK base.');
      if (splitNames.has(part.identity.splitName)) fail('El XAPK contiene nombres de split duplicados.');
      splitNames.add(part.identity.splitName);
    }
  }
  const obbPrefix = 'Android/obb/' + base.identity.packageName + '/';
  for (const entry of entries) if ((entry.name.startsWith('Android/obb/') && entry.directory && entry.name !== 'Android/obb/' && entry.name !== obbPrefix) || (!entry.directory && entry.name.endsWith('.obb') && !entry.name.startsWith(obbPrefix))) fail('Los archivos o directorios OBB pertenecen a otro paquete.');
  if (manifestEntry) validateXapkManifest(manifest, apks, base, entries);
  else if (base.entry.name !== 'base.apk') fail('El XAPK necesita base.apk o un manifest.json de versión 2 válido.');
  checkAbort(signal);
  return { format: 'xapk', packageName: base.identity.packageName, versionCode: base.identity.versionCode, splitNames: [...splitNames].sort(), extractedBytes, obbCount: obbEntries.length, obbEntries };
}
