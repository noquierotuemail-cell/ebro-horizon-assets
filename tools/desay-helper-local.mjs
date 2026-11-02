// Node-only development adapter. Not imported by the browser or Worker.
import { readFile } from 'node:fs/promises';
import { DESAY_HELPER_POLICY, validateHelper } from '../adb/desay-helper.mjs';

export async function loadLocalDesayHelper({ path = new URL('../adb/.private/dex_shell_helper.dex', import.meta.url), signal } = {}) {
  signal?.throwIfAborted();
  const bytes = await readFile(path, { signal });
  return validateHelper(new Blob([bytes], { type: 'application/octet-stream' }), DESAY_HELPER_POLICY);
}
