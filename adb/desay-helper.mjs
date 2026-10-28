import { collectBinary, quote } from './core.mjs';

// Verified user-supplied DEX 038. Pin independently of the delivery endpoint;
// the binary remains a private dependency, never a bundled/static asset.
export const DESAY_HELPER_POLICY = Object.freeze({
  sha256: '2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15',
  size: 8568,
  async prepare({ run, temporary, apkPath, dexPath }) {
    await run(`test -d /system && test -d /data && test -x /system/bin/app_process && test -r ${quote(apkPath)} && test -r ${quote(dexPath)}`);
    // app_process/ART gets its own writable data/cache, scoped to this attempt.
    // Keep the vehicle's inherited boot classpath and native library settings.
    const runtime = temporary + '/runtime';
    await run(`mkdir -m 700 ${quote(runtime)} ${quote(runtime + '/dalvik-cache')}`);
    return { ANDROID_ROOT: '/system', ANDROID_DATA: runtime };
  },
});

export function requireHelperPolicy(policy) {
  if (!policy || !/^[a-f0-9]{64}$/.test(policy.sha256 || '') || !Number.isSafeInteger(policy.size) || policy.size <= 0 || policy.size > 16 * 1024 * 1024 || typeof policy.prepare !== 'function') {
    throw new Error('El auxiliar de instalación todavía no está disponible. Falta configurar el binario de confianza y su preparación validada.');
  }
}

export async function sha256(blob) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
}

export async function validateHelper(blob, policy) {
  requireHelperPolicy(policy);
  if (!(blob instanceof Blob) || blob.size !== policy.size || await sha256(blob) !== policy.sha256) throw new Error('La comprobación de integridad del auxiliar de instalación ha fallado.');
  return blob;
}

export async function loadDesayHelper({ signal, fetchImpl = fetch, policy = DESAY_HELPER_POLICY } = {}) {
  requireHelperPolicy(policy);
  const response = await fetchImpl('/adb/api/desay-helper', { signal, credentials: 'same-origin', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
  if (!response.ok || !response.body) throw new Error('No se ha podido obtener el auxiliar desde la sesión protegida.');
  const bytes = await collectBinary(response.body, { signal, limit: policy.size });
  return validateHelper(new Blob([bytes], { type: 'application/octet-stream' }), policy);
}
