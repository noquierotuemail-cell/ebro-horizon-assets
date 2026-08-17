(() => {
  const frame = document.getElementById('interactive-device');
  if (frame) frame.id = 'interactive-device-core-paused';

  const loadSlider = () => {
    if (frame) frame.id = 'interactive-device';
    const slider = document.createElement('script');
    slider.src = 'js/slider-v20260817.js?v=20260817-2118';
    slider.defer = true;
    document.body.appendChild(slider);
  };

  const core = document.createElement('script');
  core.src = 'js/app-core-v20260817.js?v=20260817-2118';
  core.onload = loadSlider;
  core.onerror = loadSlider;
  document.head.appendChild(core);
})();
