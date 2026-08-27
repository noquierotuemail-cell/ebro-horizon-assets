(() => {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  let queued = false;
  const update = () => {
    topbar.classList.toggle('is-scrolled', window.scrollY > 12);
    queued = false;
  };

  const requestUpdate = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
})();
