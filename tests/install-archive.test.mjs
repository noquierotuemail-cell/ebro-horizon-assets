import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateRawSync } from 'node:zlib';
import { inspectInstallArchive, parseAndroidManifest } from '../adb/install-archive.mjs';

const encode = value => new TextEncoder().encode(value);
const join = parts => new Uint8Array(Buffer.concat(parts.map(part => Buffer.from(part))));
const file = (bytes, name = 'synthetic.apk') => Object.assign(new Blob([bytes]), { name });
const u32 = value => { const result = new Uint8Array(4); new DataView(result.buffer).setUint32(0, value, true); return result; };
const NONE = 0xffffffff;
const ANDROID = 'http://schemas.android.com/apk/res/android';

function xmlChunk(type, headerSize, body) {
  const result = new Uint8Array(8 + body.length);
  const view = new DataView(result.buffer);
  view.setUint16(0, type, true); view.setUint16(2, headerSize, true); view.setUint32(4, result.length, true);
  result.set(body, 8); return result;
}

function axml({ packageName = 'com.example.demo', versionCode = 7, versionCodeMajor = 0,
  split = null, utf16 = false, rawVersion, versionResource = 0x0101021b, extraAttributes = [],
  longString = 'Café 🚗', closeRoot = true } = {}) {
  const strings = ['manifest', 'android', ANDROID, 'package', 'split', 'versionCode', 'versionCodeMajor', longString];
  const index = value => { let result = strings.indexOf(value); if (result < 0) { result = strings.length; strings.push(value); } return result; };
  const attributes = [{ name: 'package', value: packageName }];
  if (split !== null) attributes.push({ name: 'split', value: split });
  if (versionCode !== null) attributes.push({ name: 'versionCode', value: versionCode, numeric: true, raw: rawVersion });
  if (versionCodeMajor !== null && versionCodeMajor !== 0) attributes.push({ name: 'versionCodeMajor', value: versionCodeMajor, numeric: true });
  attributes.push(...extraAttributes);
  const encodedAttributes = attributes.map(attribute => {
    const result = new Uint8Array(20), view = new DataView(result.buffer);
    view.setUint32(0, attribute.numeric ? 2 : NONE, true);
    view.setUint32(4, index(attribute.name), true);
    view.setUint32(8, attribute.raw !== undefined ? index(attribute.raw) : attribute.numeric ? NONE : index(attribute.value), true);
    view.setUint16(12, 8, true); view.setUint8(15, attribute.numeric ? 0x10 : 3);
    view.setUint32(16, attribute.numeric ? attribute.value : index(attribute.value), true);
    return result;
  });
  const poolParts = [], offsets = []; let offset = 0;
  const length8 = size => size < 128 ? [size] : [0x80 | (size >>> 8), size & 255];
  for (const text of strings) {
    offsets.push(offset);
    let value;
    if (utf16) {
      const prefix = text.length < 0x8000 ? new Uint8Array(2) : new Uint8Array(4);
      const view = new DataView(prefix.buffer);
      if (prefix.length === 2) view.setUint16(0, text.length, true);
      else { view.setUint16(0, 0x8000 | (text.length >>> 16), true); view.setUint16(2, text.length & 0xffff, true); }
      value = join([prefix, Buffer.from(text, 'utf16le'), new Uint8Array(2)]);
    } else {
      const bytes = encode(text); value = join([new Uint8Array([...length8(text.length), ...length8(bytes.length)]), bytes, new Uint8Array(1)]);
    }
    poolParts.push(value); offset += value.length;
  }
  const poolBody = join([u32(strings.length), u32(0), u32(utf16 ? 0 : 0x100), u32(28 + strings.length * 4), u32(0), ...offsets.map(u32), ...poolParts]);
  const pool = xmlChunk(1, 28, join([poolBody, new Uint8Array((4 - (poolBody.length % 4)) % 4)]));
  const resources = Array(strings.length).fill(0); resources[5] = versionResource; resources[6] = 0x01010576;
  const resourceMap = xmlChunk(0x180, 8, join(resources.map(u32)));
  const node = (type, extension) => xmlChunk(type, 16, join([u32(1), u32(NONE), extension]));
  const startNamespace = node(0x100, join([u32(1), u32(2)]));
  const start = new Uint8Array(20); const view = new DataView(start.buffer);
  view.setUint32(0, NONE, true); view.setUint32(4, 0, true); view.setUint16(8, 20, true); view.setUint16(10, 20, true); view.setUint16(12, attributes.length, true);
  const content = [pool, resourceMap, startNamespace, node(0x102, join([start, ...encodedAttributes]))];
  if (closeRoot) content.push(node(0x103, join([u32(NONE), u32(0)])));
  content.push(node(0x101, join([u32(1), u32(2)])));
  return xmlChunk(3, 8, join(content));
}

