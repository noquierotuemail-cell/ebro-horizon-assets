(() => {
  const AUTOPLAY_MS = 1500;
  const VERSION = '20260818-0748';
  const frame = document.getElementById('interactive-device');
  if (!frame) return;

  const viewport = frame.querySelector('.device-viewport');
  if (!viewport) return;

  const screens = [
    { b64: `assets/slider-safe-inicio.b64?v=${VERSION}`, alt: 'Inicio: estado del vehículo, autonomía y accesos remotos' },
    { b64: `assets/slider-safe-energia.b64?v=${VERSION}`, alt: 'Energía: carga, consumo y telemetría de batería' },
    { b64: `assets/slider-safe-clima.b64?v=${VERSION}`, alt: 'Climatización: consigna, modos rápidos y confort del vehículo' },
    { b64: `assets/slider-safe-vehiculo.b64?v=${VERSION}`, alt: 'Vehículo: mantenimiento, neumáticos, accesos y avisos' },
    { b64: `assets/slider-safe-mantenimiento.b64?v=${VERSION}`, alt: 'Mantenimiento: kilometraje, intervalo y próxima revisión' }
  ];

  let nodes = Array.from(viewport.querySelectorAll('.device-screen'));
  const anchor = viewport.querySelector('.device-bottombar');

  while (nodes.length < screens.length) {
    const screen = document.createElement('div');
    screen.className = `device-screen screen-${nodes.length}`;
    screen.appendChild(document.createElement('img'));
    viewport.insertBefore(screen, anchor);
    nodes.push(screen);
  }
  nodes.slice(screens.length).forEach(node => node.remove());
  nodes = nodes.slice(0, screens.length);

  const loadScreen = async (screen, item, index) => {
    let img = screen.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      screen.appendChild(img);
    }
    img.alt = item.alt;
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.style.display = 'block';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center top';
    img.style.opacity = '1';
    img.style.visibility = 'visible';

    const response = await fetch(item.b64, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${item.b64}: HTTP ${response.status}`);
    const base64 = (await response.text()).trim();
    if (!base64.startsWith('UklGR')) throw new Error(`${item.b64}: invalid WebP payload`);
    img.src = `data:image/webp;base64,${base64}`;
    if (img.decode) await img.decode();
  };

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
    nodes.forEach((screen, i) => {
      screen.classList.toggle('is-active', i === next);
      screen.classList.toggle('is-leaving', i === current && i !== next);
      if (i !== current && i !== next) screen.classList.remove('is-leaving');
      screen.style.opacity = i === next ? '1' : '0';
      screen.style.visibility = i === next ? 'visible' : 'hidden';
      screen.style.pointerEvents = i === next ? 'auto' : 'none';
      screen.style.zIndex = i === next ? '3' : '1';
      screen.style.transform = i === next ? 'translateX(0) scale(1)' : 'translateX(28px) scale(.985)';
      screen.style.filter = i === next ? 'none' : 'blur(3px)';
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
  Promise.all(screens.map((item, index) => loadScreen(nodes[index], item, index)))
    .catch(error => console.error('HABRO slider:', error))
    .finally(start);
})();
