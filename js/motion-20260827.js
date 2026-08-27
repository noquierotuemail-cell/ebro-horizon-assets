(() => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const revealNodes = [...document.querySelectorAll('.reveal:not(.is-visible)')];

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    revealNodes.forEach(node => revealObserver.observe(node));
  } else {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  }

  document.documentElement.classList.add('habro-motion-ready');

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
