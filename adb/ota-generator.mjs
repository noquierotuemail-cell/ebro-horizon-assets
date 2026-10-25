export function localDateValue(now = new Date()) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function inputError(message, field) {
  const error = new Error(message);
  error.field = field;
  return error;
}

export function calculateOtaCode(value, dateValue) {
  const vin = String(value ?? '').trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{6}$/.test(vin) && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    throw inputError('Introduce el VIN completo de 17 caracteres o sus últimos 6 caracteres.', 'vin');
  }
  const suffix = vin.slice(-6);
  const digits = Number(suffix.replace(/\D/g, '') || '0');

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue ?? ''));
  if (!match) throw inputError('Selecciona una fecha válida.', 'date');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw inputError('Esa fecha no existe. Comprueba el día, el mes y el año.', 'date');
  }
  const factor = Number(yearText.slice(-2) + monthText + dayText);
  const product = (digits + 123456) * factor;
  return { code: String(product % 1000000).padStart(6, '0'), suffix, date: dateValue };
}
