(() => {
  const root = document.createElement('div');
  root.className = 'habro-chat';
  root.innerHTML = `
    <button class="habro-chat-launcher" type="button" aria-expanded="false" aria-controls="habro-chat-panel">
      <img src="/assets/app-icon.webp" alt="" width="56" height="56">
      <span class="habro-chat-status" aria-hidden="true"></span>
      <span class="habro-chat-label">Asistente</span>
    </button>
    <div class="habro-chat-backdrop" hidden></div>
    <section class="habro-chat-panel" id="habro-chat-panel" aria-hidden="true" aria-label="HABRO Assistant">
      <header class="habro-chat-header">
        <div class="habro-chat-identity">
          <img src="/assets/app-icon.webp" alt="" width="38" height="38">
          <div><strong>HABRO Assistant</strong><span class="habro-chat-subtitle">Asistente de soporte</span></div>
        </div>
        <button class="habro-chat-close" type="button" aria-label="Cerrar asistente">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="habro-chat-body" role="region" aria-live="polite"></div>
    </section>`;
  document.body.appendChild(root);

  const launcher = root.querySelector('.habro-chat-launcher');
  const panel = root.querySelector('.habro-chat-panel');
  const backdrop = root.querySelector('.habro-chat-backdrop');
  const closeButton = root.querySelector('.habro-chat-close');
  const body = root.querySelector('.habro-chat-body');
  const statusDot = root.querySelector('.habro-chat-status');
  const launcherLabel = root.querySelector('.habro-chat-label');
  const subtitle = root.querySelector('.habro-chat-subtitle');

  let config = null;
  let configPromise = null;
  let chatkit = null;
  let chatkitScriptPromise = null;
  let open = false;

  const copy = () => {
    const portuguese = document.documentElement.lang.toLowerCase().startsWith('pt');
    return portuguese ? {
      open: 'Abrir HABRO Assistant',
      close: 'Fechar assistente',
      label: 'Assistente',
      subtitle: 'Assistente de suporte',
      greeting: 'Como posso ajudar com a HABRO?',
      placeholder: 'Escreva a sua dúvida sobre a HABRO…',
      unavailableTitle: 'HABRO Assistant está quase pronto',
      unavailableBody: 'A interface já está integrada. Falta ativar a ligação segura ao servidor ChatKit para começar a responder.',
      telegram: 'Perguntar no Ebro Tech Lab',
      direct: 'Escrever para @el_pedrjas',
      loading: 'A preparar o assistente…',
      errorTitle: 'Não foi possível iniciar o assistente',
      errorBody: 'Tente novamente dentro de alguns instantes ou contacte-nos através do Telegram.',
      prompts: [
        { label: 'Ligar ao Home Assistant', prompt: 'Como ligo a HABRO ao Home Assistant?' },
        { label: 'O veículo não apresenta dados', prompt: 'O meu veículo não apresenta dados na HABRO. O que devo verificar?' },
        { label: 'Funcionalidades da HABRO', prompt: 'Que funcionalidades estão atualmente disponíveis na HABRO?' },
        { label: 'Integração EBRO', prompt: 'Que requisitos tem a integração EBRO no Home Assistant?' }
      ]
    } : {
      open: 'Abrir HABRO Assistant',
      close: 'Cerrar asistente',
      label: 'Asistente',
      subtitle: 'Asistente de soporte',
      greeting: '¿En qué puedo ayudarte con HABRO?',
      placeholder: 'Escribe tu duda sobre HABRO…',
      unavailableTitle: 'HABRO Assistant está casi listo',
      unavailableBody: 'La interfaz ya está integrada. Falta activar la conexión segura con el servidor ChatKit para que pueda empezar a responder.',
      telegram: 'Preguntar en Ebro Tech Lab',
      direct: 'Escribir a @el_pedrjas',
      loading: 'Preparando el asistente…',
      errorTitle: 'No se ha podido iniciar el asistente',
      errorBody: 'Inténtalo de nuevo dentro de unos instantes o contacta con nosotros por Telegram.',
      prompts: [
        { label: 'Conectar con Home Assistant', prompt: '¿Cómo conecto HABRO con Home Assistant?' },
        { label: 'El coche no muestra datos', prompt: 'Mi vehículo no muestra datos en HABRO. ¿Qué debo revisar?' },
        { label: 'Funciones de HABRO', prompt: '¿Qué funciones están disponibles actualmente en HABRO?' },
        { label: 'Integración EBRO', prompt: '¿Qué requisitos tiene la integración EBRO en Home Assistant?' }
      ]
    };
  };

  const localeCode = () => document.documentElement.lang.toLowerCase().startsWith('pt') ? 'pt' : 'es';

  const syncStaticCopy = () => {
    const t = copy();
    launcher.setAttribute('aria-label', t.open);
    launcherLabel.textContent = t.label;
    closeButton.setAttribute('aria-label', t.close);
    subtitle.textContent = t.subtitle;
    panel.setAttribute('aria-label', 'HABRO Assistant');
  };

  const getConfig = () => {
    if (!configPromise) {
      configPromise = fetch('/api/chatkit/config', { credentials: 'same-origin', cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`Config ${response.status}`);
          return response.json();
        })
        .then(value => {
          config = value;
          statusDot.classList.toggle('is-ready', Boolean(value.enabled));
          return value;
        })
        .catch(error => {
          config = { enabled: false, error: true };
          statusDot.classList.remove('is-ready');
          return config;
        });
    }
    return configPromise;
  };

  const renderLoading = () => {
    const t = copy();
    body.innerHTML = `<div class="habro-chat-state"><span class="habro-chat-spinner" aria-hidden="true"></span><p>${t.loading}</p></div>`;
  };

  const renderUnavailable = error => {
    const t = copy();
    body.innerHTML = `
      <div class="habro-chat-state habro-chat-state--message">
        <img src="/assets/app-icon.webp" alt="" width="68" height="68">
        <h2>${error ? t.errorTitle : t.unavailableTitle}</h2>
        <p>${error ? t.errorBody : t.unavailableBody}</p>
        <div class="habro-chat-support-links">
          <a class="habro-chat-support-primary" href="https://t.me/+m0X9_yvOGphhYjQ0" target="_blank" rel="noopener">${t.telegram}</a>
          <a href="https://t.me/el_pedrjas" target="_blank" rel="noopener">${t.direct}</a>
        </div>
      </div>`;
  };

  const loadChatKit = () => {
    if (customElements.get('openai-chatkit')) return Promise.resolve();
    if (chatkitScriptPromise) return chatkitScriptPromise;

    chatkitScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js';
      script.async = true;
      script.onload = () => customElements.whenDefined('openai-chatkit').then(resolve, reject);
      script.onerror = () => reject(new Error('ChatKit script failed to load'));
      document.head.appendChild(script);
    });
    return chatkitScriptPromise;
  };

  const chatKitOptions = () => {
    const t = copy();
    return {
      api: {
        url: config.apiUrl,
        domainKey: config.domainKey,
        fetch: (input, init = {}) => {
          const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
          headers.set('X-HABRO-Locale', localeCode());
          return fetch(input, { ...init, headers, credentials: 'same-origin' });
        }
      },
      frameTitle: 'HABRO Assistant',
      initialThread: null,
      theme: {
        colorScheme: 'light',
        density: 'normal',
        radius: 'round'
      },
      startScreen: {
        greeting: t.greeting,
        prompts: t.prompts
      },
      composer: {
        placeholder: t.placeholder,
        attachments: { enabled: false },
        dictation: { enabled: false }
      }
    };
  };

  const mountChatKit = async () => {
    renderLoading();
    const currentConfig = await getConfig();
    if (!currentConfig.enabled) {
      renderUnavailable(Boolean(currentConfig.error));
      return;
    }

    try {
      await loadChatKit();
      if (!chatkit) {
        chatkit = document.createElement('openai-chatkit');
        chatkit.className = 'habro-chatkit-element';
      }
      chatkit.setOptions(chatKitOptions());
      if (!chatkit.isConnected) {
        body.replaceChildren(chatkit);
      }
    } catch (error) {
      renderUnavailable(true);
    }
  };

  const setOpen = next => {
    open = Boolean(next);
    root.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    backdrop.hidden = !open;
    document.body.classList.toggle('habro-chat-open', open);
    if (open) {
      mountChatKit();
      window.setTimeout(() => closeButton.focus({ preventScroll: true }), 80);
    } else {
      launcher.focus({ preventScroll: true });
    }
  };

  launcher.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  const languageObserver = new MutationObserver(() => {
    syncStaticCopy();
    if (chatkit && config && config.enabled) chatkit.setOptions(chatKitOptions());
    if (open && (!config || !config.enabled)) renderUnavailable(Boolean(config && config.error));
  });
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  syncStaticCopy();
  getConfig();
})();
