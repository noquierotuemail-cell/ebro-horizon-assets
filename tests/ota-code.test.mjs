import test from 'node:test';
import assert from 'node:assert/strict';

const moduleUrl = new URL('../adb/ota-generator.mjs', import.meta.url);
let calculator;
try { calculator = await import(moduleUrl); } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

test('OTA calculator is available independently of the RAND generator', () => {
  assert.equal(typeof calculator?.calculateOtaCode, 'function');
});

test('OTA codes follow independently calculated decimal fixtures', { skip: !calculator }, () => {
  for (const [vin, date, code] of [
    ['123456', '2026-10-25', '204800'],
    ['000000', '2026-10-25', '102400'],
    ['000001', '2026-10-25', '363425'],
    ['000015', '2026-10-25', '017775'],
    ['999999', '2099-12-31', '423105'],
    ['123456', '2024-02-29', '422848'],
    ['123456', '2026-10-26', '451712'],
  ]) assert.equal(calculator.calculateOtaCode(vin, date).code, code);
});

test('Full VIN input is normalized and retains its final six characters', { skip: !calculator }, () => {
  const result = calculator.calculateOtaCode(' abcdefgh2jk123456 ', '2026-10-25');
  assert.equal(result.code, '204800');
  assert.equal(result.suffix, '123456');
});

test('Digits before the final six VIN characters do not affect the code', { skip: !calculator }, () => {
  const result = calculator.calculateOtaCode('ABCDE123456FGH789', '2026-10-25');
  assert.equal(result.code, '051125');
  assert.equal(result.suffix, 'FGH789');
});

test('Six-character VIN suffixes accept letters and preserve the displayed fragment', { skip: !calculator }, () => {
  for (const [vin, suffix, code] of [
    [' fgh789 ', 'FGH789', '051125'],
    ['12E456', '12E456', '429800'],
    [' 12e456 ', '12E456', '429800'],
  ]) {
    const result = calculator.calculateOtaCode(vin, '2026-10-25');
    assert.equal(result.code, code);
    assert.equal(result.suffix, suffix);
  }
});

test('A final VIN fragment without digits uses zero even when earlier characters contain digits', { skip: !calculator }, () => {
  for (const vin of ['ABCDEF', 'ABCDE123456ABCDEF']) {
    const result = calculator.calculateOtaCode(vin, '2026-10-25');
    assert.equal(result.code, '102400');
    assert.equal(result.suffix, 'ABCDEF');
  }
});

test('Malformed or incomplete input never returns a plausible fallback code', { skip: !calculator }, () => {
  for (const vin of ['', '12345', '1234567', '12I456', '12O456', '12Q456', '12-456', '12 456', 'ABCDEFGH2JK12345I', '<script>123456']) {
    assert.throws(() => calculator.calculateOtaCode(vin, '2026-10-25'));
  }
  for (const date of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-25', '2026-10-00', '26-10-25', '2026-1-25', '2026-10-25T00:00:00Z']) {
    assert.throws(() => calculator.calculateOtaCode('123456', date));
  }
});

test('Today follows the local calendar rather than the UTC date', { skip: !calculator }, () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Madrid';
    assert.equal(calculator.localDateValue(new Date('2026-10-24T22:30:00Z')), '2026-10-25');
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(calculator.localDateValue(new Date('2026-10-25T01:30:00Z')), '2026-10-24');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
