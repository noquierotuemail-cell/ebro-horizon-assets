(() => {
  const AUTOPLAY_MS = 1500;
  const frame = document.getElementById('interactive-device');
  if (!frame) return;

  const viewport = frame.querySelector('.device-viewport');
  if (!viewport) return;

  const screens = [
    { src: 'assets/slider-01-inicio-20260817.webp?v=20260817-2108', alt: 'Inicio: estado del vehículo, autonomía y accesos remotos' },
    { src: 'assets/slider-02-energia-20260817.webp?v=20260817-2108', alt: 'Energía: carga, consumo y telemetría de batería' },
    { src: 'assets/slider-03-clima-20260817.webp?v=20260817-2108', alt: 'Climatización: consigna, modos rápidos y confort del vehículo' },
    { b64: 'assets/slider-04-vehiculo-20260817.webp.b64.txt?v=20260817-2108', alt: 'Vehículo: mantenimiento, neumáticos, accesos y avisos' },
    { src: 'assets/slider-05-mantenimiento-20260817.webp?v=20260817-2108', alt: 'Mantenimiento: kilometraje, intervalo y próxima revisión' }
  ];

  document.querySelectorAll('.device-screen').forEach(node => node.remove());
  const anchor = viewport.querySelector('.device-bottombar');
  const nodes = screens.map((item, index) => {
    const screen = document.createElement('div');
    screen.className = `device-screen screen-${index}`;
    const img = document.createElement('img');
    img.alt = item.alt;
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.style.objectFit = 'contain';
    img.style.background = '#080b11';
    if (item.src) img.src = item.src;
    screen.appendChild(img);
    viewport.insertBefore(screen, anchor);
    return { screen, img, item };
  });

  const title = document.querySelector('#pantallas .showcase-copy .section-title');
  if (title) title.textContent = 'Una app. Cinco vistas esenciales.';
  const points = document.querySelector('#pantallas .showcase-points');
  if (points) points.innerHTML = '<span><b>01</b> Inicio</span><span><b>02</b> Energía</span><span><b>03</b> Climatización</span><span><b>04</b> Vehículo</span><span><b>05</b> Mantenimiento</span>';

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

  const navMap = [
    ['.nav-hit-inicio', 0],
    ['.nav-hit-energia', 1],
    ['.nav-hit-clima', 2]
  ];
  navMap.forEach(([selector, index]) => {
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
  start();

  const vehicleNode = nodes[3];
  if (vehicleNode && vehicleNode.item.b64) {
    fetch(vehicleNode.item.b64, { cache: 'force-cache' })
      .then(response => response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(base64 => { vehicleNode.img.src = `data:image/webp;base64,${base64.trim()}`; })
      .catch(() => { vehicleNode.img.src = 'assets/mantenimiento.webp'; });
  }
})();