function zip(entries, { comment = '', disk = 0, count, centralOffset } = {}) {
  const locals = [], central = []; let position = 0;
  for (const entry of entries) {
    const name = encode(entry.name), localName = encode(entry.localName ?? entry.name);
    const data = entry.data ?? new Uint8Array();
    const method = entry.method ?? 0;
    const compressed = entry.compressedData ?? (method === 8 ? deflateRawSync(data) : data);
    const size = entry.size ?? data.length;
    const checksum = entry.crc ?? crc32(data);
    const flags = entry.flags ?? (0x800 | (entry.descriptor ? 8 : 0));
    const extra = entry.extra ?? new Uint8Array();
    const local = new Uint8Array(30), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, flags, true); lv.setUint16(8, method, true);
    lv.setUint32(14, entry.descriptor ? 0 : checksum, true); lv.setUint32(18, entry.descriptor ? 0 : compressed.length, true); lv.setUint32(22, entry.descriptor ? 0 : size, true);
    lv.setUint16(26, localName.length, true); lv.setUint16(28, extra.length, true);
    const descriptor = entry.descriptor ? join([...(entry.descriptor === 'unsigned' ? [] : [u32(0x08074b50)]), u32(checksum), u32(compressed.length), u32(size)]) : new Uint8Array();
    const localRecord = join([local, localName, extra, compressed, descriptor]);
    locals.push(localRecord);
    const header = new Uint8Array(46), cv = new DataView(header.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, (3 << 8) | 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, flags, true); cv.setUint16(10, method, true);
    cv.setUint32(16, checksum, true); cv.setUint32(20, compressed.length, true); cv.setUint32(24, size, true); cv.setUint16(28, name.length, true); cv.setUint16(30, extra.length, true);
    cv.setUint16(34, entry.disk ?? 0, true); cv.setUint32(38, (entry.mode ?? (entry.name.endsWith('/') ? 0x41ed : 0x81a4)) * 65536, true); cv.setUint32(42, entry.offset ?? position, true);
    central.push(join([header, name, extra])); position += localRecord.length;
  }
  const directory = join(central), commentBytes = encode(comment), eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, disk, true); ev.setUint16(6, disk, true); ev.setUint16(8, count ?? entries.length, true); ev.setUint16(10, count ?? entries.length, true);
  ev.setUint32(12, directory.length, true); ev.setUint32(16, centralOffset ?? position, true); ev.setUint16(20, commentBytes.length, true);
  return join([...locals, directory, eocd, commentBytes]);
}

const apk = (options = {}, manifestOptions = {}) => zip([{ name: 'AndroidManifest.xml', data: axml(options), ...manifestOptions }]);

test('Reads real UTF-8 and UTF-16 AXML, including extended lengths and exact long versions', async () => {
  for (const utf16 of [false, true]) {
    const bytes = axml({ utf16, longString: utf16 ? 'x'.repeat(33000) : 'é'.repeat(130), versionCode: 0xffffffff, versionCodeMajor: 2097152 });
    assert.deepEqual(parseAndroidManifest(bytes), { packageName: 'com.example.demo', versionCode: '9007203549708287', splitName: null });
    const result = await inspectInstallArchive(file(zip([{ name: 'AndroidManifest.xml', data: bytes, method: 8 }])));
    assert.equal(result.versionCode, '9007203549708287');
    assert.equal(result.format, 'apk'); assert.equal(result.obbCount, 0); assert.deepEqual(result.splitNames, []);
  }
});

