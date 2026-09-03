(()=>{
  'use strict';
  const printButton=document.getElementById('printGuide');
  const fallback=document.getElementById('printFallback');
  const openPrintable=document.getElementById('openPrintable');

  if(openPrintable){
    const printableUrl=new URL(window.location.href);
    printableUrl.searchParams.set('printable','1');
    openPrintable.href=printableUrl.toString();
  }

  let printObserved=false;
  const notePrint=()=>{printObserved=true;fallback.hidden=true};
  window.addEventListener('beforeprint',notePrint);
  if(window.matchMedia){
    const media=window.matchMedia('print');
    const listener=event=>{if(event.matches)notePrint()};
    if(media.addEventListener)media.addEventListener('change',listener);
    else if(media.addListener)media.addListener(listener);
  }

  if(printButton&&fallback)printButton.addEventListener('click',()=>{
    printObserved=false;
    fallback.hidden=true;
    try{window.print()}catch(_){fallback.hidden=false;return}
    window.setTimeout(()=>{if(!printObserved)fallback.hidden=false},900);
  });

  if(new URLSearchParams(window.location.search).get('printable')==='1'){
    window.setTimeout(()=>{try{window.print()}catch(_){}},650);
  }

  const accessCard=document.getElementById('acceder-habro');
  if(accessCard&&'IntersectionObserver' in window){
    const reminder=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      window.dispatchEvent(new CustomEvent('habro:bro-reminder',{detail:{
        title:'BRO sigue aquí para ayudarte',
        text:'Puedes volver y preguntarme en cualquier momento del proceso.'
      }}));
      reminder.disconnect();
    },{threshold:.4});
    reminder.observe(accessCard);
  }
})();
