// Private management and self-service forms. No credentials stored in the browser.
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body)=>new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+escape(title)+' · HABRO</title><style>body{font:16px system-ui;max-width:850px;margin:30px auto;padding:18px;background:#f6f7f9;color:#151515}main,section{background:white;border:1px solid #d8dce2;border-radius:16px;padding:22px;margin:16px 0}input,button,select{font:inherit;padding:12px;margin:6px 0;max-width:100%;box-sizing:border-box}input{width:100%;border:1px solid #aab2bd;border-radius:9px}button{background:#087dff;color:white;border:0;border-radius:9px;cursor:pointer}table{width:100%;border-collapse:collapse;overflow-wrap:anywhere}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}label{display:block;margin-top:12px}code{overflow-wrap:anywhere}a{color:#076fe2}</style><main><h1>'+escape(title)+'</h1>'+body+'</main></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
const validOrigin=req=>{const origin=req.headers.get('Origin');return origin===new URL(req.url).origin;};
const validVin=v=>/^[A-HJ-NPR-Z0-9]{17}$/.test(String(v||'').trim().toUpperCase());
export async function vinPanel(request,env,call){
  const url=new URL(request.url),admin=url.pathname==='/admin/adb-vin';
  const base=admin?'/admin/adb-vin':'/adb/solicitar';
  if(request.method==='GET'){
    if(!admin)return page('Acceso ADB con Telegram','<p>Introduce el VIN de tu EBRO y tu usuario de Telegram. Comprobaremos que perteneces al grupo autorizado. No necesitas solicitar un token a un administrador.</p><form method="post"><input type="hidden" name="action" value="start"><label>VIN completo (17 caracteres)<input name="vin" required minlength="17" maxlength="17" autocomplete="off" autocapitalize="characters"></label><label>Tu usuario de Telegram (por ejemplo @usuario)<input name="username" required autocomplete="off" placeholder="@usuario"></label><button>Continuar con Telegram</button></form>');
    return page('Gestión privada de VIN y accesos','<p>Introduce tu clave de administrador para consultar vehículos y registrar nuevos. El acceso de tu compañero utiliza una clave distinta.</p><form method="post"><input type="hidden" name="action" value="list"><label>Clave de administración<input type="password" name="password" required autocomplete="off"></label><button>Acceder al panel</button></form>');
  }
  if(request.method!=='POST'||!validOrigin(request))return new Response('Forbidden',{status:403});
  let f;try{f=await request.formData();}catch{return new Response('Bad request',{status:400});}
  if(!admin){
    const action=String(f.get('action')||'start');
    if(action==='start'){
      const vin=String(f.get('vin')||'').trim().toUpperCase(),username=String(f.get('username')||'').trim();
      if(!validVin(vin))return page('Revisa el VIN','<p>El VIN debe tener 17 caracteres.</p><a href="/adb/solicitar">Volver</a>');
      if(!env.HABRO_TELEGRAM_BOT_USERNAME||!env.HABRO_TELEGRAM_BOT_TOKEN||!env.HABRO_TELEGRAM_GROUP_ID||!env.HABRO_TELEGRAM_WEBHOOK_SECRET)return page('Servicio pendiente de activación','<p>La verificación de Telegram todavía no está configurada.</p>');
      const {response,data}=await call(env,'/telegram/start',{vin,username,ip:request.headers.get('CF-Connecting-IP')||''});
      if(!response.ok)return page('No se pudo iniciar','<p>Revisa el VIN y el usuario de Telegram, o inténtalo más tarde.</p><a href="/adb/solicitar">Volver</a>');
      const bot=String(env.HABRO_TELEGRAM_BOT_USERNAME).replace(/^@/,'');
      const link='https://t.me/'+encodeURIComponent(bot)+'?start='+data.nonce;
      return page('Confirma tu Telegram','<p>1. Pulsa el botón para abrir Telegram.</p><p>2. En el chat con el bot, pulsa <strong>Iniciar</strong> o <strong>Start</strong>.</p><p>3. Cuando el bot confirme tu pertenencia al grupo, vuelve a esta pantalla.</p><p><a href="'+escape(link)+'" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px;background:#087dff;color:#fff;border-radius:10px">Abrir Telegram y verificarme</a></p><form method="post"><input type="hidden" name="action" value="poll"><input type="hidden" name="nonce" value="'+escape(data.nonce)+'"><input type="hidden" name="browserSecret" value="'+escape(data.browserSecret)+'"><button>Ya he confirmado en Telegram · Continuar</button></form><p>La verificación caduca a los cinco minutos. Si caduca, <a href="/adb/solicitar">inicia otra solicitud</a>.</p>');
    }
    if(action==='poll'){
      const nonce=String(f.get('nonce')||''),browserSecret=String(f.get('browserSecret')||'');
      const {response,data}=await call(env,'/telegram/poll',{nonce,browserSecret});
      if(response.ok&&data?.token)return {token:data.token};
      if(response.ok&&data?.status==='pending')return page('Esperando a Telegram','<p>La confirmación aún no ha llegado. Abre el bot, pulsa Iniciar y después vuelve aquí.</p><form method="post"><input type="hidden" name="action" value="poll"><input type="hidden" name="nonce" value="'+escape(nonce)+'"><input type="hidden" name="browserSecret" value="'+escape(browserSecret)+'"><button>Comprobar de nuevo</button></form>');
      if(data?.error==='vin_token_limit')return page('Límite de accesos alcanzado','<p>Este VIN ya ha recibido los dos tokens de acceso permitidos. Para solicitar otro, escribe en el grupo de Telegram de HABRO. Un administrador podrá revisar tu solicitud.</p><a href="/adb/solicitar">Volver al acceso</a>');
      return page('Solicitud caducada','<p>Vuelve a iniciar la verificación.</p><a href="/adb/solicitar">Empezar de nuevo</a>');
    }
    return new Response('Bad request',{status:400});
  }
  const password=String(f.get('password')||'');
  const owner=String(env.HABRO_ADB_OWNER_TOKEN||'');
  const collaborator=String(env.HABRO_ADB_COLLABORATOR_TOKEN||'');
  const actor=owner&&password===owner?'propietario':collaborator&&password===collaborator?'colaborador':null;
  if(!actor)return page('Acceso denegado','<p>Clave de administración incorrecta.</p><a href="/admin/adb-vin">Volver</a>');
  const action=String(f.get('action')||'list'),vin=String(f.get('vin')||'').trim().toUpperCase();
  let info='';
  if(['enroll','disable','enable','rotate','grant'].includes(action)){
    if(!validVin(vin))info='<p>VIN no válido: introduce los 17 caracteres.</p>';
    else{
      const endpoint=action==='enroll'?'/vin/enroll':action==='rotate'?'/vin/rotate':action==='grant'?'/vin/grant':'/vin/status';
      const {response,data}=await call(env,endpoint,{vin,label:String(f.get('label')||''),enabled:action==='enable',actor});
      info=response.ok?'<p>Operación realizada para '+escape(vin)+'.</p>':'<p>No se pudo completar la operación: '+escape(data?.error||'error')+'.</p>';
      if(response.ok&&data.enrollmentKey)info+='<section><strong>Clave privada de alta (mostrar una sola vez)</strong><p>Entrégala al titular por un canal seguro. No aparecerá de nuevo en el historial.</p><code>'+escape(data.enrollmentKey)+'</code></section>';
    }
  }
  const {data}=await call(env,'/vin/list',{});
  const vehicles=data?.vehicles||[],events=data?.events||[];
  const rows=vehicles.map(v=>'<tr><td>'+escape(v.vin)+'</td><td>'+escape(v.label)+'</td><td>'+(v.enabled?'Activo':'Bloqueado')+'</td><td>'+Number(v.issued||0)+' / '+Number(v.issueLimit??2)+'</td></tr>').join('');
  const history=events.slice(0,100).map(e=>'<tr><td>'+escape(new Date(e.at).toLocaleString('es-ES'))+'</td><td>'+escape(e.vin)+'</td><td>'+escape(e.event)+'</td><td>'+escape(e.actor)+'</td></tr>').join('');
  const auth='<label>Clave de administración (necesaria para cada operación)<input type="password" name="password" required autocomplete="off"></label>';
  return page('Gestión privada de VIN y accesos',info+'<p>Cuenta: '+escape(actor)+'. Los tokens no se muestran completos en el historial.</p><section><h2>Registrar o gestionar vehículo</h2><form method="post">'+auth+'<label>VIN<input name="vin" required maxlength="17"></label><label>Identificador opcional<input name="label" maxlength="80"></label><label>Acción<select name="action"><option value="enroll">Registrar y crear clave privada</option><option value="disable">Bloquear VIN y sesiones</option><option value="enable">Reactivar VIN</option><option value="rotate">Renovar clave privada y revocar sesiones</option><option value="grant">Autorizar un token adicional</option><option value="list">Actualizar listado</option></select></label><button>Confirmar</button></form></section><section><h2>Vehículos</h2><div style="overflow:auto"><table><tr><th>VIN</th><th>Etiqueta</th><th>Estado</th><th>Tokens emitidos / límite</th></tr>'+rows+'</table></div></section><section><h2>Historial reciente</h2><div style="overflow:auto"><table><tr><th>Fecha</th><th>VIN</th><th>Evento</th><th>Actor</th></tr>'+history+'</table></div></section>');
}
