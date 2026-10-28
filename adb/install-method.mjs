import { command } from './sessionwriter.mjs';

const propertyNames = ['ro.product.model', 'ro.product.manufacturer', 'ro.product.device', 'ro.build.display.id', 'ro.build.fingerprint', 'ro.build.version.release', 'ro.build.version.sdk'];

export async function readDeviceProfile(transport, options = {}) {
  const values = await Promise.all([...propertyNames.map(name => 'getprop ' + name), 'am get-current-user', 'id'].map(script => command(transport, script, options)));
  const properties = Object.fromEntries(propertyNames.map((name, index) => [name, values[index].stdout.trim()]));
  // Empty routing properties are ambiguous; do not silently choose a different installer.
  if (!isDesay({ properties }) && ['ro.product.model', 'ro.product.manufacturer', 'ro.build.display.id', 'ro.build.fingerprint'].some(name => !properties[name])) throw new Error('No se ha podido identificar el sistema. Reconecta y vuelve a comprobarlo.');
  const userText = values[7].stdout.trim(), identity = values[8].stdout.trim();
  if (!/^\d+$/.test(userText) || !Number.isSafeInteger(Number(userText)) || !identity) throw new Error('No se ha podido comprobar el usuario y la identidad Android.');
  return { properties, user: Number(userText), identity };
}

export function isDesay(profile) {
  const p = profile?.properties;
  return !!p && (['ro.product.model', 'ro.product.manufacturer', 'ro.build.fingerprint'].some(name => /DesaySV/i.test(p[name] || '')) || /^G7PH_CHERY/i.test(p['ro.build.display.id'] || ''));
}

export function selectInstallMethod(format, profile, method = 'auto') {
  if (!['apk', 'xapk'].includes(format)) throw new Error('Formato de instalación no válido.');
  if (!['auto', 'standard', 'sessionwriter', 'desay'].includes(method)) throw new Error('Método de instalación no válido.');
  if (format === 'xapk') return 'sessionwriter';
  if (method !== 'auto') return method;
  if (!profile?.properties) throw new Error('Espera a que se identifique el sistema antes de instalar.');
  return isDesay(profile) ? 'desay' : 'standard';
}
