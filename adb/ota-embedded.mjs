const embedded = new URLSearchParams(location.search).get('embedded') === '1';
if (embedded && window.parent !== window) {
  document.documentElement.classList.add('ota-embedded');
  const reportSize = () => {
    window.parent.postMessage({type:'habro-ota-height',height:Math.ceil(document.documentElement.scrollHeight)},location.origin);
  };
  new ResizeObserver(reportSize).observe(document.body);
  window.addEventListener('load',reportSize);
  reportSize();
}