test('Missing versionCode is zero only for a complete well-formed Android manifest', () => {
  assert.equal(parseAndroidManifest(axml({ versionCode: null })).versionCode, '0');
  assert.throws(() => parseAndroidManifest(axml({ versionCode: null, closeRoot: false })), /manifiesto|AXML/i);
  assert.throws(() => parseAndroidManifest(encode('<manifest package="com.example.demo"/>')), /AXML|binario/i);
});

test('Rejects ambiguous AXML resource IDs, conflicting raw values and duplicate identity attributes', () => {
  for (const bytes of [axml({ versionResource: 0 }), axml({ rawVersion: '9999' }), axml({ extraAttributes: [{ name: 'package', value: 'com.other.app' }] }), axml({ versionCodeMajor: 0xffffffff })]) {
    assert.throws(() => parseAndroidManifest(bytes), /AXML|manifiesto|versión/i);
  }
  assert.equal(parseAndroidManifest(axml({ rawVersion: '7' })).versionCode, '7');
});

test('Rejects truncated AXML chunks and invalid string indices', () => {
  const original = axml();
  assert.throws(() => parseAndroidManifest(original.slice(0, -4)), /AXML|manifiesto/i);
  const corrupt = original.slice(); const view = new DataView(corrupt.buffer);
  view.setUint32(8 + 28, 0xfffffffe, true);
  assert.throws(() => parseAndroidManifest(corrupt), /AXML|cadena|manifiesto/i);
});

test('Handles stored and deflated ZIP entries, signed/unsigned descriptors and ZIP comments', async () => {
  for (const method of [0, 8]) for (const descriptor of [false, true, 'unsigned']) {
    const bytes = zip([{ name: 'AndroidManifest.xml', data: axml(), method, descriptor }], { comment: 'ZIP comment' });
    const result = await inspectInstallArchive(file(bytes));
    assert.equal(result.packageName, 'com.example.demo'); assert.equal(result.versionCode, '7'); assert.equal(result.extractedBytes, bytes.length);
  }
});

test('Accepts zipalign zero padding only in local extras and keeps forbidden-field checks', async () => {
  const original = apk();
  const localExtra = extra => {
    const before = new DataView(original.buffer);
    const dataOffset = 30 + before.getUint16(26, true) + before.getUint16(28, true);
    const result = join([original.subarray(0, dataOffset), extra, original.subarray(dataOffset)]);
    const after = new DataView(result.buffer);
    after.setUint16(28, before.getUint16(28, true) + extra.length, true);
    after.setUint32(result.length - 6, before.getUint32(original.length - 6, true) + extra.length, true);
    return result;
  };
  for (const count of [1, 2, 3, 7]) {
    assert.equal((await inspectInstallArchive(file(localExtra(new Uint8Array(count))))).versionCode, '7');
  }
  for (const extra of [[0, 0, 1], [1, 0, 0, 0, 0, 0, 0], [1, 153, 0, 0, 0], [117, 112, 0, 0, 0]]) {
    await assert.rejects(inspectInstallArchive(file(localExtra(new Uint8Array(extra)))), /ZIP|cifrad|Unicode/i);
  }
  await assert.rejects(inspectInstallArchive(file(apk({}, { extra: new Uint8Array(3) }))), /ZIP|truncad/i);
});

test('Standalone APK inspection only decompresses its Android manifest', async () => {
  const bytes = zip([{ name: 'AndroidManifest.xml', data: axml() }, { name: 'assets/unrelated.bin', data: new Uint8Array(16), compressedData: encode('not deflate'), method: 8 }]);
  assert.equal((await inspectInstallArchive(file(bytes))).versionCode, '7');
});

test('Rejects multi-disk, ZIP64, encryption, unsupported compression and ZIP truncation', async () => {
  const manifest = { name: 'AndroidManifest.xml', data: axml() };
  for (const bytes of [zip([manifest], { disk: 1 }), zip([{ ...manifest, disk: 1 }]), zip([manifest], { count: 0xffff }), zip([{ ...manifest, extra: new Uint8Array([1, 0, 0, 0]) }]), zip([{ ...manifest, flags: 1 }]), zip([{ ...manifest, method: 99 }]), zip([manifest]).slice(0, -3), zip([manifest], { centralOffset: 0xfffffffe })]) {
    await assert.rejects(inspectInstallArchive(file(bytes)), /ZIP|comprim|cifrad|truncad|disco/i);
  }
});

