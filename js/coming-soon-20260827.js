(() => {
  const copy = {
    es: {
      skip:'Saltar al contenido',back:'Conoce HABRO',badge:'HABRO RemoteApp · Muy pronto',title:'Algo grande está a punto de llegar a tu EBRO.',intro:'Estamos construyendo una experiencia que conecta coche, casa y energía para anticiparse a ti, simplificar cada trayecto y hacer que tu EBRO se sienta más tuyo.',askBro:'Pregúntale a BRO',discover:'Descubre todo lo que viene',note:'BRO ya está aquí. La RemoteApp, muy pronto.',broEyebrow:'BRO ya está conectado',broTitle:'¿No quieres esperar para saber más?',broCopy:'Pregúntale qué podrá hacer HABRO, cómo se conectará con Home Assistant o qué funciones estamos preparando.',q1:'¿Qué podrá hacer HABRO?',q2:'¿Cómo se conectará con mi EBRO?',q3:'¿Qué necesito para usarla?',openBro:'Abrir HABRO Assistant',privacy:'BRO responde preguntas generales sobre HABRO. No compartas datos personales, credenciales ni información sensible.',finalEyebrow:'HABRO RemoteApp',finalTitle:'Tu EBRO, más inteligente y conectado contigo.',independent:'Proyecto comunitario e independiente de Ebro Tech Lab.',legal:'HABRO no es una aplicación oficial ni supervisada por EBRO SUV S.L. y no implica afiliación con la marca.',continue:'Continuar'
    },
    pt: {
      skip:'Saltar para o conteúdo',back:'Conheça a HABRO',badge:'HABRO RemoteApp · Muito em breve',title:'Algo grande está prestes a chegar ao seu EBRO.',intro:'Estamos a criar uma experiência que liga carro, casa e energia para se antecipar a si, simplificar cada viagem e tornar o seu EBRO ainda mais seu.',askBro:'Pergunte ao BRO',discover:'Descubra tudo o que vem aí',note:'O BRO já está aqui. A RemoteApp, muito em breve.',broEyebrow:'O BRO já está ligado',broTitle:'Não quer esperar para saber mais?',broCopy:'Pergunte o que a HABRO poderá fazer, como se ligará ao Home Assistant ou que funcionalidades estamos a preparar.',q1:'O que poderá fazer a HABRO?',q2:'Como se ligará ao meu EBRO?',q3:'O que preciso para a utilizar?',openBro:'Abrir HABRO Assistant',privacy:'O BRO responde a perguntas gerais sobre a HABRO. Não partilhe dados pessoais, credenciais ou informação sensível.',finalEyebrow:'HABRO RemoteApp',finalTitle:'O seu EBRO, mais inteligente e ligado a si.',independent:'Projeto comunitário e independente do Ebro Tech Lab.',legal:'A HABRO não é uma aplicação oficial nem supervisionada pela EBRO SUV S.L. e não implica afiliação com a marca.',continue:'Continuar'
    }
  };

  const languageButton = document.querySelector('[data-language-toggle]');
  const setLanguage = language => {
    const selected = language === 'pt' ? 'pt' : 'es';
    document.documentElement.lang = selected === 'pt' ? 'pt-PT' : 'es';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = copy[selected][element.dataset.i18n];
      if (value) element.textContent = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const value = copy[selected][element.dataset.i18nAria];
      if (value) element.setAttribute('aria-label', value);
    });
    if (languageButton) {
      languageButton.textContent = selected === 'pt' ? 'ES' : 'PT';
      languageButton.setAttribute('aria-label', selected === 'pt' ? 'Mudar para espanhol' : 'Cambiar a portugués');
    }
    try {
      localStorage.setItem('habro-apple-lang', selected);
      localStorage.setItem('habro-language', selected);
      localStorage.setItem('habro-language-choice', 'manual');
    } catch (error) {}
  };

  let initialLanguage = 'es';
  try {
    const stored = localStorage.getItem('habro-apple-lang') || localStorage.getItem('habro-language');
    initialLanguage = stored === 'pt' ? 'pt' : 'es';
  } catch (error) {}
  setLanguage(initialLanguage);
  languageButton?.addEventListener('click', () => setLanguage(document.documentElement.lang.startsWith('pt') ? 'es' : 'pt'));

  const openBro = (attempt = 0) => {
    const launcher = document.querySelector('.habro-chat-launcher');
    if (launcher) {
      if (launcher.getAttribute('aria-expanded') !== 'true') launcher.click();
      return;
    }
    if (attempt < 20) window.setTimeout(() => openBro(attempt + 1), 180);
  };
  document.querySelectorAll('[data-open-bro]').forEach(button => button.addEventListener('click', openBro));

  const revealNodes = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12, rootMargin: '0px 0px -45px' });
    revealNodes.forEach(node => observer.observe(node));
  } else {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  }
})();
