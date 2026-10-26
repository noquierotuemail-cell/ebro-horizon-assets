const ADB_COOKIE = 'habro_adb_session';
const TOKEN_TTL_MS = 30 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const CODE_KEY_HEX = '31697060FAA6B4D5A5AD1C4D9A3BD07A';
const CODE_SUFFIX = '0123';
const OTA_OFFSET = 123456;

export function cleanAccessLabel(value, max = 80) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
}

export function randomToken(bytes = 32, cryptoImpl = globalThis.crypto) {
  const data = new Uint8Array(bytes);
  cryptoImpl.getRandomValues(data);
  return [...data].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value, subtle = globalThis.crypto?.subtle) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const hash = new Uint8Array(await subtle.digest('SHA-256', bytes));
  return [...hash].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function parseCookie(request, name = ADB_COOKIE) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function sessionCookie(value, maxAge = SESSION_TTL_MS / 1000) {
  return `${ADB_COOKIE}=${encodeURIComponent(value)}; Path=/adb; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${ADB_COOKIE}=; Path=/adb; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function safeNextPath(value) {
  const next = String(value || '/adb/');
  if (!next.startsWith('/adb/') || next.startsWith('/adb/access') || next.startsWith('/adb/logout')) return '/adb/';
  return next.slice(0, 300);
}

function escapeHtml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function pageHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  };
}

export function accessPage({ message = '', next = '/adb/' } = {}) {
  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0b0f15"><meta name="robots" content="noindex,nofollow,noarchive"><title>Acceso HABRO ADB</title><style>:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b10;color:#f7f9fb;padding:24px}.card{width:min(460px,100%);background:#111721;border:1px solid #263140;border-radius:28px;padding:32px;box-shadow:0 24px 80px #0008}.brand{font-size:13px;letter-spacing:.18em;color:#8ca2bc}.brand strong{color:white;font-size:18px;letter-spacing:.06em}.eyebrow{margin:28px 0 8px;color:#91a4ba;font-size:12px;letter-spacing:.14em}.card h1{margin:0 0 12px;font-size:32px;line-height:1.05}.card p{color:#aebccc;line-height:1.55}.field{display:grid;gap:8px;margin:26px 0 18px}.field label{font-size:13px;color:#d9e2ec}.field input{width:100%;font:inherit;background:#090d13;color:white;border:1px solid #334154;border-radius:14px;padding:15px 16px;outline:none}.field input:focus{border-color:#7ba7d8;box-shadow:0 0 0 3px #7ba7d822}.button{width:100%;border:0;border-radius:14px;padding:15px 18px;font:inherit;font-weight:700;background:#f4f7fa;color:#0b1017;cursor:pointer}.msg{min-height:24px;margin:14px 0 0;color:#ffadad}.note{font-size:12px;color:#7f8ea0;margin-top:24px}</style></head><body><main class="card"><div class="brand"><strong>HABRO</strong> · ADB</div><p class="eyebrow">ACCESO PRIVADO</p><h1>Introduce tu token.</h1><p>El token es de un solo uso. Al validarlo, este navegador recibirá una sesión temporal para utilizar HABRO ADB.</p><form method="post" action="/adb/access" autocomplete="off"><input type="hidden" name="next" value="${escapeHtml(safeNextPath(next))}"><div class="field"><label for="token">Token de acceso</label><input id="token" name="token" type="password" required autocomplete="one-time-code" spellcheck="false" autofocus></div><button class="button" type="submit">Entrar</button><div class="msg" role="status">${escapeHtml(message)}</div></form><div class="note">El token caduca aunque no se utilice y deja de ser válido en el primer acceso correcto.</div></main></body></html>`;
  return new Response(body, { status: message ? 401 : 200, headers: pageHeaders() });
}

