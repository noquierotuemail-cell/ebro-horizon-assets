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

  const telegramIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 3.2 18.4 20c-.24 1.19-.87 1.48-1.77.92l-4.87-3.59-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.96 9.02-8.15c.39-.35-.09-.55-.61-.2L6.04 13.78 1.24 12.28c-1.04-.33-1.06-1.04.22-1.54L20.22 3.5c.87-.32 1.63.2 1.38-.3Z"/></svg>';
  const footerGrid = document.querySelector('.footer-grid');
  if (footerGrid) {
    const footerIntro = footerGrid.firstElementChild;
    const footerLegal = footerGrid.querySelector('.legal');
    if (footerIntro) {
      footerIntro.innerHTML = '<strong>HABRO RemoteApp</strong><p class="footer-project-copy">Proyecto comunitario e independiente desarrollado de modo colaborativo para la integración de EBRO AUTO en Home Assistant, dentro del grupo Ebro Tech Lab. La versión web y las funcionalidades actuales de HABRO han sido desarrolladas íntegramente por Rafa Criado para esta versión beta.</p><div class="footer-actions"><a class="footer-telegram primary" href="https://t.me/el_pedrjas" target="_blank" rel="noopener">' + telegramIcon + '<span>Escribir a @el_pedrjas</span></a><a class="footer-telegram" href="https://t.me/+m0X9_yvOGphhYjQ0" target="_blank" rel="noopener">' + telegramIcon + '<span>Entrar en Ebro Tech Lab</span></a></div>';
    }
    if (footerLegal) {
      footerLegal.textContent = 'HABRO no es una aplicación oficial ni supervisada por EBRO SUV S.L. ni implica afiliación con la marca. EBRO y las marcas relacionadas pertenecen a sus respectivos titulares y no han participado en el desarrollo de ninguna de las funcionalidades actuales.';
    }
  }

  const maintenanceAsset = 'https://raw.githubusercontent.com/noquierotuemail-cell/ebro-horizon-assets/912d7837bdf9c0e268df6effc6c8fab1903e353e/assets/mantenimiento.webp';
  document.querySelectorAll('img[src="assets/mantenimiento.webp"]').forEach(img => {
    img.src = maintenanceAsset;
    img.removeAttribute('srcset');
  });

  const pt = {
    'Proyecto Ebro Tech Lab ·': 'Projeto Ebro Tech Lab ·',
    'Qué aporta': 'O que oferece',
    'Funciones': 'Funcionalidades',
    'Requisitos': 'Requisitos',
    'Probar beta': 'Experimentar beta',
    'Desarrollada dentro de Ebro Tech Lab': 'Desenvolvida no Ebro Tech Lab',
    'Tu EBRO, conectado a tu casa.': 'O seu EBRO, ligado à sua casa.',
    'Control remoto, carga, telemetría, avisos y alertas de estado, seguimiento de mantenimiento y energía doméstica en una interfaz móvil clara, rápida y pensada para usuarios de Home Assistant.': 'Controlo remoto, carregamento, telemetria, avisos e alertas de estado, acompanhamento da manutenção e energia doméstica numa interface móvel clara, rápida e pensada para utilizadores do Home Assistant.',
    'Probar HABRO RemoteApp': 'Experimentar HABRO RemoteApp',
    'Ver capturas': 'Ver capturas de ecrã',
    'Beta abierta': 'Beta aberta',
    'Requiere Home Assistant': 'Requer Home Assistant',
    'Optimizada para móvil': 'Otimizada para dispositivos móveis',
    'Aplicación web beta': 'Aplicação web beta',
    'Integración necesaria': 'Integração necessária',
    'Control y telemetría': 'Controlo e telemetria',
    'Control y telemetría disponibles para S900 y en desarrollo para otros modelos.': 'Controlo e telemetria disponíveis para o S900 e em desenvolvimento para outros modelos.',
    'En desarrollo activo': 'Em desenvolvimento ativo',
    'Una capa adicional': 'Uma camada adicional',
    'Más contexto. Menos saltos entre aplicaciones.': 'Mais contexto. Menos mudanças entre aplicações.',
    'HABRO RemoteApp no pretende sustituir los servicios oficiales de EBRO. Los complementa para quienes ya tienen Home Assistant y quieren ver vehículo, vivienda y energía en el mismo entorno.': 'A HABRO RemoteApp não pretende substituir os serviços oficiais da EBRO. Complementa-os para quem já utiliza o Home Assistant e quer ver veículo, casa e energia no mesmo ambiente.',
    'Vehículo + hogar': 'Veículo + casa',
    'La información del EBRO convive con tus entidades, escenas y automatizaciones de Home Assistant.': 'A informação do EBRO convive com as suas entidades, cenas e automatizações do Home Assistant.',
    'Energía visible': 'Energia visível',
    'Batería, consumo, potencia de carga y flujos solares presentados de forma clara y directa.': 'Bateria, consumo, potência de carregamento e fluxos solares apresentados de forma clara e direta.',
    'Controles agrupados': 'Controlos agrupados',
    'Acciones habituales del coche organizadas en una interfaz rápida, táctil y pensada para móvil.': 'Ações habituais do veículo organizadas numa interface rápida, tátil e pensada para dispositivos móveis.',
    'Telemetría ampliada': 'Telemetria alargada',
    'Lecturas y métricas derivadas para entender mejor carga, consumo y comportamiento de la batería.': 'Leituras e métricas derivadas para compreender melhor o carregamento, o consumo e o comportamento da bateria.',
    'Complemento, no sustituto': 'Complemento, não substituto',
    'La experiencia oficial, más tu ecosistema Home Assistant.': 'A experiência oficial, mais o seu ecossistema Home Assistant.',
    'La app oficial sigue siendo la referencia para los servicios conectados de EBRO. HABRO RemoteApp añade una interfaz alternativa construida alrededor de las entidades que ya tienes integradas en Home Assistant.': 'A aplicação oficial continua a ser a referência para os serviços ligados da EBRO. A HABRO RemoteApp acrescenta uma interface alternativa construída em torno das entidades que já tem integradas no Home Assistant.',
    'Aplicación oficial EBRO': 'Aplicação oficial EBRO',
    'Servicios del fabricante': 'Serviços do fabricante',
    'Tu canal oficial para la experiencia conectada del vehículo y las funciones proporcionadas por EBRO.': 'O seu canal oficial para a experiência ligada do veículo e para as funcionalidades disponibilizadas pela EBRO.',
    'Referencia oficial del vehículo.': 'Referência oficial do veículo.',
    'Servicios conectados proporcionados por EBRO.': 'Serviços ligados disponibilizados pela EBRO.',
    'Uso independiente de Home Assistant.': 'Utilização independente do Home Assistant.',
    'Tu capa personalizada': 'A sua camada personalizada',
    'Una vista adicional para quienes quieren relacionar el coche con el resto de su vivienda conectada.': 'Uma vista adicional para quem pretende relacionar o veículo com o resto da sua casa conectada.',
    'Unifica vehículo, energía solar, red y vivienda.': 'Unifica veículo, energia solar, rede e casa.',
    'Presenta telemetría, métricas derivadas y avisos útiles de estado en paneles específicos.': 'Apresenta telemetria, métricas derivadas e avisos de estado úteis em painéis específicos.',
    'Permite aprovechar escenas y automatizaciones de Home Assistant.': 'Permite aproveitar cenas e automatizações do Home Assistant.',
    'Interfaz diseñada específicamente para el uso diario del S900.': 'Interface concebida especificamente para a utilização diária do S900.',
    'La aplicación': 'A aplicação',
    'Una app. Cuatro vistas esenciales.': 'Uma app. Quatro vistas essenciais.',
    'Inicio y alertas': 'Início e alertas',
    'Climatización': 'Climatização',
    'Carga y telemetría': 'Carregamento e telemetria',
    'Solar y vivienda': 'Solar e casa',
    'Hecha para consultar y actuar.': 'Feita para consultar e atuar.',
    'Información útil sin menús interminables. Desde el control diario hasta las revisiones, cada bloque responde a una tarea concreta.': 'Informação útil sem menus intermináveis. Do controlo diário às revisões, cada bloco responde a uma tarefa concreta.',
    'Control remoto': 'Controlo remoto',
    'Apertura del vehículo, maletero, ventanillas, techo solar y acciones de búsqueda desde un único panel.': 'Abertura do veículo, bagageira, vidros, teto de abrir e ações de localização a partir de um único painel.',
    'Ajusta la temperatura de consigna y lanza modos rápidos de frío o calor con controles táctiles claros.': 'Ajuste a temperatura definida e ative modos rápidos de frio ou calor com controlos táteis claros.',
    'Carga y energía': 'Carregamento e energia',
    'Consulta el SOC, potencia, consumo, objetivo de carga y opciones de programación en la misma pantalla.': 'Consulte o SOC, potência, consumo, objetivo de carregamento e opções de programação no mesmo ecrã.',
    'Telemetría de batería': 'Telemetria da bateria',
    'Panel específico para potencia, carga, capacidad y estimaciones que ayudan a interpretar la batería.': 'Painel específico para potência, carregamento, capacidade e estimativas que ajudam a interpretar a bateria.',
    'Mantenimiento y neumáticos': 'Manutenção e pneus',
    'Sigue los mantenimientos, revisiones y el control de neumáticos del vehículo para llevar al día el historial y los próximos hitos.': 'Acompanhe as manutenções, revisões e o controlo dos pneus do veículo para manter o histórico e os próximos marcos atualizados.',
    'Visualiza producción fotovoltaica, consumo de casa, intercambio con red y potencia destinada al coche.': 'Visualize a produção fotovoltaica, o consumo da casa, a troca com a rede e a potência destinada ao veículo.',
    'Avisos y alertas de estado': 'Avisos e alertas de estado',
    'La app genera avisos visuales y alertas de estado para saber de un vistazo si el vehículo, maletero, ventanillas o el techo solar requieren atención.': 'A app gera avisos visuais e alertas de estado para perceber rapidamente se o veículo, a bagageira, os vidros ou o teto de abrir requerem atenção.',
    'Home Assistant': 'Home Assistant',
    'La aplicación se alimenta de las entidades disponibles en tu instalación para ofrecer una experiencia conectada, personalizable y en crecimiento continuo.': 'A aplicação utiliza as entidades disponíveis na sua instalação para oferecer uma experiência ligada, personalizável e em evolução contínua.',
    'Mantenimiento': 'Manutenção',
    'Seguimiento visual de revisiones y neumáticos.': 'Acompanhamento visual de revisões e pneus.',
    'La vista de mantenimiento muestra kilometraje, próximos hitos y control de neumáticos dentro del flujo general de la aplicación.': 'A vista de manutenção mostra quilometragem, próximos marcos e controlo dos pneus dentro do fluxo geral da aplicação.',
    'Antes de probarla': 'Antes de experimentar',
    'Home Assistant es un requisito.': 'O Home Assistant é um requisito.',
    'HABRO RemoteApp no se conecta directamente al vehículo por sí sola. Necesita que tu EBRO ya esté integrado y funcionando correctamente dentro de Home Assistant.': 'A HABRO RemoteApp não se liga diretamente ao veículo por si só. É necessário que o seu EBRO já esteja integrado e a funcionar corretamente no Home Assistant.',
    'Qué necesitas': 'O que precisa',
    'La beta utiliza las entidades que Home Assistant expone del vehículo. Si la integración EBRO no está instalada, configurada y operativa, la aplicación no podrá mostrar datos ni ejecutar controles.': 'A beta utiliza as entidades do veículo expostas pelo Home Assistant. Se a integração EBRO não estiver instalada, configurada e operacional, a aplicação não poderá mostrar dados nem executar controlos.',
    'Descargar integración EBRO para HA': 'Descarregar integração EBRO para HA',
    'Home Assistant operativo': 'Home Assistant operacional',
    'Accesible desde el dispositivo donde usarás RemoteApp.': 'Acessível a partir do dispositivo onde irá utilizar a RemoteApp.',
    'Integración EBRO activa': 'Integração EBRO ativa',
    'Instálala desde el enlace de GitHub y comprueba que el vehículo aparece correctamente en Home Assistant.': 'Instale-a através da ligação do GitHub e confirme que o veículo aparece corretamente no Home Assistant.',
    'Entidades disponibles': 'Entidades disponíveis',
    'Los controles y sensores dependen de las entidades expuestas por tu integración.': 'Os controlos e sensores dependem das entidades expostas pela sua integração.',
    'Versión beta': 'Versão beta',
    'El proyecto está en desarrollo activo. El diseño, la compatibilidad y algunas funciones pueden cambiar entre versiones, y su disponibilidad depende de las entidades que exponga cada instalación de Home Assistant. Además, pronto se incorporarán nuevas funciones: es una app pensada para seguir creciendo de forma continua.': 'O projeto está em desenvolvimento ativo. O design, a compatibilidade e algumas funcionalidades podem mudar entre versões, e a sua disponibilidade depende das entidades expostas por cada instalação do Home Assistant. Além disso, serão incorporadas novas funcionalidades: é uma app pensada para continuar a evoluir.',
    'Prueba la beta y ayúdanos a mejorarla.': 'Experimente a beta e ajude-nos a melhorá-la.',
    'Accede a HABRO RemoteApp desde el navegador. HABRO RemoteApp seguirá incorporando nuevas funciones y ampliando capacidades. Para novedades, pruebas y conversación técnica del proyecto, entra en la comunidad de Ebro Tech Lab.': 'Aceda à HABRO RemoteApp a partir do navegador. A HABRO RemoteApp continuará a incorporar novas funcionalidades e a ampliar capacidades. Para novidades, testes e conversa técnica sobre o projeto, entre na comunidade Ebro Tech Lab.',
    'Abrir HABRO RemoteApp': 'Abrir HABRO RemoteApp',
    'Entrar en Ebro Tech Lab': 'Entrar no Ebro Tech Lab',
    'Proyecto comunitario e independiente desarrollado de modo colaborativo para la integración de EBRO AUTO en Home Assistant, dentro del grupo Ebro Tech Lab. La versión web y las funcionalidades actuales de HABRO han sido desarrolladas íntegramente por Rafa Criado para esta versión beta.': 'Projeto comunitário e independente desenvolvido de forma colaborativa para a integração do EBRO AUTO no Home Assistant, no âmbito do grupo Ebro Tech Lab. A versão web e as funcionalidades atuais da HABRO foram desenvolvidas integralmente por Rafa Criado para esta versão beta.',
    'Escribir a @el_pedrjas': 'Escrever para @el_pedrjas',
    'HABRO no es una aplicación oficial ni supervisada por EBRO SUV S.L. ni implica afiliación con la marca. EBRO y las marcas relacionadas pertenecen a sus respectivos titulares y no han participado en el desarrollo de ninguna de las funcionalidades actuales.': 'A HABRO não é uma aplicação oficial nem supervisionada pela EBRO SUV S.L. e não implica qualquer afiliação à marca. A EBRO e as marcas relacionadas pertencem aos respetivos titulares e não participaram no desenvolvimento de nenhuma das funcionalidades atuais.'
  };

  const ptAttrs = {
    'Navegación principal': 'Navegação principal',
    'Icono de HABRO RemoteApp': 'Ícone da HABRO RemoteApp',
    'Capturas de HABRO RemoteApp': 'Capturas da HABRO RemoteApp',
    'Pantalla de inicio de HABRO RemoteApp': 'Ecrã inicial da HABRO RemoteApp',
    'Pantalla de carga y telemetría de HABRO RemoteApp': 'Ecrã de carregamento e telemetria da HABRO RemoteApp',
    'Pantalla de mantenimiento de HABRO RemoteApp': 'Ecrã de manutenção da HABRO RemoteApp',
    'Icono de la aplicación': 'Ícone da aplicação',
    'Inicio: estado del vehículo, alertas, autonomía y accesos remotos': 'Início: estado do veículo, alertas, autonomia e acessos remotos',
    'Climatización: consigna, modos rápidos y confort del vehículo': 'Climatização: temperatura definida, modos rápidos e conforto do veículo',
    'Energía: carga, consumo y telemetría de batería': 'Energia: carregamento, consumo e telemetria da bateria',
    'Solar y carga: producción, vivienda, red y vehículo': 'Solar e carregamento: produção, casa, rede e veículo',
    'Barra inferior interactiva de la app': 'Barra inferior interativa da app',
    'Mostrar Inicio': 'Mostrar Início',
    'Mostrar Energía': 'Mostrar Energia',
    'Mostrar Clima': 'Mostrar Climatização',
    'Mostrar Más / Solar y carga': 'Mostrar Mais / Solar e carregamento',
    'Pantalla de mantenimiento y neumáticos de HABRO RemoteApp': 'Ecrã de manutenção e pneus da HABRO RemoteApp'
  };

  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!node.nodeValue.trim() || (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE'))) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    textNodes.push([walker.currentNode, walker.currentNode.nodeValue]);
  }

  const attributeValues = [];
  document.querySelectorAll('[alt],[aria-label],[title]').forEach(element => {
    ['alt', 'aria-label', 'title'].forEach(attribute => {
      if (element.hasAttribute(attribute)) attributeValues.push([element, attribute, element.getAttribute(attribute)]);
    });
  });

  const preserveWhitespace = (original, translated) => {
    const leading = (original.match(/^\s*/) || [''])[0];
    const trailing = (original.match(/\s*$/) || [''])[0];
    return leading + translated + trailing;
  };

  const metaDescription = document.querySelector('meta[name="description"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const spanishMeta = metaDescription ? metaDescription.getAttribute('content') : '';
  const spanishOg = ogDescription ? ogDescription.getAttribute('content') : '';
  const portugueseMeta = 'HABRO RemoteApp liga o seu EBRO ao Home Assistant: controlo remoto, climatização, carregamento, telemetria, avisos e alertas de estado, manutenção e energia solar numa interface pensada para dispositivos móveis.';
  const portugueseOg = 'Uma camada adicional para o seu EBRO: veículo, casa e energia unidos através do Home Assistant.';

  let savedLanguage = '';
  try { savedLanguage = localStorage.getItem('habro-language') || ''; } catch (err) {}
  const languageParam = new URLSearchParams(window.location.search).get('lang');
  let currentLanguage = languageParam === 'pt' ? 'pt' : languageParam === 'es' ? 'es' : savedLanguage === 'pt' ? 'pt' : 'es';

  const navLinks = document.querySelector('.navlinks');
  const languageToggle = document.createElement('button');
  languageToggle.type = 'button';
  languageToggle.className = 'language-toggle';
  if (navLinks) {
    const cta = navLinks.querySelector('.navcta');
    navLinks.insertBefore(languageToggle, cta || null);
  }

  const applyLanguage = language => {
    currentLanguage = language === 'pt' ? 'pt' : 'es';
    document.documentElement.lang = currentLanguage === 'pt' ? 'pt-PT' : 'es';

    textNodes.forEach(([node, original]) => {
      const key = original.trim();
      node.nodeValue = currentLanguage === 'pt' && Object.prototype.hasOwnProperty.call(pt, key)
        ? preserveWhitespace(original, pt[key])
        : original;
    });

    attributeValues.forEach(([element, attribute, original]) => {
      element.setAttribute(attribute, currentLanguage === 'pt' && ptAttrs[original] ? ptAttrs[original] : original);
    });

    if (metaDescription) metaDescription.setAttribute('content', currentLanguage === 'pt' ? portugueseMeta : spanishMeta);
    if (ogDescription) ogDescription.setAttribute('content', currentLanguage === 'pt' ? portugueseOg : spanishOg);

    languageToggle.textContent = currentLanguage === 'pt' ? 'ES' : 'PT';
    const toggleLabel = currentLanguage === 'pt' ? 'Mudar para espanhol' : 'Cambiar a portugués';
    languageToggle.setAttribute('aria-label', toggleLabel);
    languageToggle.setAttribute('title', toggleLabel);

    try { localStorage.setItem('habro-language', currentLanguage); } catch (err) {}
  };

  languageToggle.addEventListener('click', () => {
    const nextLanguage = currentLanguage === 'pt' ? 'es' : 'pt';
    applyLanguage(nextLanguage);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', nextLanguage);
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  });

  applyLanguage(currentLanguage);

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