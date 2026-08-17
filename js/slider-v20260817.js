(() => {
  const AUTOPLAY_MS = 1500;
  const frame = document.getElementById('interactive-device');
  if (!frame) return;
  const viewport = frame.querySelector('.device-viewport');
  if (!viewport) return;

  const screens = [
    { src: 'assets/slider-01-inicio-20260817-2204.webp', alt: 'Inicio: estado del vehículo, autonomía y accesos remotos' },
    { src: 'assets/slider-02-energia-20260817-2204.webp', alt: 'Energía: carga, consumo y telemetría de batería' },
    { src: 'assets/slider-03-clima-20260817-2204.webp', alt: 'Climatización: consigna, modos rápidos y confort del vehículo' },
    { src: 'assets/slider-04-vehiculo-20260817-2204.webp', alt: 'Vehículo: mantenimiento, neumáticos, accesos y avisos' },
    { src: 'assets/slider-05-mantenimiento-20260817-2204.webp', alt: 'Mantenimiento: kilometraje, intervalo y próxima revisión' }
  ];

  viewport.querySelectorAll('.device-screen').forEach(node => node.remove());
  const anchor = viewport.querySelector('.device-bottombar');
  const nodes = screens.map((item, index) => {
    const screen = document.createElement('div');
    screen.className = `device-screen screen-${index}`;
    const img = document.createElement('img');
    img.alt = item.alt;
    img.decoding = 'async';
    img.loading = 'eager';
    if (index === 0) img.fetchPriority = 'high';
    img.src = item.src;
    screen.appendChild(img);
    viewport.insertBefore(screen, anchor);
    return { screen, img };
  });

  const renderLabels = () => {
    const pt = (document.documentElement.lang || '').toLowerCase().startsWith('pt');
    const title = document.querySelector('#pantallas .showcase-copy .section-title');
    if (title) title.textContent = pt ? 'Uma app. Cinco vistas essenciais.' : 'Una app. Cinco vistas esenciales.';
    const points = document.querySelector('#pantallas .showcase-points');
    if (points) {
      points.innerHTML = pt
        ? '<span><b>01</b> Início</span><span><b>02</b> Energia</span><span><b>03</b> Climatização</span><span><b>04</b> Veículo</span><span><b>05</b> Manutenção</span>'
        : '<span><b>01</b> Inicio</span><span><b>02</b> Energía</span><span><b>03</b> Climatización</span><span><b>04</b> Vehículo</span><span><b>05</b> Mantenimiento</span>';
    }
  };
  renderLabels();
  new MutationObserver(renderLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  let current = 0;
  let timer = null;
  let startX = null;

  const show = index => {
    const next = (index + nodes.length) % nodes.length;
    nodes.forEach(({ screen }, i) => {
      screen.classList.toggle('is-active', i === next);
      screen.classList.toggle('is-leaving', i === current && i !== next);
      if (i !== current && i !== next) screen.classList.remove('is-leaving');
    });
    current = next;
  };

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
  const start = () => {
    stop();
    if (!document.hidden) timer = setInterval(() => show(current + 1), AUTOPLAY_MS);
  };

  frame.addEventListener('touchstart', event => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch) startX = touch.clientX;
  }, { passive: true });
  frame.addEventListener('touchend', event => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (startX === null || !touch) return;
    const delta = touch.clientX - startX;
    startX = null;
    if (Math.abs(delta) < 42) return;
    show(current + (delta < 0 ? 1 : -1));
    start();
  }, { passive: true });

  [['.nav-hit-inicio', 0], ['.nav-hit-energia', 1], ['.nav-hit-clima', 2]].forEach(([selector, index]) => {
    const hit = frame.querySelector(selector);
    if (hit) hit.addEventListener('click', event => {
      event.preventDefault();
      show(index);
      start();
    });
  });
  const more = frame.querySelector('.nav-hit-solar');
  if (more) more.addEventListener('click', event => {
    event.preventDefault();
    show(current === 3 ? 4 : 3);
    start();
  });

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  show(0);

  const ready = Promise.allSettled(nodes.map(({ img }) => new Promise(resolve => {
    if (img.complete) return resolve();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  })));
  Promise.race([ready, new Promise(resolve => setTimeout(resolve, 800))]).finally(start);
})();