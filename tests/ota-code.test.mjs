import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOtaServer, generateAdbCode, safeNextPath } from '../src/adb-security.js';

test('OTA codes preserve the existing fixtures after moving calculation server-side', () => {
  for (const [vin, date, code] of [
    ['123456', '2026-10-25', '204800'],
    ['000000', '2026-10-25', '102400'],
    ['000001', '2026-10-25', '363425'],
    ['000015', '2026-10-25', '017775'],
    ['999999', '2099-12-31', '423105'],
    ['123456', '2024-02-29', '422848'],
    ['123456', '2026-10-26', '451712'],
  ]) assert.equal(calculateOtaServer(vin, date).code, code);
});

test('Full VIN input is normalized and retains its final six characters', () => {
  const result = calculateOtaServer(' abcdefgh2jk123456 ', '2026-10-25');
  assert.equal(result.code, '204800');
  assert.equal(result.suffix, '123456');
});

test('Digits before the final six VIN characters do not affect the OTA result', () => {
  const result = calculateOtaServer('ABCDE123456FGH789', '2026-10-25');
  assert.equal(result.code, '051125');
  assert.equal(result.suffix, 'FGH789');
});

test('Malformed OTA input never returns a plausible fallback code', () => {
  for (const vin of ['', '12345', '1234567', '12I456', '12O456', '12Q456', '12-456', '12 456', '<script>123456']) {
    assert.throws(() => calculateOtaServer(vin, '2026-10-25'));
  }
  for (const date of ['', '2026-02-29', '2026-04-31', '2026-13-01', '26-10-25']) {
    assert.throws(() => calculateOtaServer('123456', date));
  }
});

test('VIN+RAND still returns a six-character hexadecimal code on the server', async () => {
  const code = await generateAdbCode('LVVDB24B7SD123456', '0042');
  assert.match(code, /^[0-9a-f]{6}$/);
});

test('post-login redirects cannot escape /adb', () => {
  assert.equal(safeNextPath('https://example.com/'), '/adb/');
  assert.equal(safeNextPath('/admin/analytics'), '/adb/');
  assert.equal(safeNextPath('/adb/ota'), '/adb/ota');
});
