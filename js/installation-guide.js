(()=>{
  'use strict';
  const printButton=document.getElementById('printGuide');
  const fallback=document.getElementById('printFallback');
  if(!printButton||!fallback)return;

  let printObserved=false;
  const notePrint=()=>{printObserved=true;fallback.hidden=true};
  window.addEventListener('beforeprint',notePrint);
  if(window.matchMedia){
    const media=window.matchMedia('print');
    const listener=event=>{if(event.matches)notePrint()};
    if(media.addEventListener)media.addEventListener('change',listener);
    else if(media.addListener)media.addListener(listener);
  }

  printButton.addEventListener('click',()=>{
    printObserved=false;
    fallback.hidden=true;
    try{window.print()}catch(_){fallback.hidden=false;return}
    window.setTimeout(()=>{if(!printObserved)fallback.hidden=false},900);
  });
})();
