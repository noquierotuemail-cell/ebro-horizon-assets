const key = 'habro-adb-pending-install';

function record(attempt) {
  const m = attempt?.metadata;
  if (attempt?.method !== 'desay' || attempt.user !== 0 || typeof attempt.serial !== 'string' || !attempt.serial || !/^\/data\/local\/tmp\/habro-desay-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attempt.temporary || '') || m?.format !== 'apk' || !/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*$/.test(m.packageName || '') || !/^\d+$/.test(m.versionCode || '') || m.splitNames?.length !== 0) throw new Error('El seguimiento de instalación no tiene una identidad válida.');
  return { method: 'desay', user: 0, serial: attempt.serial, temporary: attempt.temporary, metadata: { format: 'apk', packageName: m.packageName, versionCode: String(m.versionCode), splitNames: [] } };
}

export function loadPendingInstall(storage) {
  try { const stored = storage.getItem(key); return stored ? record(JSON.parse(stored)) : null; }
  catch { return null; }
}

export function savePendingInstall(attempt, storage) {
  const value = JSON.stringify(record(attempt));
  try {
    storage.setItem(key, value);
    if (storage.getItem && storage.getItem(key) !== value) throw new Error('Storage unavailable');
  } catch { throw new Error('No se puede guardar el seguimiento de la instalación. Habilita el almacenamiento del navegador antes de continuar.'); }
}

export function clearPendingInstall(storage) { storage.removeItem(key); }
