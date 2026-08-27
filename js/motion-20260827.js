(() => {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  let queued = false;
  const update = () => {
    topbar.classList.toggle('is-scrolled', window.scrollY > 12);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    topbar.style.setProperty('--scroll-progress', progress.toFixed(4));
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
