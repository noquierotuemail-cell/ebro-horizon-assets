(()=>{
  'use strict';

  const pairs=[
    ['Autorización','Autorização'],
    ['Guía de instalación · antes de empezar','Guia de instalação · antes de começar'],
    ['Guía visual de instalación','Guia visual de instalação'],
    ['Vas a instalar HABRO.','Vai instalar a HABRO.'],
    ['Esto es lo que va a pasar.','Isto é o que vai acontecer.'],
    ['Un recorrido breve para que sepas qué verás en cada pantalla, cuándo tendrás que intervenir y cuándo puedes simplemente dejar que HABRO trabaje.','Um percurso breve para saberes o que verás em cada ecrã, quando terás de intervir e quando podes simplesmente deixar a HABRO trabalhar.'],
    ['Un recorrido breve para que sepas qué verás en cada pantalla, cuándo tendrás que intervenir y cuándo puedes simplemente dejar que HABRO trabaje.','Um percurso breve para saber o que verá em cada ecrã, quando terá de intervir e quando pode simplesmente deixar que a HABRO trabalhe.'],
    ['Un recorrido breve para que sepas qué verás en cada pantalla, cuándo tendrás que intervenir y cuándo puedes simplemente dejar que HABRO trabaje.','Um percurso breve para saber o que verá em cada ecrã, quando terá de intervir e quando pode simplesmente deixar a HABRO trabalhar.'],
    ['Ver los pasos','Ver os passos'],
    ['Se el cuadro de impresión no aparece, este visor está bloqueando la función del navegador.','Se a caixa de diálogo de impressão não aparecer, este visualizador está a bloquear a função do navegador.'],
    ['Si no aparece el diálogo de impresión, este visor está bloqueando la función del navegador.','Se a caixa de diálogo de impressão não aparecer, este visualizador está a bloquear a função do navegador.'],
    ['Abre la guía en una pestaña nueva','Abre o guia num novo separador'],
    ['Abre la guía en una pestaña nueva','Abra o guia num novo separador'],
    ['y utiliza','e utiliza'],
    ['y allí usa','e utiliza'],
    ['y utiliza','e utilize'],
    ['Compartir → Imprimir','Partilhar → Imprimir'],
    ['Guardar en Archivos como PDF','Guardar em Ficheiros como PDF'],
    ['Sin YAML','Sem YAML'],
    ['No tendrás que editar archivos ni buscar entidades.','Não terás de editar ficheiros nem procurar entidades.'],
    ['No tendrás que editar archivos ni buscar entidades.','Não terá de editar ficheiros nem procurar entidades.'],
    ['Sin Terminal','Sem Terminal'],
    ['No tendrás que escribir comandos ni entrar por SSH.','Não terás de escrever comandos nem aceder por SSH.'],
    ['No tendrás que escribir comandos ni entrar por SSH.','Não terá de escrever comandos nem aceder por SSH.'],
    ['Con recuperación','Com recuperação'],
    ['HABRO prepara una copia recuperable antes de realizar cambios.','A HABRO prepara uma cópia recuperável antes de efetuar alterações.'],
    ['El recorrido,','O percurso,'],
    ['pantalla a pantalla.','ecrã a ecrã.'],
    ['Las representaciones de interfaz de esta guía están construidas en HTML para explicar el proceso. No sustituyen las pantallas reales de Home Assistant, pero respetan el flujo que HABRO debe seguir.','As representações da interface deste guia foram construídas em HTML para explicar o processo. Não substituem os ecrãs reais do Home Assistant, mas respeitam o fluxo que a HABRO deve seguir.'],
    ['Entrada','Entrada'],
    ['Abres HABRO y eliges “Instalar”.','Abres a HABRO e escolhes “Instalar”.'],
    ['Abres HABRO y eliges “Instalar”.','Abre a HABRO e escolhe “Instalar”.'],
    ['La puerta de entrada para el usuario es','A porta de entrada para o utilizador é'],
    ['En la portada verás el logo de HABRO, el saludo y dos opciones:','Na página inicial verás o logótipo da HABRO, a saudação e duas opções:'],
    ['. En la portada verás el logo de HABRO, el saludo y dos opciones:','. Na página inicial verá o logótipo da HABRO, a saudação e duas opções:'],
    ['o','ou'],
    ['Acceder','Aceder'],
    ['Para una primera instalación, pulsa','Para uma primeira instalação, toca em'],
    ['Para una primera instalación, pulsa','Para uma primeira instalação, toque em'],
    ['HABRO explicará que necesita conectarse a tu Home Assistant para continuar.','A HABRO explicará que precisa de se ligar ao teu Home Assistant para continuar.'],
    ['. HABRO explicará que necesita conectarse a tu Home Assistant para continuar.','. A HABRO explicará que precisa de se ligar ao seu Home Assistant para continuar.'],
    ['. HABRO te explicará que necesita conectarse con tu Home Assistant para continuar.','. A HABRO explicará que precisa de se ligar ao teu Home Assistant para continuar.'],
    ['TÚ','TU'],
    ['Solo haces una cosa:','Só tens de fazer uma coisa:'],
    ['pulsar','tocar em'],
    ['¿qué quieres hacer?','o que queres fazer?'],
    ['Home Assistant te pide permiso.','O Home Assistant pede-te autorização.'],
    ['HABRO te lleva a Home Assistant. Si no tienes una sesión abierta, tendrás que iniciar sesión. Home Assistant puede mostrar confirmaciones administrativas para confiar en el repositorio e instalar HABRO Installer.','A HABRO leva-te ao Home Assistant. Se não tiveres uma sessão aberta, terás de iniciar sessão. O Home Assistant pode apresentar confirmações administrativas para confiar no repositório e instalar o HABRO Installer.'],
    ['HABRO te llevará a Home Assistant. Si no tienes una sesión abierta, iniciarás sesión. Home Assistant puede mostrar confirmaciones administrativas para confiar en el repositorio e instalar HABRO Installer.','A HABRO leva-te ao Home Assistant. Se não tiveres uma sessão aberta, terás de iniciar sessão. O Home Assistant pode apresentar confirmações administrativas para confiar no repositório e instalar o HABRO Installer.'],
    ['Estas confirmaciones no son un error: son la forma en que Home Assistant te pide autorización antes de permitir una instalación.','Estas confirmações não são um erro: são a forma de o Home Assistant pedir autorização antes de permitir uma instalação.'],
    ['Autentícate y acepta las confirmaciones','Autentica-te e aceita as confirmações'],
    ['que muestre Home Assistant.','apresentadas pelo Home Assistant.'],
    ['que Home Assistant muestre.','apresentadas pelo Home Assistant.'],
    ['Conectar con Home Assistant','Ligar ao Home Assistant'],
    ['Home Assistant confirmará que autorizas el acceso necesario para preparar HABRO.','O Home Assistant confirmará que autorizas o acesso necessário para preparar a HABRO.'],
    ['Home Assistant confirmará que autorizas el acceso necesario para preparar HABRO.','O Home Assistant vai confirmar que autorizas o acesso necessário para preparar a HABRO.'],
    ['Home Assistant va a confirmar que autorizas el acceso necesario para preparar HABRO.','O Home Assistant vai confirmar que autorizas o acesso necessário para preparar a HABRO.'],
    ['Conexión segura','Ligação segura'],
    ['La autorización ocurre en Home Assistant.','A autorização é realizada no Home Assistant.'],
    ['La autorización se realiza en Home Assistant.','A autorização é realizada no Home Assistant.'],
    ['Confirmación administrativa','Confirmação administrativa'],
    ['Home Assistant puede pedirte aceptar el repositorio y la instalación.','O Home Assistant pode pedir-te que aceites o repositório e a instalação.'],
    ['Continuar en Home Assistant','Continuar no Home Assistant'],
    ['Instalas HABRO Installer.','Instalas o HABRO Installer.'],
    ['Home Assistant abrirá la ficha exacta de','O Home Assistant abrirá a página exata do'],
    ['No deberías tener que buscarlo manualmente.','Não deverás ter de o procurar manualmente.'],
    ['. No deberías tener que buscarlo manualmente.','. Não deverás ter de o procurar manualmente.'],
    ['Mientras el Installer conserve el modo de arranque manual, deja','Enquanto o Installer mantiver o modo de arranque manual, deixa'],
    ['“Iniciar en el arranque” desactivado','“Iniciar no arranque” desativado'],
    ['El recorrido previsto es:','O percurso previsto é:'],
    ['. El recorrido previsto es:','. O percurso previsto é:'],
    ['Instalar → Iniciar → Abrir interfaz web','Instalar → Iniciar → Abrir interface Web'],
    ['Instala, inicia y abre la interfaz web.','Instala, inicia e abre a interface Web.'],
    ['No necesitas configurar nada técnico.','Não precisas de configurar nada técnico.'],
    ['BRO te acompaña:','O BRO acompanha-te:'],
    ['“Iniciar en el arranque” no instala HABRO por sí solo. Déjalo desactivado.','“Iniciar no arranque” não instala a HABRO por si só. Deixa esta opção desativada.'],
    ['Aplicación de Home Assistant para preparar HABRO.','Aplicação do Home Assistant para preparar a HABRO.'],
    ['PRIMERO','PRIMEIRO'],
    ['DESPUÉS','DEPOIS'],
    ['Abrir interfaz web','Abrir interface Web'],
    ['CONTINUAR','CONTINUAR'],
    ['“Iniciar en el arranque” permanece desactivado.','“Iniciar no arranque” permanece desativado.'],
    ['HABRO revisa tu sistema.','A HABRO verifica o teu sistema.'],
    ['Una vez dentro del Installer, HABRO comprueba compatibilidad, detecta EBRO Auto y HABRO Companion, verifica los paquetes y prepara la operación.','Uma vez dentro do Installer, a HABRO verifica a compatibilidade, deteta EBRO Auto e HABRO Companion, verifica os pacotes e prepara a operação.'],
    ['Este análisis es automático. Si tu sistema ya está listo, no realizará cambios innecesarios. Si necesita instalar, actualizar o reparar, preparará el siguiente paso.','Esta análise é automática. Se o teu sistema já estiver pronto, não fará alterações desnecessárias. Se precisar de instalar, atualizar ou reparar, preparará o passo seguinte.'],
    ['Trabaja solo.','Trabalha de forma autónoma.'],
    ['Tú observas el estado y esperas el resultado del diagnóstico.','Tu observas o estado e aguardas o resultado do diagnóstico.'],
    ['Estado de HABRO','Estado da HABRO'],
    ['Comprobando el sistema y preparando una operación segura.','A verificar o sistema e a preparar uma operação segura.'],
    ['Home Assistant conectado','Home Assistant ligado'],
    ['Sistema compatible','Sistema compatível'],
    ['Paquetes verificados','Pacotes verificados'],
    ['Destino comprobado','Destino verificado'],
    ['Seguridad','Segurança'],
    ['Se prepara una copia recuperable.','É preparada uma cópia recuperável.'],
    ['Antes de modificar los componentes activos, HABRO verifica los paquetes y conserva el estado necesario para poder recuperar la instalación si la comprobación final falla.','Antes de modificar os componentes ativos, a HABRO verifica os pacotes e conserva o estado necessário para recuperar a instalação se a verificação final falhar.'],
    ['Después de mostrarte qué va a hacer, HABRO te pide','Depois de te mostrar o que vai fazer, a HABRO pede-te'],
    ['una única confirmación clara','uma única confirmação clara'],
    ['para ejecutar la instalación o reparación preparada.','para executar a instalação ou reparação preparada.'],
    ['Revisa y confirma una vez.','Revê e confirma uma vez.'],
    ['La mutación no debe empezar antes de tu aprobación.','A alteração não começa antes da tua aprovação.'],
    ['Todo preparado','Tudo preparado'],
    ['Paquetes, destino y recuperación verificados.','Pacotes, destino e recuperação verificados.'],
    ['Copia recuperable preparada','Cópia recuperável preparada'],
    ['HABRO puede volver al estado anterior si la verificación final no es correcta.','A HABRO pode voltar ao estado anterior se a verificação final não estiver correta.'],
    ['Confirmar e instalar','Confirmar e instalar'],
    ['Instalación','Instalação'],
    ['HABRO instala y Home Assistant se reinicia.','A HABRO instala e o Home Assistant reinicia.'],
    ['Después de tu confirmación, HABRO aplica los componentes y Home Assistant se reinicia. Durante unos minutos puedes perder la pantalla del Installer o ver que Home Assistant todavía no está disponible.','Depois da tua confirmação, a HABRO aplica os componentes e o Home Assistant reinicia. Durante alguns minutos podes perder o ecrã do Installer ou ver que o Home Assistant ainda não está disponível.'],
    ['No vuelvas a pulsar instalar.','Não voltes a tocar em instalar.'],
    ['El proceso conserva su estado y debe reanudarse desde el mismo journal cuando vuelvas a abrir HABRO Installer.','O processo conserva o seu estado e retoma a partir do mesmo registo quando voltares a abrir o HABRO Installer.'],
    ['Esperas.','Aguardas.'],
    ['Si la pantalla se cierra, vuelve a','Se o ecrã fechar, volta a'],
    ['Ajustes → Aplicaciones → HABRO Installer → Abrir interfaz web','Definições → Aplicações → HABRO Installer → Abrir interface Web'],
    ['Este es el momento que más confianza necesita:','Este é o momento que exige mais confiança:'],
    ['que Home Assistant se reinicie es parte normal del proceso. Volver a abrir el Installer recupera el progreso; no repite la instalación.','o reinício do Home Assistant é uma parte normal do processo. Voltar a abrir o Installer recupera o progresso; não repete a instalação.'],
    ['Instalando HABRO…','A instalar a HABRO…'],
    ['Descargando y verificando','A descarregar e verificar'],
    ['Completado','Concluído'],
    ['Instalando componentes','A instalar componentes'],
    ['Aplicando configuración','A aplicar a configuração'],
    ['Reiniciando Home Assistant','A reiniciar o Home Assistant'],
    ['Puede tardar varios minutos','Pode demorar alguns minutos'],
    ['Verificación final','Verificação final'],
    ['Pendiente','Pendente'],
    ['Si Home Assistant cierra esta pantalla:','Se o Home Assistant fechar este ecrã:'],
    ['Ajustes → Aplicaciones → HABRO Installer → Abrir interfaz web.','Definições → Aplicações → HABRO Installer → Abrir interface Web.'],
    ['Conectas tu cuenta de EBRO.','Ligas a tua conta EBRO.'],
    ['Cuando los componentes estén instalados, HABRO abrirá el','Quando os componentes estiverem instalados, a HABRO abrirá o'],
    ['config flow oficial de EBRO','fluxo de configuração oficial da EBRO'],
    ['fuera del iframe del Installer.','fora do iframe do Installer.'],
    ['Las credenciales de EBRO se introducen únicamente ahí. Si HABRO identifica un único vehículo con suficiente confianza, lo seleccionará automáticamente; si hay ambigüedad, te preguntará.','As credenciais EBRO são introduzidas exclusivamente aí. Se a HABRO identificar um único veículo com confiança suficiente, seleciona-o automaticamente; se houver ambiguidade, pergunta-te.'],
    ['Introduces tus credenciales EBRO','Introduzes as tuas credenciais EBRO'],
    ['y solo eliges vehículo si realmente hace falta.','e só escolhes o veículo se for realmente necessário.'],
    ['Conectar EBRO','Ligar EBRO'],
    ['Introduce tus datos únicamente en el formulario oficial de Home Assistant.','Introduz os teus dados exclusivamente no formulário oficial do Home Assistant.'],
    ['Correo / usuario EBRO','E-mail / utilizador EBRO'],
    ['Contraseña','Palavra-passe'],
    ['Las credenciales EBRO no se introducen en la web de HABRO ni en una pantalla simulada del Installer.','As credenciais EBRO não são introduzidas no site da HABRO nem num ecrã simulado do Installer.'],
    ['Ves “HABRO está listo”.','Vês “A HABRO está pronta”.'],
    ['El recorrido termina cuando','O percurso termina quando'],
    ['EBRO Auto y HABRO Companion están conectados y cargados','EBRO Auto e HABRO Companion estão ligados e carregados'],
    ['Ese es el estado que indica que ya no queda configuración técnica pendiente.','Esse é o estado que indica que não resta nenhuma configuração técnica pendente.'],
    ['. Ese es el estado que indica que ya no queda configuración técnica pendiente.','. Esse é o estado que indica que não resta nenhuma configuração técnica pendente.'],
    ['Desde ahí puedes cerrar HABRO Installer y volver a la aplicación.','A partir daí, podes fechar o HABRO Installer e voltar à aplicação.'],
    ['Te lo dice de forma inequívoca:','Indica-o de forma inequívoca:'],
    ['“HABRO está listo”.','“A HABRO está pronta”.'],
    ['HABRO está listo.','A HABRO está pronta.'],
    ['EBRO Auto y HABRO Companion están conectados y cargados.','EBRO Auto e HABRO Companion estão ligados e carregados.'],
    ['No necesitas configurar nada más. Ya puedes cerrar HABRO Installer.','Não precisas de configurar mais nada. Já podes fechar o HABRO Installer.'],
    ['Acceso diario','Acesso diário'],
    ['Añades HABRO a tu pantalla de inicio.','Adicionas a HABRO ao ecrã principal.'],
    ['Cuando HABRO ya está lista, puedes añadir la PWA a la pantalla de inicio para abrirla como una app. En navegadores compatibles aparecerá el diálogo de instalación; en iPhone/iPad verás la guía para usar','Quando a HABRO estiver pronta, podes adicionar a PWA ao ecrã principal para a abrir como uma app. Nos navegadores compatíveis aparecerá a caixa de instalação; no iPhone/iPad verás o guia para utilizar'],
    ['Compartir → Añadir a pantalla de inicio → Añadir','Partilhar → Adicionar ao ecrã principal → Adicionar'],
    ['Opcional:','Opcional:'],
    ['añades HABRO a Inicio y, a partir de ahí, accedes desde su icono.','adicionas a HABRO ao ecrã principal e, a partir daí, acedes através do respetivo ícone.'],
    ['Añadir HABRO a pantalla de inicio','Adicionar a HABRO ao ecrã principal'],
    ['En iPhone/iPad: Compartir → Añadir a pantalla de inicio → Añadir.','No iPhone/iPad: Partilhar → Adicionar ao ecrã principal → Adicionar.'],
    ['Abrir HABRO','Abrir a HABRO'],
    ['Ahora puedes entrar en HABRO.','Agora podes entrar na HABRO.'],
    ['Accede a la versión de distribución de la app para comenzar el proceso. Esta guía seguirá aquí para que puedas volver a cualquier paso y preguntarle a BRO siempre que lo necesites.','Acede à versão de distribuição da app para iniciar o processo. Este guia continuará aqui para poderes voltar a qualquer passo e perguntar ao BRO sempre que precisares.'],
    ['Acceder a HABRO','Aceder à HABRO'],
    ['Se abrirá app.habroremote.com','Será aberto app.habroremote.com'],
    ['Qué puedes esperar','O que podes esperar'],
    ['Los momentos que pueden parecer raros… son normales.','Os momentos que podem parecer estranhos… são normais.'],
    ['Home Assistant te pide varias confirmaciones.','O Home Assistant pede-te várias confirmações.'],
    ['Forma parte del mecanismo de confianza para instalar el bootstrap.','Faz parte do mecanismo de confiança para instalar o bootstrap.'],
    ['Home Assistant se reinicia.','O Home Assistant reinicia.'],
    ['La pantalla puede desaparecer durante unos minutos. No repitas la instalación.','O ecrã pode desaparecer durante alguns minutos. Não repitas a instalação.'],
    ['Tienes que volver a HABRO Installer.','Tens de voltar ao HABRO Installer.'],
    ['Si se cerró el WebView: Ajustes → Aplicaciones → HABRO Installer → Abrir interfaz web.','Se a WebView tiver fechado: Definições → Aplicações → HABRO Installer → Abrir interface Web.'],
    ['Las credenciales EBRO aparecen al final.','As credenciais EBRO aparecem no final.'],
    ['Se introducen exclusivamente en el config flow oficial de Home Assistant.','São introduzidas exclusivamente no fluxo de configuração oficial do Home Assistant.'],
    ['El final es inequívoco.','O final é inequívoco.'],
    ['Solo cuando veas “HABRO está listo” puedes considerar terminado el proceso.','Só quando vires “A HABRO está pronta” podes considerar o processo concluído.'],
    ['Guía visual de instalación · HABRO','Guia visual de instalação · HABRO']
  ];

  const lookup=new Map();
  pairs.forEach(([es,pt])=>{lookup.set(es,{es,pt});lookup.set(pt,{es,pt})});
  const translatedNodes=[];

  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(node){
    if(!node.parentElement||['SCRIPT','STYLE','NOSCRIPT'].includes(node.parentElement.tagName))return NodeFilter.FILTER_REJECT;
    return lookup.has(node.nodeValue.trim())?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  let node;
  while((node=walker.nextNode())){
    const value=node.nodeValue;
    const trimmed=value.trim();
    translatedNodes.push({node,pair:lookup.get(trimmed),leading:value.slice(0,value.indexOf(trimmed)),trailing:value.slice(value.indexOf(trimmed)+trimmed.length)});
  }
  window.HABRO_GUIDE_I18N={translatedNodes};

  const languageButton=document.querySelector('[data-language-toggle]');
  const metaDescription=document.querySelector('meta[name="description"]');
  const setLanguage=lang=>{
    const safe=lang==='pt'?'pt':'es';
    document.documentElement.lang=safe==='pt'?'pt-PT':'es';
    translatedNodes.forEach(item=>{item.node.nodeValue=item.leading+item.pair[safe]+item.trailing});
    document.title=safe==='pt'?'Instalar a HABRO · Guia visual':'Instalar HABRO · Guía visual';
    if(metaDescription)metaDescription.content=safe==='pt'?'Manual visual passo a passo para instalar a HABRO no Home Assistant.':'Manual visual paso a paso para instalar HABRO en Home Assistant.';
    if(languageButton){
      languageButton.textContent=safe==='pt'?'ES':'PT';
      languageButton.setAttribute('aria-label',safe==='pt'?'Mudar para espanhol':'Cambiar a portugués');
    }
    try{localStorage.setItem('habro-marketing-lang',safe)}catch(_){}
    window.dispatchEvent(new CustomEvent('habro:language-change',{detail:{language:safe}}));
  };

  let initial='es';
  try{initial=localStorage.getItem('habro-marketing-lang')==='pt'?'pt':'es'}catch(_){}
  setLanguage(initial);
  languageButton?.addEventListener('click',()=>setLanguage(document.documentElement.lang.startsWith('pt')?'es':'pt'));
})();
