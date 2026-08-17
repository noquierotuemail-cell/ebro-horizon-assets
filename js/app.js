(() => {
  const VERSION = '20260817-2220';
  const frame = document.getElementById('interactive-device');
  if (frame) frame.id = 'interactive-device-core-paused';

  const loadSlider = () => {
    if (frame) frame.id = 'interactive-device';
    const slider = document.createElement('script');
    slider.src = `js/slider-v20260817.js?v=${VERSION}`;
    slider.defer = true;
    document.body.appendChild(slider);
  };

  const core = document.createElement('script');
  core.src = `js/app-core-v20260817.js?v=${VERSION}`;
  core.onload = loadSlider;
  core.onerror = loadSlider;
  document.head.appendChild(core);
})();
