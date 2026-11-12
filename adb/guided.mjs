// The guided path is deliberately linear; the original installer remains unchanged in Pro.
const $ = id => document.getElementById(id);
const root=$('view-installer'), chooser=$('installerModeChooser'), nav=$('guidedNavigation');
const cards=[...root.querySelectorAll('.installer-grid > .installer-step')];
const result=$('installerResult'), pending=$('installerPending');
const names=['Abre el menú OTA','Calcula la clave','Activa ADB','Conecta el coche','Instala EBRO Horizon','Comprueba el resultado'];
let mode='choice',step=0,otaReady=false;
const connected=()=> $('connectionState')?.classList.contains('connected');
function render(){
  root.dataset.installMode=mode;
  chooser.hidden=mode!=='choice';
  nav.hidden=mode!=='guided';
  cards.forEach((card,i)=>{card.hidden=mode==='choice'||(mode==='guided'&&i!==step);});
  if(mode==='guided'){
    $('guidedStepLabel').textContent='Paso '+(step+1)+' de 6 · '+names[step];
    $('guidedProgress').max=6;$('guidedProgress').value=step+1;
    $('guidedBack').disabled=step===0;
    $('guidedNext').hidden=step>=4;
    $('guidedNext').disabled=(step===1&&!otaReady)||(step===3&&!connected());
    result.hidden=step!==5||!result.dataset.guidedHasResult;
    pending.hidden=step!==5||!pending.dataset.guidedHasPending;
  }else if(mode==='pro'){
    if(result.dataset.guidedHasResult)result.hidden=false;
    if(pending.dataset.guidedHasPending)pending.hidden=false;
  }
}
function move(to){step=Math.max(0,Math.min(5,to));render();window.scrollTo({top:0,behavior:'instant'});}
function selectMode(m){mode=m;move(0);}
$('guidedModeButton').addEventListener('click',()=>selectMode('guided'));
$('proModeButton').addEventListener('click',()=>selectMode('pro'));
$('installerChangeMode').addEventListener('click',()=>selectMode('choice'));
$('guidedNext').addEventListener('click',()=>{if(step===1&&!otaReady)return;if(step===3&&!connected())return;move(step+1);});
$('guidedBack').addEventListener('click',()=>move(step-1));
new MutationObserver(render).observe($('connectionState'),{attributes:true,attributeFilter:['class']});
new MutationObserver(()=>{
  if(!result.hidden){result.dataset.guidedHasResult='1';if(mode==='guided')move(5);}
}).observe(result,{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=>{if(!pending.hidden)pending.dataset.guidedHasPending='1';}).observe(pending,{attributes:true,attributeFilter:['hidden']});
$('installerStart').addEventListener('click',()=>{
  if(mode==='guided'){result.dataset.guidedHasResult='';move(5);}
});
// Native, protected OTA calculator: no iframe, no secondary page, no local VIN storage.
const form=$('guidedOtaForm'),vin=$('guidedOtaVin'),date=$('guidedOtaDate');
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
date.value=today();
let revision=0;
function resetOta(){
  revision++;otaReady=false;$('guidedOtaOutput').hidden=true;$('guidedOtaCode').textContent='';
  $('guidedOtaMessage').textContent='';render();
}
vin.addEventListener('input',resetOta);
date.addEventListener('input',resetOta);
form.addEventListener('submit',async e=>{
  e.preventDefault();resetOta();
  const value=vin.value.trim().toUpperCase(),d=date.value,request=revision;
  if(!(/^[A-HJ-NPR-Z0-9]{6}$/.test(value)||/^[A-HJ-NPR-Z0-9]{17}$/.test(value))){
    $('guidedOtaMessage').textContent='Revisa el VIN: escribe los 17 caracteres o los últimos 6.';return;
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){$('guidedOtaMessage').textContent='Selecciona la fecha del coche.';return;}
  const button=$('guidedOtaSubmit');button.disabled=true;button.textContent='Calculando…';
  try{
    const response=await fetch('/adb/api/ota',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({vin:value,date:d})});
    if(response.status===401){$('guidedOtaMessage').textContent='Tu sesión ha caducado. Vuelve a acceder a HABRO ADB para calcular la clave.';return;}
    const data=await response.json();
    if(!response.ok||!/^\d{6}$/.test(String(data.code||'')))throw new Error(data.message||'No se pudo calcular la clave.');
    if(request!==revision)return;
    $('guidedOtaCode').textContent=data.code;
    $('guidedOtaOutput').hidden=false;otaReady=true;render();
  }catch(err){if(request===revision)$('guidedOtaMessage').textContent=err.message||'Error de conexión. Vuelve a intentarlo.';}
  finally{button.disabled=false;button.textContent='Calcular clave OTA';}
});
$('guidedOtaCopy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('guidedOtaCode').textContent);$('guidedOtaMessage').textContent='Clave copiada.';}
  catch{$('guidedOtaMessage').textContent='Selecciona los seis números para copiarlos.';}
});
window.addEventListener('pageshow',()=>{if(date.value===today())return;resetOta();});
render();
