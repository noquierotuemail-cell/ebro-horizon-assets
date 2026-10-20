// AES-CMAC: RFC 4493. Interoperability parameters observed in the public
// JCarTools v3 calculator. See docs/adb-code-generator.md for provenance.
const KEY_HEX = '31697060FAA6B4D5A5AD1C4D9A3BD07A';
const SUFFIX = '0123';

function xor(a, b) {
  return Uint8Array.from(a, (value, index) => value ^ b[index]);
}

function doubleBlock(block) {
  const out = new Uint8Array(16);
  let carry = 0;
  for (let i = 15; i >= 0; i--) {
    out[i] = (block[i] << 1) | carry;
    carry = block[i] >>> 7;
  }
  if (carry) out[15] ^= 0x87;
  return out;
}

export async function aesCmac(keyBytes, message, subtle = globalThis.crypto?.subtle) {
  if (!subtle) throw new Error('Abre esta página mediante HTTPS o desde localhost para calcular el código.');
  if (!(keyBytes instanceof Uint8Array) || keyBytes.length !== 16 || !(message instanceof Uint8Array)) {
    throw new TypeError('AES-CMAC requiere una clave de 16 bytes y un mensaje binario.');
  }
  const key = await subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']);
  // The first CBC block with a zero IV equals AES(key, block). Ignore the
  // extra PKCS#7 block WebCrypto adds for a 16-byte input.
  const encryptBlock = async block => new Uint8Array(await subtle.encrypt(
    { name: 'AES-CBC', iv: new Uint8Array(16) }, key, block
  )).slice(0, 16);
  const k1 = doubleBlock(await encryptBlock(new Uint8Array(16)));
  const k2 = doubleBlock(k1);
  const count = Math.max(1, Math.ceil(message.length / 16));
  let state = new Uint8Array(16);
  for (let i = 0; i < count - 1; i++) {
    state = await encryptBlock(xor(state, message.slice(i * 16, (i + 1) * 16)));
  }
  const last = new Uint8Array(16);
  const tail = message.slice((count - 1) * 16);
  last.set(tail);
  const complete = message.length > 0 && tail.length === 16;
  if (!complete) last[tail.length] = 0x80;
  return encryptBlock(xor(state, xor(last, complete ? k1 : k2)));
}

export function normalizeCodeInputs(vin, rand) {
  const normalized = { vin: String(vin ?? '').trim().toUpperCase(), rand: String(rand ?? '').trim() };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized.vin)) {
    throw new Error('Introduce el VIN completo: 17 caracteres, sin espacios ni las letras I, O o Q.');
  }
  if (!/^\d{1,4}$/.test(normalized.rand)) {
    throw new Error('Introduce el RAND de la pantalla: de 1 a 4 cifras, conservando los ceros iniciales.');
  }
  return normalized;
}

export async function generateCode(vin, rand) {
  const input = normalizeCodeInputs(vin, rand);
  const key = Uint8Array.from(KEY_HEX.match(/../g), byte => parseInt(byte, 16));
  const message = new TextEncoder().encode(input.vin + input.rand + SUFFIX);
  const tag = await aesCmac(key, message);
  return Array.from(tag, byte => byte.toString(16).padStart(2, '0')).join('').slice(-6);
}