test('Rejects duplicate entries, unsafe paths, symlinks and inconsistent local headers', async () => {
  const manifest = { name: 'AndroidManifest.xml', data: axml() };
  for (const entry of [{ ...manifest }, { name: '../evil', data: encode('x') }, { name: '/absolute', data: encode('x') }, { name: 'a\\b', data: encode('x') }, { name: 'a//b', data: encode('x') }, { name: 'link', data: encode('x'), mode: 0xa1ff }]) {
    await assert.rejects(inspectInstallArchive(file(zip([manifest, entry]))), /duplicad|ruta|enlace|ZIP/i);
  }
  await assert.rejects(inspectInstallArchive(file(zip([{ ...manifest, localName: 'WrongManifest.xml' }]))), /ZIP|cabecera/i);
  await assert.rejects(inspectInstallArchive(file(zip([manifest, { name: 'other', data: encode('x'), offset: 0 }]))), /ZIP|cabecera|solap/i);
});

test('Validates CRC and actual decompressed size of the manifest', async () => {
  await assert.rejects(inspectInstallArchive(file(apk({}, { crc: 1 }))), /CRC|integridad/i);
  await assert.rejects(inspectInstallArchive(file(apk({}, { method: 8, size: 20 }))), /tamaño|descomprim/i);
  await assert.rejects(inspectInstallArchive(file(apk({}, { method: 8, compressedData: encode('invalid deflate') }))), /descomprim|ZIP/i);
});

test('Validates a single-package XAPK with base, splits and matching OBB paths', async () => {
  const entries = [
    { name: 'base.apk', data: apk(), method: 8 },
    { name: 'config.es.apk', data: apk({ split: 'config.es' }) },
    { name: 'Android/' }, { name: 'Android/obb/' }, { name: 'Android/obb/com.example.demo/' },
    { name: 'Android/obb/com.example.demo/main.7.com.example.demo.obb', data: encode('game data'), method: 8 },
    { name: 'icon.png', data: new Uint8Array([1, 2, 3]) },
  ];
  const result = await inspectInstallArchive(file(zip(entries), 'synthetic.xapk'));
  assert.deepEqual(result, { format: 'xapk', packageName: 'com.example.demo', versionCode: '7', splitNames: ['config.es'], extractedBytes: entries.reduce((total, entry) => total + (entry.data?.length ?? 0), 0), obbCount: 1, obbEntries: ['Android/obb/com.example.demo/main.7.com.example.demo.obb'] });
});

test('Accepts empty DEFLATE directories while rejecting directories with content or nonzero CRC', async () => {
  const base = { name: 'base.apk', data: apk() };
  const directories = ['Android/', 'Android/obb/', 'Android/obb/com.example.demo/'].map(name => ({ name, method: 8 }));
  const result = await inspectInstallArchive(file(zip([base, ...directories]), 'synthetic.xapk'));
  assert.equal(result.packageName, 'com.example.demo');
  assert.equal(result.extractedBytes, base.data.length);
  for (const invalid of [{ name: 'Android/', method: 8, data: encode('x') }, { name: 'Android/', method: 8, crc: 1 }]) {
    await assert.rejects(inspectInstallArchive(file(zip([base, invalid]), 'synthetic.xapk')), /directorio/i);
  }
});

test('XAPK identity comes from APKs and rejects mismatched versions, packages and duplicate splits', async () => {
  for (const other of [apk({ packageName: 'com.other.app', split: 'config.es' }), apk({ versionCode: 8, split: 'config.es' }), apk()]) {
    await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk() }, { name: 'other.apk', data: other }]), 'synthetic.xapk')), /paquete|versión|base/i);
  }
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk() }, { name: 'a.apk', data: apk({ split: 'same' }) }, { name: 'b.apk', data: apk({ split: 'same' }) }]), 'synthetic.xapk')), /split|duplicad/i);
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'a.apk', data: apk({ split: 'config.es' }) }]), 'synthetic.xapk')), /base/i);
});