export function adminAccessPage({ message = '', token = '', link = '' } = {}) {
  const result = token ? `<section class="result"><p><strong>Token de un solo uso</strong></p><code>${escapeHtml(token)}</code><p><strong>Enlace directo</strong></p><code>${escapeHtml(link)}</code><p>Caduca en 30 minutos. Tras utilizarlo, la sesión dura 24 horas.</p></section>` : '';
  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Accesos ADB · HABRO</title><style>:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#090d12;color:#f5f7fa;padding:28px}.wrap{max-width:760px;margin:0 auto}.card{background:#121923;border:1px solid #283545;border-radius:24px;padding:28px;margin:18px 0}h1{margin:.2em 0}.field{display:grid;gap:7px;margin:18px 0}.field input{font:inherit;padding:13px 14px;border-radius:12px;border:1px solid #35465a;background:#090d12;color:white}.button{font:inherit;font-weight:700;padding:13px 18px;border:0;border-radius:12px;cursor:pointer}.result{background:#0b1119;border-radius:18px;padding:20px;margin-top:20px}.result code{display:block;overflow-wrap:anywhere;background:#05080c;padding:14px;border-radius:10px}.msg{color:#ffb4b4}</style></head><body><main class="wrap"><p>HABRO · ADMIN</p><h1>Accesos temporales ADB</h1><section class="card"><p>Genera un token que solo podrá utilizarse una vez.</p><form method="post" action="/admin/adb-access" autocomplete="off"><div class="field"><label for="password">Contraseña de administración</label><input id="password" name="password" type="password" required autocomplete="current-password"></div><div class="field"><label for="label">Referencia opcional</label><input id="label" name="label" maxlength="80" placeholder="Ej. Usuario S900"></div><button class="button" type="submit">Crear token</button><p class="msg">${escapeHtml(message)}</p></form>${result}</section></main></body></html>`;
  return new Response(body, { status: message ? 401 : 200, headers: pageHeaders() });
}

function xor(a, b) { return Uint8Array.from(a, (value, index) => value ^ b[index]); }
function doubleBlock(block) { const out = new Uint8Array(16); let carry = 0; for (let i = 15; i >= 0; i--) { out[i] = (block[i] << 1) | carry; carry = block[i] >>> 7; } if (carry) out[15] ^= 0x87; return out; }
async function aesCmac(keyBytes, message, subtle = globalThis.crypto?.subtle) {
  const key = await subtle.importKey('raw', keyBytes, { name:'AES-CBC' }, false, ['encrypt']);
  const encryptBlock = async block => new Uint8Array(await subtle.encrypt({ name:'AES-CBC', iv:new Uint8Array(16) }, key, block)).slice(0,16);
  const k1 = doubleBlock(await encryptBlock(new Uint8Array(16))), k2 = doubleBlock(k1);
  const count = Math.max(1, Math.ceil(message.length / 16)); let state = new Uint8Array(16);
  for (let i = 0; i < count - 1; i++) state = await encryptBlock(xor(state, message.slice(i * 16, (i + 1) * 16)));
  const last = new Uint8Array(16), tail = message.slice((count - 1) * 16); last.set(tail);
  const complete = message.length > 0 && tail.length === 16; if (!complete) last[tail.length] = 0x80;
  return encryptBlock(xor(state, xor(last, complete ? k1 : k2)));
}

function inputError(message, field) { const error = new Error(message); error.field = field; return error; }

export async function generateAdbCode(vinValue, randValue) {
  const vin = String(vinValue ?? '').trim().toUpperCase();
  const rand = String(randValue ?? '').trim();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw inputError('Introduce el VIN completo: 17 caracteres, sin espacios ni las letras I, O o Q.', 'vin');
  if (!/^\d{1,4}$/.test(rand)) throw inputError('Introduce el RAND de la pantalla: de 1 a 4 cifras, conservando los ceros iniciales.', 'rand');
  const key = Uint8Array.from(CODE_KEY_HEX.match(/../g), byte => parseInt(byte, 16));
  const tag = await aesCmac(key, new TextEncoder().encode(vin + rand + CODE_SUFFIX));
  return [...tag].map(byte => byte.toString(16).padStart(2,'0')).join('').slice(-6);
}

export function calculateOtaServer(value, dateValue) {
  const vin = String(value ?? '').trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{6}$/.test(vin) && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw inputError('Introduce el VIN completo de 17 caracteres o sus últimos 6 caracteres.', 'vin');
  const suffix = vin.slice(-6), digits = Number(suffix.replace(/\D/g,'') || '0');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue ?? ''));
  if (!match) throw inputError('Selecciona una fecha válida.', 'date');
  const [, yearText, monthText, dayText] = match;
  const year=Number(yearText), month=Number(monthText), day=Number(dayText), date=new Date(0); date.setUTCFullYear(year,month-1,day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) throw inputError('Esa fecha no existe. Comprueba el día, el mes y el año.', 'date');
  const factor=Number(yearText.slice(-2)+monthText+dayText), product=(digits+OTA_OFFSET)*factor;
  return { code:String(product % 1000000).padStart(6,'0'), suffix, date:String(dateValue) };
}

export const ADB_ACCESS_DEFAULTS = Object.freeze({ tokenTtlMs:TOKEN_TTL_MS, sessionTtlMs:SESSION_TTL_MS });
