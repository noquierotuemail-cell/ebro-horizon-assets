(() => {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = document.querySelectorAll('.reveal-scroll,.reveal-left,.reveal-right');

    if (!reduceMotion && 'IntersectionObserver' in window) {
      try {
        document.documentElement.classList.add('motion-ready');
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.10, rootMargin: '0px 0px -4% 0px' });
        revealTargets.forEach(el => {
          if (!el.classList.contains('is-visible')) observer.observe(el);
        });
        window.setTimeout(() => {
          revealTargets.forEach(el => el.classList.add('is-visible'));
        }, 1800);
      } catch (err) {
        document.documentElement.classList.remove('motion-ready');
        revealTargets.forEach(el => el.classList.add('is-visible'));
      }
    } else {
      revealTargets.forEach(el => el.classList.add('is-visible'));
    }

    const frame = document.getElementById('interactive-device');
    if (!frame) return;
    const ids = ['view-inicio','view-clima','view-energia','view-solar'];
    let startX = null;
    const selectedIndex = () => {
      const checked = document.querySelector('input[name="remoteapp-view"]:checked');
      if (!checked || checked.id === 'view-auto') return 0;
      const i = ids.indexOf(checked.id);
      return i < 0 ? 0 : i;
    };
    frame.addEventListener('touchstart', e => {
      if (e.changedTouches && e.changedTouches[0]) startX = e.changedTouches[0].clientX;
    }, {passive:true});
    frame.addEventListener('touchend', e => {
      if (startX === null || !e.changedTouches || !e.changedTouches[0]) return;
      const delta = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(delta) < 42) return;
      let next = selectedIndex() + (delta < 0 ? 1 : -1);
      next = (next + ids.length) % ids.length;
      const input = document.getElementById(ids[next]);
      if (input) input.checked = true;
    }, {passive:true});
  })();