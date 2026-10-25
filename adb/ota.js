import { calculateOtaCode, localDateValue } from './ota-generator.mjs';

const $ = id => document.getElementById(id);
const form = $('otaForm');
const vin = $('otaVin');
const date = $('otaDate');
let useToday = true;
let revision = 0;

function setTheme(value) {
  document.documentElement.dataset.theme = value;
  $('otaTheme').textContent = value === 'dark' ? 'Tema claro' : 'Tema oscuro';
  document.querySelector('meta[name="theme-color"]').content = value === 'dark' ? '#090c11' : '#f5f5f7';
  try { localStorage.setItem('habro-adb-theme', value); } catch {}
}
let preferredTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
try { preferredTheme = localStorage.getItem('habro-adb-theme') || preferredTheme; } catch {}
setTheme(preferredTheme === 'dark' ? 'dark' : 'light');
$('otaTheme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

function message(text = '', error = false) {
  $('otaMessage').textContent = text;
  $('otaMessage').classList.toggle('error', error);
}

function invalidate() {
  revision++;
  $('otaResult').classList.remove('has-code');
  $('otaCode').value = '';
  $('otaCopy').disabled = true;
  $('otaCopyLabel').textContent = 'Copiar clave';
  $('otaCopyMessage').textContent = '';
  $('otaResultDate').textContent = 'Introduce los datos para ver tu clave.';
  $('otaResultVin').textContent = '';
  $('otaResultVin').hidden = true;
  vin.removeAttribute('aria-invalid');
  date.removeAttribute('aria-invalid');
  message();
}

function updateDateMode() {
  $('dateMode').textContent = useToday ? 'Fecha de hoy' : 'Fecha elegida manualmente';
  $('dateMode').classList.toggle('custom', !useToday);
}

function refreshToday() {
  const today = localDateValue();
  if (useToday && date.value !== today) {
    const hadCode = !!$('otaCode').value;
    date.value = today;
    invalidate();
    if (hadCode) message('Ha cambiado el día. Calcula la clave para la nueva fecha.');
  }
  updateDateMode();
}

vin.addEventListener('input', invalidate);
vin.addEventListener('blur', () => { vin.value = vin.value.trim().toUpperCase(); });
date.addEventListener('input', () => {
  useToday = date.value === localDateValue();
  invalidate();
  updateDateMode();
});
$('otaToday').addEventListener('click', () => {
  useToday = true;
  date.value = localDateValue();
  invalidate();
  updateDateMode();
});
$('otaClear').addEventListener('click', () => {
  form.reset();
  useToday = true;
  date.value = localDateValue();
  invalidate();
  updateDateMode();
  vin.focus();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  refreshToday();
  invalidate();
  let result;
  try { result = calculateOtaCode(vin.value, date.value); }
  catch (error) {
    const field = error.field === 'date' ? date : vin;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
    message(error.message, true);
    return;
  }
  vin.value = vin.value.trim().toUpperCase();
  const [year, month, day] = result.date.split('-').map(Number);
  const calendarDate = new Date(0);
  calendarDate.setFullYear(year, month - 1, day);
  calendarDate.setHours(12, 0, 0, 0);
  const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(calendarDate);
  $('otaCode').value = result.code;
  $('otaResultDate').textContent = `Para el ${dateLabel}`;
  $('otaResultVin').textContent = `VIN ··· ${result.suffix}`;
  $('otaResultVin').hidden = false;
  $('otaCopy').disabled = false;
  $('otaResult').classList.add('has-code');
  message(`Clave calculada para el ${dateLabel}.`);
  if (matchMedia('(max-width: 800px)').matches) {
    $('otaResult').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }
});

$('otaCopy').addEventListener('click', async () => {
  refreshToday();
  const code = $('otaCode').value;
  if (!code) return;
  const request = revision;
  try {
    await navigator.clipboard.writeText(code);
    if (request !== revision) return;
    $('otaCopyLabel').textContent = 'Copiada';
    $('otaCopyMessage').textContent = 'Clave copiada.';
  } catch {
    if (request !== revision) return;
    $('otaCode').focus();
    $('otaCode').select();
    $('otaCode').setSelectionRange(0, code.length);
    $('otaCopyMessage').textContent = 'Mantén pulsada la clave seleccionada y elige Copiar.';
  }
});

window.addEventListener('focus', refreshToday);
window.addEventListener('pageshow', refreshToday);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToday(); });
window.setInterval(refreshToday, 30000);
window.addEventListener('pagehide', () => {
  form.reset();
  useToday = true;
  invalidate();
});
date.value = localDateValue();
$('otaGenerate').disabled = false;
updateDateMode();
