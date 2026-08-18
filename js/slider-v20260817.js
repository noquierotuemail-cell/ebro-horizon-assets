(() => {
  const AUTOPLAY_MS = 1500;
  const VERSION = '20260818-0810';
  const frame = document.getElementById('interactive-device');
  if (!frame) return;

  const viewport = frame.querySelector('.device-viewport');
  if (!viewport) return;

  /* Keep this showcase phone physically identical to the phone mockups used in the hero. */
  const style = document.createElement('style');
  style.id = 'habro-showcase-phone-geometry';
  style.textContent = `
    #pantallas .device-shell{width:min(292px,100%)!important;max-width:100%!important;margin:0 auto!important}
    #pantallas .device-frame{position:relative!important;width:100%!important;height:auto!important;aspect-ratio:430/932!important;padding:10px!important;border-radius:42px!important;background:#0b0d12!important;overflow:hidden!important;box-shadow:0 28px 90px rgba(15,23,42,.18)!important}
    #pantallas .device-viewport{position:relative!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;border-radius:32px!important;overflow:hidden!important;background:#0b0d12!important}
    #pantallas .device-topbar,#pantallas .device-bottombar{position:absolute!important;left:0!important;right:0!important;z-index:22!important;pointer-events:none!important}
    #pantallas .device-topbar{top:0!important;height:34px!important;background:linear-gradient(180deg,#0c1016 0%,#090d13 100%)!important}
    #pantallas .device-topbar::before{content:'9:41'!important;position:absolute!important;left:14px!important;top:8px!important;transform:none!important;color:rgba(255,255,255,.94)!important;font-size:11px!important;font-weight:700!important}
    #pantallas .device-topbar::after{content:'⋮ 5G 100%'!important;position:absolute!important;right:14px!important;top:8px!important;transform:none!important;color:rgba(255,255,255,.92)!important;font-size:10px!important;font-weight:700!important}
    #pantallas .device-island{position:absolute!important;left:50%!important;top:6px!important;transform:translateX(-50%)!important;width:104px!important;height:17px!important;border-radius:999px!important;background:#020305!important;z-index:23!important}
    #pantallas .device-screen{position:absolute!important;left:0!important;right:0!important;top:40px!important;bottom:46px!important;overflow:hidden!important;background:#0b0d12!important}
    #pantallas .device-screen>img{display:block!important;position:absolute!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;width:100%!important;height:auto!important;max-width:none!important;object-fit:unset!important;object-position:initial!important;transform:none!important;border-radius:0!important;background:transparent!important;opacity:1!important;visibility:visible!important}
    #pantallas .device-bottombar{bottom:0!important;height:46px!important;background:linear-gradient(180deg,#090d13 0%,#0b0d12 100%)!important}
    #pantallas .device-bottombar::before{content:'◁ ○ ▢'!important;position:absolute!important;left:50%!important;top:14px!important;transform:translateX(-50%)!important;color:rgba(255,255,255,.34)!important;font-size:12px!important;letter-spacing:.55em!important;white-space:pre!important}
    #pantallas .device-bottombar::after{content:''!important;position:absolute!important;left:50%!important;bottom:8px!important;transform:translateX(-50%)!important;width:92px!important;height:4px!important;border-radius:999px!important;background:rgba(255,255,255,.24)!important}
    #pantallas .device-appnav{left:0!important;right:0!important;bottom:46px!important;height:56px!important}
    @media(max-width:640px){
      #pantallas .device-shell{width:min(258px,calc(100vw - 84px))!important}
      #pantallas .device-frame{padding:8px!important;border-radius:38px!important}
      #pantallas .device-viewport{border-radius:30px!important}
      #pantallas .device-topbar{height:32px!important}
      #pantallas .device-topbar::before{left:12px!important;font-size:11px!important}
      #pantallas .device-topbar::after{right:12px!important;font-size:10px!important}
      #pantallas .device-island{top:6px!important;width:92px!important;height:16px!important}
      #pantallas .device-screen{top:38px!important;bottom:44px!important}
      #pantallas .device-bottombar{height:44px!important}
      #pantallas .device-appnav{bottom:44px!important;height:54px!important}
    }
  `;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

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
    img.style.height = 'auto';
    img.style.objectFit = 'unset';
    img.style.objectPosition = 'initial';
    img.style.opacity = '1';
    img.style.visibility = 'visible';
    img.style.transform = 'none';

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
