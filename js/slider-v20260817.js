(() => {
  const AUTOPLAY_MS = 1500;
  const VERSION = '20260817-2330';
  const frame = document.getElementById('interactive-device');
  if (!frame) return;

  const viewport = frame.querySelector('.device-viewport');
  if (!viewport) return;

  const screens = [
    { src: `assets/slider-01-inicio-20260817-2204.webp?v=${VERSION}`, alt: 'Inicio: estado del vehículo, autonomía y accesos remotos' },
    { src: `assets/slider-02-energia-20260817-2204.webp?v=${VERSION}`, alt: 'Energía: carga, consumo y telemetría de batería' },
    { src: `assets/slider-03-clima-20260817-2204.webp?v=${VERSION}`, alt: 'Climatización: consigna, modos rápidos y confort del vehículo' },
    { src: `assets/slider-04-vehiculo-20260817-2204.webp?v=${VERSION}`, alt: 'Vehículo: mantenimiento, neumáticos, accesos y avisos' },
    { src: `assets/slider-05-mantenimiento-20260817-2204.webp?v=${VERSION}`, alt: 'Mantenimiento: kilometraje, intervalo y próxima revisión' }
  ];

  viewport.querySelectorAll('.device-screen').forEach(node => node.remove());
  const anchor = viewport.querySelector('.device-bottombar');
  const nodes = screens.map((item, index) => {
    const screen = document.createElement('div');
    screen.className = `device-screen screen-${index}`;

    const img = document.createElement('img');
    img.alt = item.alt;
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.src = item.src;

    screen.appendChild(img);
    viewport.insertBefore(screen, anchor);
    return screen;
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
  new MutationObserver(renderLabels).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });

  let current = 0;
  let timer = null;
  let startX = null;

  const show = index => {
    const next = (index + nodes.length) % nodes.length;
    nodes.forEach((screen, i) => {
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
    if (document.hidden) return;
    timer = setInterval(() => show(current + 1), AUTOPLAY_MS);
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

  [
    ['.nav-hit-inicio', 0],
    ['.nav-hit-energia', 1],
    ['.nav-hit-clima', 2]
  ].forEach(([selector, index]) => {
    const hit = frame.querySelector(selector);
    if (!hit) return;
    hit.addEventListener('click', event => {
      event.preventDefault();
      show(index);
      start();
    });
  });

  const more = frame.querySelector('.nav-hit-solar');
  if (more) {
    more.addEventListener('click', event => {
      event.preventDefault();
      show(current === 3 ? 4 : 3);
      start();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  show(0);
  start();
})();
