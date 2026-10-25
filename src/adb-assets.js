// Public HABRO ADB assets; keep the tool outside marketing HTML rewrites.
const paths = new Set([
  "/adb/HABRO-ADB-recursos.zip",
  "/adb/app.js",
  "/adb/assets/habro-logo.svg",
  "/adb/ayuda.css",
  "/adb/ayuda.html",
  "/adb/code-generator.mjs",
  "/adb/codigo.css",
  "/adb/codigo.html",
  "/adb/codigo.js",
  "/adb/core.mjs",
  "/adb/habro.css",
  "/adb/index.html",
  "/adb/installer.css",
  "/adb/install-archive.mjs",
  "/adb/sessionwriter.mjs",
  "/adb/ota.html",
  "/adb/ota.js",
  "/adb/ota.css",
  "/adb/ota-generator.mjs",
  "/adb/vendor/THIRD_PARTY_NOTICES.txt",
  "/adb/vendor/adb.js",
  "/adb/vendor/adb.js.LEGAL.txt",
  "/adb/vendor/scrcpy-LICENSE.txt",
  "/adb/vendor/scrcpy-server-v3.3.3",
  "/adb/vendor/sop6-sessionwriter.dex",
  "/adb/vendor/SESSIONWRITER-NOTICE.txt",
  "/adb/",
  "/adb/codigo",
  "/adb/ota",
  "/adb/ayuda",
  "/adb/index"
]);
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

export async function serveAdb(request, env) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' || url.pathname === '/adb') {
    url.protocol = 'https:';
    if (url.pathname === '/adb') url.pathname = '/adb/';
    return Response.redirect(url.toString(), 308);
  }
  if (!paths.has(url.pathname)) return new Response('Not found', { status: 404 });
  const original = await env.ASSETS.fetch(request);
  const headers = new Headers(original.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'usb=(self), camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', csp);
  if (original.ok && /\.(?:mjs|js)$/.test(url.pathname)) headers.set('Content-Type', 'application/javascript; charset=utf-8');
  headers.set('Cache-Control', url.pathname.includes('/vendor/') ? 'public, max-age=3600' : 'no-cache');
  return new Response(original.body, { status: original.status, statusText: original.statusText, headers });
}