test('Rejects standalone split APKs and base.apk masquerading as a split', async () => {
  await assert.rejects(inspectInstallArchive(file(apk({ split: 'config.es' }))), /split|base/i);
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk({ split: 'config.es' }) }, { name: 'actual.apk', data: apk() }]), 'synthetic.xapk')), /base/i);
});

test('Rejects XAPK layout outside the helper contract and OBBs for another package', async () => {
  for (const name of ['nested/app.apk', 'META-INF/file', 'Android/obb/com.other.app/a.obb', 'Android/obb/com.other.app/', 'Android/obb/com.example.demo/nested/a.obb', 'bad name.apk']) {
    await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk() }, { name, data: name.endsWith('/') ? undefined : encode('x') }]), 'synthetic.xapk')), /ruta|XAPK|OBB|paquete/i);
  }
});

test('V2 JSON may select a named base but cannot override real APK identity', async () => {
  const base = apk(), split = apk({ split: 'config.es' });
  const manifest = { xapk_version: 2, package_name: 'com.example.demo', version_code: '7', split_apks: [{ file: 'app.apk', id: 'base' }, { file: 'es.apk', id: 'config.es' }], split_configs: ['config.es'], total_size: base.length + split.length };
  const make = value => file(zip([{ name: 'app.apk', data: base }, { name: 'es.apk', data: split }, { name: 'manifest.json', data: encode(JSON.stringify(value)) }]), 'synthetic.xapk');
  assert.equal((await inspectInstallArchive(make(manifest))).versionCode, '7');
  for (const change of [{ version_code: '999' }, { package_name: 'com.other.app' }, { total_size: 0 }, { split_configs: [] }, { split_apks: [{ file: 'app.apk', id: 'base' }, { file: 'es.apk', id: 'wrong' }] }]) {
    await assert.rejects(inspectInstallArchive(make({ ...manifest, ...change })), /manifest|manifiesto|versión|paquete/i);
  }
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'manifest.json', data: encode(JSON.stringify(manifest)) }]), 'synthetic.xapk')), /APK|base/i);
});

test('Enforces metadata, archive, entry-count, expanded-size and compressed inner-APK limits before allocation', async () => {
  await assert.rejects(inspectInstallArchive(file(apk({}, { method: 8, size: 4 * 1024 * 1024 + 1 }))), /4 MiB|manifiesto/i);
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk() }, { name: 'manifest.json', data: encode('{}'), method: 8, size: 1024 * 1024 + 1 }]), 'synthetic.xapk')), /1 MiB|manifest/i);
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk(), method: 8, size: 256 * 1024 * 1024 + 1 }]), 'synthetic.xapk')), /256 MiB/i);
  await assert.rejects(inspectInstallArchive(file(zip([{ name: 'base.apk', data: apk() }, { name: 'icon.png', data: new Uint8Array(1), method: 8, size: 1024 ** 3 }]), 'synthetic.xapk')), /1 GiB|descomprim/i);
  await assert.rejects(inspectInstallArchive(file(zip([], { count: 4097 }))), /4096|entradas/i);
  const oversized = { name: 'synthetic.apk', size: 1024 ** 3 + 1, slice() { throw new Error('Must not read oversized input'); } };
  await assert.rejects(inspectInstallArchive(oversized), /1 GiB/i);
});

test('AbortSignal prevents work and cancels pending reads', async () => {
  const controller = new AbortController(); controller.abort(new DOMException('Cancelado', 'AbortError'));
  await assert.rejects(inspectInstallArchive(file(apk()), { signal: controller.signal }), { name: 'AbortError' });
  const active = new AbortController();
  const slow = { name: 'synthetic.apk', size: 100, slice() { active.abort(new DOMException('Cancelado', 'AbortError')); return new Blob([new Uint8Array(100)]); } };
  await assert.rejects(inspectInstallArchive(slow, { signal: active.signal }), { name: 'AbortError' });
});
