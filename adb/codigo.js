const $ = id => document.getElementById(id);
const form = $('codeForm'), vin = $('vin'), rand = $('rand');
let revision = 0;

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
  $('generateCode').disabled = false;
  $('generateCode').textContent = 'Generar código';
  form.removeAttribute('aria-busy');
  vin.removeAttribute('aria-invalid');
  rand.removeAttribute('aria-invalid');
  message();
}
function normalizeInputs() {
  const input = { vin: vin.value.trim().toUpperCase(), rand: rand.value.trim() };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(input.vin)) {
    const error = new Error('Introduce el VIN completo: 17 caracteres, sin espacios ni las letras I, O o Q.'); error.field = 'vin'; throw error;
  }
  if (!/^\d{1,4}$/.test(input.rand)) {
    const error = new Error('Introduce el RAND de la pantalla: de 1 a 4 cifras, conservando los ceros iniciales.'); error.field = 'rand'; throw error;
  }
  return input;
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
  let input;
  try { input = normalizeInputs(); }
  catch (error) {
    const field = error.field === 'rand' ? rand : vin;
    field.setAttribute('aria-invalid', 'true'); field.focus(); message(error.message, true); return;
  }
  vin.value = input.vin; rand.value = input.rand;
  const request = revision;
  $('generateCode').disabled = true; $('generateCode').textContent = 'Calculando…'; form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/adb/api/code', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      cache:'no-store',
      body:JSON.stringify(input)
    });
    if (response.status === 401) { location.assign('/adb/access?next=%2Fadb%2Fcodigo'); return; }
    const result = await response.json();
    if (!response.ok || !result?.code) {
      const error = new Error(result?.message || 'No se ha podido calcular el código.');
      error.field = result?.field || null;
      throw error;
    }
    if (request !== revision) return;
    $('codeValue').value = result.code;
    $('codeResult').hidden = false;
    $('copyCode').disabled = false;
    message('Código calculado. Introdúcelo en la pantalla del coche.');
  } catch (error) {
    if (request !== revision) return;
    if (error?.field === 'vin') vin.setAttribute('aria-invalid', 'true');
    if (error?.field === 'rand') rand.setAttribute('aria-invalid', 'true');
    message(error?.message || 'No se ha podido calcular el código. Vuelve a intentarlo.', true);
  } finally {
    if (request === revision) {
      $('generateCode').disabled = false; $('generateCode').textContent = 'Generar código'; form.removeAttribute('aria-busy');
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
    $('codeValue').focus(); $('codeValue').select(); message('Copia el código seleccionado con el menú de tu dispositivo.');
  }
};
window.addEventListener('pagehide', () => { form.reset(); invalidate(); });
invalidate();
