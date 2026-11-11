// Presentational wizard: reuses the existing WebADB connection and installer.
const root = document.getElementById('view-installer');
const chooser = document.getElementById('installerModeChooser');
const guided = document.getElementById('guidedNavigation');
const cards = [...root.querySelectorAll('.installer-grid > .installer-step')];
const result = document.getElementById('installerResult');
const pending = document.getElementById('installerPending');
const label = document.getElementById('guidedStepLabel');
const next = document.getElementById('guidedNext');
const back = document.getElementById('guidedBack');
const progress = document.getElementById('guidedProgress');
const install = document.getElementById('installerStart');
const stepNames = ['Activar ADB en el coche','Conectar por USB','Elegir e instalar la aplicación','Comprobar el resultado'];
let mode = 'choice';
let step = 0;
const hasConnection = () => document.getElementById('connectionState')?.classList.contains('connected');
const hasFile = () => !!document.getElementById('installerFile')?.files?.length;
function render() {
  root.dataset.installMode = mode;
  chooser.hidden = mode !== 'choice';
  guided.hidden = mode !== 'guided';
  cards.forEach((card,i) => { card.hidden = mode === 'choice' || (mode === 'guided' && i !== step); });
  if (mode === 'guided') {
    label.textContent = 'Paso ' + (step+1) + ' de 4 · ' + stepNames[step];
    progress.value = step + 1;
    back.disabled = step === 0;
    next.hidden = step === 3;
    next.textContent = step === 2 ? 'Ver resultado' : 'Siguiente paso';
    next.disabled = step === 1 && !hasConnection();
    if (step === 2) next.disabled = !hasFile() || !hasConnection();
    result.hidden = step !== 3 || !result.dataset.guidedHasResult;
    pending.hidden = step !== 3 || !pending.dataset.guidedHasPending;
  }
  if (mode === 'pro') {
    if (result.dataset.guidedHasResult) result.hidden = false;
    if (pending.dataset.guidedHasPending) pending.hidden = false;
  }
}
function selectMode(value) {
  mode = value;
  step = 0;
  render();
}
document.getElementById('guidedModeButton').addEventListener('click',()=>selectMode('guided'));
document.getElementById('proModeButton').addEventListener('click',()=>selectMode('pro'));
document.getElementById('installerChangeMode').addEventListener('click',()=>selectMode('choice'));
next.addEventListener('click',()=>{
  if (step === 1 && !hasConnection()) return;
  if (step === 2 && (!hasFile() || !hasConnection())) return;
  step = Math.min(3,step+1); render();
});
back.addEventListener('click',()=>{step=Math.max(0,step-1);render();});
document.getElementById('installerFile').addEventListener('change',()=>queueMicrotask(render));
document.getElementById('installerConnect').addEventListener('click',()=>setTimeout(render,200));
document.getElementById('connectButton').addEventListener('click',()=>setTimeout(render,200));
new MutationObserver(()=> {
  if (mode !== 'guided') return;
  if (result && !result.hidden && step !== 3) {
    result.dataset.guidedHasResult = '1'; step = 3; render();
  }
}).observe(result,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=> {
  if (!pending.hidden) pending.dataset.guidedHasPending='1';
}).observe(pending,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(render).observe(document.getElementById('connectionState'),{attributes:true,attributeFilter:['class']});
const originalInstall = install.onclick;
install.addEventListener('click',()=>{
  if (mode === 'guided') {
    result.dataset.guidedHasResult = '';
    step = 3;
    // Existing installer confirmation and progress remain fully managed by app.js.
    render();
  }
});
render();
