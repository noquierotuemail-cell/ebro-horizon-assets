(() => {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll('.reveal-scroll,.reveal-left,.reveal-right');

  const storeSub = document.querySelector('.store-sub');
  if (storeSub) storeSub.textContent = 'Aplicación web beta';

  document.querySelectorAll('.store-stat').forEach(stat => {
    const title = stat.querySelector('strong');
    const copy = stat.querySelector('span');
    if (title && copy && title.textContent.trim() === 'EBRO PHEV') {
      copy.textContent = 'Control y telemetría disponibles para S900 y en desarrollo para otros modelos.';
    }
  });

  const footerGrid = document.querySelector('.footer-grid');
  if (footerGrid) {
    const footerIntro = footerGrid.firstElementChild;
    if (footerIntro) {
      footerIntro.innerHTML = '<strong>HABRO RemoteApp</strong><p class="footer-project-copy">Proyecto en versión beta. Desarrollado de modo colaborativo para la integración a través del grupo Ebro TechLab en Telegram. La versión web y las funcionalidades actuales de HABRO han sido desarrolladas por Rafa Criado.</p><div class="footer-actions"><a class="footer-telegram primary" href="https://t.me/el_pedrajas" target="_blank" rel="noopener">Contactar por Telegram</a><a class="footer-telegram" href="https://t.me/+m0X9_yvOGphhYjQ0" target="_blank" rel="noopener">Grupo Ebro TechLab · Dudas y consultas</a></div>';
    }
  }

  const maintenanceAsset = 'https://raw.githubusercontent.com/noquierotuemail-cell/ebro-horizon-assets/912d7837bdf9c0e268df6effc6c8fab1903e353e/assets/mantenimiento.webp';
  document.querySelectorAll('img[src="assets/mantenimiento.webp"]').forEach(img => {
    img.src = maintenanceAsset;
    img.removeAttribute('srcset');
  });

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

  const ids = ['view-inicio', 'view-clima', 'view-energia', 'view-solar'];
  const AUTOPLAY_MS = 1500;
  let currentIndex = 0;
  let autoplayTimer = null;
  let startX = null;

  const checkedIndex = () => {
    const checked = document.querySelector('input[name="remoteapp-view"]:checked');
    if (!checked || checked.id === 'view-auto') return currentIndex;
    const index = ids.indexOf(checked.id);
    return index < 0 ? currentIndex : index;
  };

  const showView = index => {
    currentIndex = (index + ids.length) % ids.length;
    const input = document.getElementById(ids[currentIndex]);
    if (input) input.checked = true;
  };

  const stopAutoplay = () => {
    if (autoplayTimer !== null) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (document.hidden) return;
    autoplayTimer = window.setInterval(() => {
      showView(currentIndex + 1);
    }, AUTOPLAY_MS);
  };

  document.querySelectorAll('input[name="remoteapp-view"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.id === 'view-auto') {
        showView(0);
      } else {
        const index = ids.indexOf(input.id);
        if (index >= 0) currentIndex = index;
      }
      startAutoplay();
    });
  });

  frame.addEventListener('touchstart', event => {
    if (event.changedTouches && event.changedTouches[0]) {
      startX = event.changedTouches[0].clientX;
    }
  }, { passive: true });

  frame.addEventListener('touchend', event => {
    if (startX === null || !event.changedTouches || !event.changedTouches[0]) return;
    const delta = event.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(delta) < 42) return;
    const baseIndex = checkedIndex();
    showView(baseIndex + (delta < 0 ? 1 : -1));
    startAutoplay();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  showView(0);
  startAutoplay();
})();