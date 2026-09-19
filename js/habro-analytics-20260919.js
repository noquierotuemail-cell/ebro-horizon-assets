(() => {
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  const API='/api/analytics/event';
  const CLIENT_KEY='habro_analytics_client_id_v1';
  const INSTALL_KEY='habro_pwa_installed_v1';
  const SESSION_KEY='habro_analytics_session_id_v1';
  const PWA_SESSION_KEY='habro_pwa_session_sent_v1';
  const FIRST_SOURCE_KEY='habro_analytics_first_source_v1';
  const LAST_SOURCE_KEY='habro_analytics_last_source_v1';
  const SESSION_SOURCE_KEY='habro_analytics_session_source_v1';

  const uuid=()=>{try{return crypto.randomUUID()}catch(_){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}};
  const getOrCreate=(storage,key)=>{try{let v=storage.getItem(key);if(!v){v=uuid();storage.setItem(key,v)}return v}catch(_){return uuid()}};
  const clean=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'_').slice(0,64);

  const clientId=getOrCreate(localStorage,CLIENT_KEY);
  const sessionId=getOrCreate(sessionStorage,SESSION_KEY);

  function cookieSource(){
    try{
      const m=document.cookie.match(/(?:^|;\s*)habro_campaign_source=([^;]+)/);
      return m ? clean(decodeURIComponent(m[1])) : '';
    }catch(_){return ''}
  }

  function classifyReferrer(){
    try{
      const r=document.referrer?new URL(document.referrer):null;
      if(!r)return 'direct';
      const host=r.hostname.toLowerCase();
      if(host.includes('linkedin.'))return 'linkedin';
      if(host.includes('tiktok.'))return 'tiktok';
      if(host.includes('google.'))return 'google';
      if(host.includes('facebook.')||host.includes('fb.'))return 'facebook';
      if(host.includes('instagram.'))return 'instagram';
      if(host===location.hostname)return 'internal';
      return clean(host.replace(/^www\./,''))||'referral';
    }catch(_){return 'direct'}
  }

  function sourceContext(){
    const params=new URLSearchParams(location.search);
    const explicitSource=clean(params.get('utm_source'));
    const explicitMedium=clean(params.get('utm_medium'));
    const explicitCampaign=clean(params.get('utm_campaign'));
    const brandedSource=cookieSource();
    const detected=explicitSource||brandedSource||classifyReferrer();

    let sessionSource=detected;
    try{
      const saved=sessionStorage.getItem(SESSION_SOURCE_KEY);
      if(explicitSource||detected!=='direct'||!saved){
        sessionStorage.setItem(SESSION_SOURCE_KEY,detected);
      }else{
        sessionSource=saved;
      }
    }catch(_){}

    const source=sessionSource||'direct';
    const medium=explicitMedium||((source==='direct'||source==='internal')?'none':'referral');
    const campaign=explicitCampaign||'none';

    let firstSource=source;
    try{
      const saved=localStorage.getItem(FIRST_SOURCE_KEY);
      if(saved){
        firstSource=saved;
      }else if(source!=='internal'){
        localStorage.setItem(FIRST_SOURCE_KEY,source);
      }
      if(source!=='direct'&&source!=='internal')localStorage.setItem(LAST_SOURCE_KEY,source);
    }catch(_){}

    let lastSource=source;
    try{lastSource=localStorage.getItem(LAST_SOURCE_KEY)||source}catch(_){}

    return {source,medium,campaign,firstSource,lastSource};
  }

  function detect(){
    const ua=navigator.userAgent||'';
    let os='Other';
    if(/iPhone|iPad|iPod/i.test(ua))os='iOS';
    else if(/Android/i.test(ua))os='Android';
    else if(/Windows/i.test(ua))os='Windows';
    else if(/Macintosh|Mac OS X/i.test(ua))os='macOS';
    else if(/Linux/i.test(ua))os='Linux';

    let browser='Other';
    if(/Edg\//i.test(ua))browser='Edge';
    else if(/CriOS|Chrome\//i.test(ua))browser='Chrome';
    else if(/FxiOS|Firefox\//i.test(ua))browser='Firefox';
    else if(/Safari\//i.test(ua))browser='Safari';

    let device='desktop';
    if(/iPad|Tablet/i.test(ua))device='tablet';
    else if(/Mobi|iPhone|Android/i.test(ua))device='mobile';

    const standalone=Boolean((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true);
    return{os,browser,device,standalone};
  }

  const base=detect();
  const attribution=sourceContext();

  function send(type,extra={}){
    const payload=JSON.stringify({
      type,clientId,sessionId,path:location.pathname.slice(0,160),
      ...base,...attribution,...extra
    });
    try{
      if(navigator.sendBeacon){
        const blob=new Blob([payload],{type:'application/json'});
        if(navigator.sendBeacon(API,blob))return;
      }
    }catch(_){}
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true,credentials:'same-origin'}).catch(()=>{});
  }

  send('visit');
  send('page_view');

  if(base.standalone){
    try{
      if(sessionStorage.getItem(PWA_SESSION_KEY)!=='1'){
        sessionStorage.setItem(PWA_SESSION_KEY,'1');
        send('pwa_launch');
      }
    }catch(_){send('pwa_launch')}
    try{
      if(localStorage.getItem(INSTALL_KEY)!=='1'){
        localStorage.setItem(INSTALL_KEY,'1');
        send('pwa_first_standalone_launch',{installAttribution:attribution.lastSource||attribution.firstSource||attribution.source});
      }
    }catch(_){
      send('pwa_first_standalone_launch',{installAttribution:attribution.lastSource||attribution.firstSource||attribution.source});
    }
  }

  window.addEventListener('beforeinstallprompt',()=>send('install_available'),{once:true});
  window.addEventListener('appinstalled',()=>{
    try{localStorage.setItem(INSTALL_KEY,'1')}catch(_){}
    send('pwa_installed',{installAttribution:attribution.lastSource||attribution.firstSource||attribution.source});
  },{once:true});
})();