import { generateCode, normalizeCodeInputs } from './code-generator.mjs';

const $ = id => document.getElementById(id);
const form = $('codeForm'), vin = $('vin'), rand = $('rand');
let revision = 0;
const supported = !!globalThis.crypto?.subtle;

function theme(value) {
  document.documentElement.dataset.theme = value;
  $('codeTheme').textContent = value === 'dark' ? 'Tema claro' : 'Tema oscuro';
  document.querySelector('meta[name="theme-color"]').content = value === 'dark' ? '#090c11' : '#f5f5f7';
  try { localStorage.setItem('habro-adb-theme', value); } catch {}
}
let preferred = 'light';
try { preferred = localStorage.getItem('habro-adb-theme') || 'light'; } catch {}
theme(preferred === 'dark' ? 'dark' : 'light');
$('codeTheme').onclick = () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

function message(value = '', error = false) {
  $('codeMessage').textContent = value;
  $('codeMessage').classList.toggle('error', error);
}
function invalidate() {
  revision++;
  $('codeResult').hidden = true;
  $('codeValue').value = '';
  $('copyCode').disabled = true;
  $('generateCode').disabled = !supported;
  $('generateCode').textContent = 'Generar código';
  form.removeAttribute('aria-busy');
  vin.removeAttribute('aria-invalid');
  rand.removeAttribute('aria-invalid');
  message(supported ? '' : 'Abre esta página mediante HTTPS o desde localhost para calcular el código.', !supported);
}
vin.addEventListener('input', invalidate);
rand.addEventListener('input', invalidate);
vin.addEventListener('blur', () => {
  const normalized = vin.value.trim().toUpperCase();
  if (normalized !== vin.value) { vin.value = normalized; invalidate(); }
});
$('clearCode').onclick = () => { form.reset(); invalidate(); vin.focus(); };

form.addEventListener('submit', async event => {
  event.preventDefault();
  invalidate();
  if (!supported) return;
  let input;
  try { input = normalizeCodeInputs(vin.value, rand.value); }
  catch (error) {
    const field = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.value.trim().toUpperCase()) ? rand : vin;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
    message(error.message, true);
    return;
  }
  vin.value = input.vin;
  rand.value = input.rand;
  const request = revision;
  $('generateCode').disabled = true;
  $('generateCode').textContent = 'Calculando…';
  form.setAttribute('aria-busy', 'true');
  try {
    const code = await generateCode(input.vin, input.rand);
    if (request !== revision) return;
    $('codeValue').value = code;
    $('codeResult').hidden = false;
    $('copyCode').disabled = false;
    message('Código calculado. Introdúcelo en la pantalla del coche.');
  } catch {
    if (request === revision) message('No se ha podido calcular el código. Comprueba que abres la página mediante HTTPS o desde localhost y vuelve a intentarlo.', true);
  } finally {
    if (request === revision) {
      $('generateCode').disabled = false;
      $('generateCode').textContent = 'Generar código';
      form.removeAttribute('aria-busy');
    }
  }
});
$('copyCode').onclick = async () => {
  const request = revision, code = $('codeValue').value;
  if (!code || $('codeResult').hidden) return;
  try {
    await navigator.clipboard.writeText(code);
    if (request === revision) message('Código copiado.');
  } catch {
    if (request !== revision) return;
    $('codeValue').focus();
    $('codeValue').select();
    message('Copia el código seleccionado con el menú de tu dispositivo.');
  }
};
window.addEventListener('pagehide', () => { form.reset(); invalidate(); });
invalidate();
