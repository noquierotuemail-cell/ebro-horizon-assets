const ADB_COOKIE = 'habro_adb_session';
const TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_12H_TTL_MS = 12 * 60 * 60 * 1000;
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
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
  };
}

export function accessPage({ message = '', next = '/adb/' } = {}) {
  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f5f5f7"><meta name="robots" content="noindex,nofollow,noarchive"><title>Acceso HABRO ADB</title><style>
:root{--bg:#f5f5f7;--surface:#fff;--ink:#0b0c0e;--muted:#6e6e73;--line:#d9d9de;--accent:#234f70;--accent-soft:#e9eef2;--shadow:0 24px 80px rgba(0,0,0,.08);--radius-xl:44px;--radius-lg:32px;--radius-md:22px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color-scheme:light}
*{box-sizing:border-box}
html,body{min-height:100%}
body{margin:0;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%}
button,input{font:inherit}
.topbar{background:rgba(245,245,247,.9);backdrop-filter:saturate(180%) blur(24px);border-bottom:1px solid rgba(0,0,0,.06)}
.nav{width:min(calc(100% - 40px),1280px);height:74px;margin-inline:auto;display:flex;align-items:center}
.brand{display:flex;align-items:center;gap:11px}
.brand-app{width:40px;height:40px;border-radius:12px}
.brand-copy{display:grid;gap:1px}
.brand-copy strong{font-size:16px;letter-spacing:-.02em}
.brand-copy small{font-size:11px;color:var(--muted)}
.login-wrap{width:min(calc(100% - 40px),1080px);margin:clamp(42px,8vh,86px) auto;padding-bottom:54px}
.login-card{display:grid;grid-template-columns:minmax(0,.92fr) minmax(420px,1.08fr);min-height:590px;background:var(--surface);border:1px solid rgba(0,0,0,.06);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow)}
.brand-panel{position:relative;overflow:hidden;background:#050607;color:#fff;padding:54px;display:flex;flex-direction:column;justify-content:space-between}
.brand-panel:before,.brand-panel:after{content:"";position:absolute;border-radius:999px;filter:blur(4px);opacity:.5;pointer-events:none}
.brand-panel:before{width:420px;height:420px;right:-250px;top:-190px;background:radial-gradient(circle,#234f70 0%,rgba(35,79,112,0) 68%)}
.brand-panel:after{width:360px;height:360px;left:-220px;bottom:-170px;background:radial-gradient(circle,#647b8c 0%,rgba(100,123,140,0) 70%)}
.brand-content,.brand-footer{position:relative;z-index:1}
.official-logo{width:min(310px,88%);height:auto;margin-bottom:72px}
.panel-eyebrow{margin:0 0 13px;font-size:12px;font-weight:750;letter-spacing:.13em;text-transform:uppercase;color:#9bb9d0}
.brand-panel h1{max-width:420px;margin:0;font-size:clamp(38px,4.2vw,59px);line-height:.98;letter-spacing:-.05em}
.brand-panel .lead{max-width:430px;margin:20px 0 0;color:#aeb4bc;font-size:17px;line-height:1.55;letter-spacing:-.01em}
.brand-footer{display:flex;align-items:center;gap:9px;color:#9299a2;font-size:12px}
.brand-footer .dot{width:7px;height:7px;border-radius:50%;background:#7fba9d;box-shadow:0 0 0 5px rgba(127,186,157,.1)}
.form-panel{padding:clamp(44px,6vw,76px);display:flex;align-items:center}
.form-inner{width:100%;max-width:460px;margin-inline:auto}
.form-eyebrow{margin:0 0 12px;color:var(--accent);font-size:12px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}
.form-panel h2{margin:0;font-size:clamp(38px,4.7vw,56px);line-height:.98;letter-spacing:-.055em}
.form-copy{margin:20px 0 32px;color:var(--muted);font-size:16px;line-height:1.58}
.field{display:grid;gap:9px;margin-bottom:16px}
.field label{font-size:13px;font-weight:650;color:#3f4145}
.field input{width:100%;height:56px;border:1px solid #d5d7db;border-radius:16px;background:#fff;color:var(--ink);padding:0 17px;outline:none;font-size:16px;letter-spacing:.015em;box-shadow:inset 0 1px 0 rgba(0,0,0,.02)}
.field input:focus{border-color:#7f9eb5;box-shadow:0 0 0 4px rgba(35,79,112,.10)}
.button{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:54px;border:0;border-radius:999px;background:#111;color:#fff;font-weight:700;letter-spacing:-.015em;cursor:pointer;transition:transform .18s ease,background .18s ease}
.button:hover{background:#242424}
.button:active{transform:scale(.985)}
.msg{min-height:22px;margin:14px 0 0;color:#b3261e;font-size:13px;line-height:1.45}
.note{display:flex;gap:10px;margin-top:27px;padding-top:23px;border-top:1px solid #ececef;color:var(--muted);font-size:12px;line-height:1.55}
.note-icon{flex:0 0 auto;width:24px;height:24px;border-radius:9px;background:var(--accent-soft);display:grid;place-items:center;color:var(--accent);font-weight:800;font-size:11px}
@media(max-width:840px){.login-card{grid-template-columns:1fr}.brand-panel{min-height:300px;padding:38px}.official-logo{width:240px;margin-bottom:42px}.brand-panel h1{font-size:42px}.brand-footer{margin-top:36px}.form-panel{padding:42px 34px 48px}.login-wrap{margin-top:28px}}
@media(max-width:560px){.nav{width:min(calc(100% - 28px),1280px);height:68px}.brand-app{width:36px;height:36px}.brand-copy strong{font-size:15px}.login-wrap{width:min(calc(100% - 24px),1080px);margin:18px auto 32px}.login-card{border-radius:30px}.brand-panel{min-height:250px;padding:30px 26px}.official-logo{width:210px;margin-bottom:34px}.brand-panel h1{font-size:35px}.brand-panel .lead{font-size:15px}.brand-footer{display:none}.form-panel{padding:36px 26px 40px}.form-panel h2{font-size:38px}.form-copy{font-size:15px;margin-bottom:27px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body>
<header class="topbar"><div class="nav"><a class="brand" href="/" aria-label="HABRO RemoteApp"><img class="brand-app" src="/assets/app-icon.webp" width="40" height="40" alt=""><span class="brand-copy"><strong>HABRO RemoteApp</strong></span></a></div></header>
<main class="login-wrap"><section class="login-card">
<div class="brand-panel"><div class="brand-content"><img class="official-logo" src="/assets/habro-remoteapp-horizontal-v8641.svg?v=20260903-2" alt="HABRO RemoteApp"><p class="panel-eyebrow">HERRAMIENTAS ADB</p><h1>Acceso privado a HABRO ADB.</h1><p class="lead">Conecta, instala y gestiona el sistema Android del coche desde una sesión autorizada.</p></div><div class="brand-footer"><span class="dot"></span><span>Conexión protegida · HABRO RemoteApp</span></div></div>
<div class="form-panel"><div class="form-inner"><p class="form-eyebrow">ACCESO PRIVADO</p><h2>Introduce tu token.</h2><p class="form-copy">Utiliza el token temporal que has recibido. Después del primer acceso dejará de ser válido y este navegador mantendrá una sesión protegida.</p><form method="post" action="/adb/access" autocomplete="off"><input type="hidden" name="next" value="${escapeHtml(safeNextPath(next))}"><div class="field"><label for="token">Token de acceso</label><input id="token" name="token" type="password" required autocomplete="one-time-code" spellcheck="false" autofocus placeholder="Introduce tu token"></div><button class="button" type="submit">Entrar en HABRO ADB</button><div class="msg" role="status">${escapeHtml(message)}</div></form><div class="note"><span class="note-icon">✓</span><span>El token caduca aunque no se utilice y queda invalidado inmediatamente después del primer acceso correcto.</span></div></div></div>
</section></main></body></html>`;
  return new Response(body, { status: message ? 401 : 200, headers: pageHeaders() });
}

function formatAdminDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(Number(value)));
  } catch (_) { return '—'; }
}

export function adminAccessPage({ message = '', token = '', persistent = false, twelveHours = false, registry = [] } = {}) {
  const tokenType = persistent ? 'Token persistente' : twelveHours ? 'Token de un solo uso · 12 horas' : 'Token de un solo uso · 30 minutos';
  const tokenInfo = persistent
    ? 'Puede reutilizarse y no caduca automáticamente. Entrégalo solo a una persona o dispositivo de confianza. Cada sesión creada dura 24 horas.'
    : twelveHours
      ? 'Es de un solo uso y puede canjearse durante las próximas 12 horas. Tras utilizarlo, la sesión creada dura 24 horas.'
      : 'Es de un solo uso y puede canjearse durante 30 minutos. Tras utilizarlo, la sesión creada dura 24 horas.';
  const result = token ? `<section class="result"><p><strong>${tokenType}</strong></p><code>${escapeHtml(token)}</code><p>${tokenInfo}</p></section>` : '';
  const rows = registry.map(item => {
    const type = item.persistent ? 'Persistente' : item.twelveHours ? '12 horas' : '30 minutos';
    const expiry = item.persistent ? 'Sin caducidad' : formatAdminDate(item.expiresAt);
    const state = item.persistent
      ? (item.redemptionCount ? `Activo · ${item.redemptionCount} acceso${item.redemptionCount === 1 ? '' : 's'}<small>Último: ${formatAdminDate(item.lastUsedAt)}</small>` : 'Activo · sin uso')
      : item.usedAt
        ? `Usado<small>${formatAdminDate(item.usedAt)}</small>`
        : item.expired
          ? 'Caducado'
          : 'Activo · sin uso';
    return `<tr><td><strong>${escapeHtml(item.label || 'Sin identificar')}</strong><small>ID ${escapeHtml(item.id || '—')}</small></td><td><span class="pill">${type}</span></td><td>${formatAdminDate(item.createdAt)}</td><td>${expiry}</td><td>${state}</td></tr>`;
  }).join('');
  const registryHtml = registry.length
    ? `<section class="card registry"><div class="registry-head"><div><p class="kicker">REGISTRO</p><h2>Tokens entregados</h2></div><span>${registry.length} registro${registry.length === 1 ? '' : 's'}</span></div><div class="table-wrap"><table><thead><tr><th>Entregado a</th><th>Tipo</th><th>Creado</th><th>Caduca</th><th>Estado / uso</th></tr></thead><tbody>${rows}</tbody></table></div><p class="privacy-note">Por seguridad HABRO no guarda el token en claro. El ID mostrado identifica el registro sin permitir recuperar la clave.</p></section>`
    : '';

  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Accesos ADB · HABRO</title><style>:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#090d12;color:#f5f7fa;padding:28px}.wrap{max-width:1040px;margin:0 auto}.card{background:#121923;border:1px solid #283545;border-radius:24px;padding:28px;margin:18px 0}h1{margin:.2em 0}.kicker{margin:0 0 5px;color:#8fa0b2;font-size:11px;letter-spacing:.14em}.field{display:grid;gap:7px;margin:18px 0}.field input{font:inherit;padding:13px 14px;border-radius:12px;border:1px solid #35465a;background:#090d12;color:white}.check{display:flex;align-items:flex-start;gap:10px;margin:15px 0;color:#e8eef5;font-size:14px;line-height:1.45}.check input{width:18px;height:18px;margin:1px 0 0;accent-color:#f5f7fa}.check-copy{display:grid;gap:3px}.check-copy small,.privacy-note,.registry td small{color:#8fa0b2;font-size:12px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.button{font:inherit;font-weight:700;padding:13px 18px;border:0;border-radius:12px;cursor:pointer}.button.primary{background:#f5f7fa;color:#0b1017}.button.secondary{background:#202b38;color:#f5f7fa;border:1px solid #35465a}.result{background:#0b1119;border-radius:18px;padding:20px;margin-top:20px}.result code{display:block;overflow-wrap:anywhere;background:#05080c;padding:14px;border-radius:10px}.msg{color:#ffb4b4}.registry-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}.registry-head h2{margin:0}.registry-head>span{color:#8fa0b2;font-size:13px}.table-wrap{overflow:auto;border:1px solid #283545;border-radius:16px}table{width:100%;border-collapse:collapse;min-width:820px}th,td{text-align:left;padding:14px 15px;border-bottom:1px solid #25303d;vertical-align:top;font-size:13px}th{color:#8fa0b2;font-size:11px;text-transform:uppercase;letter-spacing:.08em;background:#0d131b}tbody tr:last-child td{border-bottom:0}.registry td strong,.registry td small{display:block}.registry td small{margin-top:4px}.pill{display:inline-block;padding:5px 8px;border-radius:999px;background:#202b38;color:#dce6ef;font-size:11px}.privacy-note{margin:16px 2px 0;line-height:1.5}@media(max-width:640px){body{padding:16px}.card{padding:20px}.actions .button{width:100%}}</style></head><body><main class="wrap"><p>HABRO · ADMIN</p><h1>Accesos ADB</h1><section class="card"><p>Genera un acceso e identifica siempre a quién se lo entregas.</p><form method="post" action="/admin/adb-access" autocomplete="off"><div class="field"><label for="password">Contraseña de administración</label><input id="password" name="password" type="password" required autocomplete="current-password"></div><div class="field"><label for="label">Entregado a</label><input id="label" name="label" maxlength="80" required placeholder="Nombre, alias o dispositivo"></div><label class="check"><input id="twelveHours" name="twelveHours" type="checkbox" value="1"><span class="check-copy"><strong>Token válido 12 horas</strong><small>Un solo uso. Amplía de 30 minutos a 12 horas el plazo para canjearlo.</small></span></label><label class="check"><input id="persistent" name="persistent" type="checkbox" value="1"><span class="check-copy"><strong>Permitir token persistente</strong><small>Reutilizable y sin caducidad automática. No puede combinarse con el token de 12 horas.</small></span></label><div class="actions"><button class="button primary" type="submit" name="action" value="generate">Crear token</button><button class="button secondary" type="submit" name="action" value="list" formnovalidate>Ver registro</button></div><p class="msg">${escapeHtml(message)}</p></form>${result}</section>${registryHtml}</main></body></html>`;
  return new Response(body, { status: message ? 400 : 200, headers: pageHeaders() });
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

export const ADB_ACCESS_DEFAULTS = Object.freeze({ tokenTtlMs:TOKEN_TTL_MS, sessionTtlMs:SESSION_TTL_MS, twelveHourTokenTtlMs:TOKEN_12H_TTL_MS });
