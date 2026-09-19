(() => {
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  const API='/api/analytics/event', CLIENT_KEY='habro_analytics_client_id_v1', INSTALL_KEY='habro_pwa_installed_v1', SESSION_KEY='habro_analytics_session_id_v1', PWA_SESSION_KEY='habro_pwa_session_sent_v1';
  const uuid=()=>{try{return crypto.randomUUID()}catch(_){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}};
  const getOrCreate=(storage,key)=>{try{let v=storage.getItem(key);if(!v){v=uuid();storage.setItem(key,v)}return v}catch(_){return uuid()}};
  const clientId=getOrCreate(localStorage,CLIENT_KEY), sessionId=getOrCreate(sessionStorage,SESSION_KEY);
  function detect(){const ua=navigator.userAgent||'';let os='Other';if(/iPhone|iPad|iPod/i.test(ua))os='iOS';else if(/Android/i.test(ua))os='Android';else if(/Windows/i.test(ua))os='Windows';else if(/Macintosh|Mac OS X/i.test(ua))os='macOS';else if(/Linux/i.test(ua))os='Linux';let browser='Other';if(/Edg\//i.test(ua))browser='Edge';else if(/CriOS|Chrome\//i.test(ua))browser='Chrome';else if(/FxiOS|Firefox\//i.test(ua))browser='Firefox';else if(/Safari\//i.test(ua))browser='Safari';let device='desktop';if(/iPad|Tablet/i.test(ua))device='tablet';else if(/Mobi|iPhone|Android/i.test(ua))device='mobile';const standalone=Boolean((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true);return{os,browser,device,standalone}}
  const base=detect();
  function send(type,extra={}){const payload=JSON.stringify({type,clientId,sessionId,path:location.pathname.slice(0,160),...base,...extra});try{if(navigator.sendBeacon){const blob=new Blob([payload],{type:'application/json'});if(navigator.sendBeacon(API,blob))return}}catch(_){}fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true,credentials:'same-origin'}).catch(()=>{})}
  send('visit');send('page_view');
  if(base.standalone){try{if(sessionStorage.getItem(PWA_SESSION_KEY)!=='1'){sessionStorage.setItem(PWA_SESSION_KEY,'1');send('pwa_launch')}}catch(_){send('pwa_launch')}try{if(localStorage.getItem(INSTALL_KEY)!=='1'){localStorage.setItem(INSTALL_KEY,'1');send('pwa_first_standalone_launch')}}catch(_){send('pwa_first_standalone_launch')}}
  window.addEventListener('beforeinstallprompt',()=>send('install_available'),{once:true});
  window.addEventListener('appinstalled',()=>{try{localStorage.setItem(INSTALL_KEY,'1')}catch(_){}send('pwa_installed')},{once:true});
})();