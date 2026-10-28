// Called only after the existing HABRO ADB session validation. No static fallback.
// Bind DESAY_HELPERS to a private R2 bucket at deployment time, never a public URL.
export async function serveDesayHelper(request, env) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Vary': 'Cookie', 'Referrer-Policy': 'no-referrer' };
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET' } });
  if (!env.DESAY_HELPERS) return new Response('Installation helper unavailable', { status: 503, headers });
  try {
    const object = await env.DESAY_HELPERS.get('dex_shell_helper.dex');
    if (!object || !Number.isSafeInteger(object.size) || object.size <= 0 || object.size > 16 * 1024 * 1024) return new Response('Installation helper unavailable', { status: 503, headers });
    return new Response(object.body, { headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(object.size) } });
  } catch { return new Response('Installation helper unavailable', { status: 503, headers }); }
}
