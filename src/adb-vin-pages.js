// Private management and self-service forms. No credentials stored in the browser.
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body)=>new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+escape(title)+' · HABRO</title><style>body{font:16px system-ui;max-width:850px;margin:30px auto;padding:18px;background:#f6f7f9;color:#151515}main,section{background:white;border:1px solid #d8dce2;border-radius:16px;padding:22px;margin:16px 0}input,button,select{font:inherit;padding:12px;margin:6px 0;max-width:100%;box-sizing:border-box}input{width:100%;border:1px solid #aab2bd;border-radius:9px}button{background:#087dff;color:white;border:0;border-radius:9px;cursor:pointer}table{width:100%;border-collapse:collapse;overflow-wrap:anywhere}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}label{display:block;margin-top:12px}code{overflow-wrap:anywhere}a{color:#076fe2}</style><main><h1>'+escape(title)+'</h1>'+body+'</main></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
const validOrigin=req=>{const origin=req.headers.get('Origin');return origin===new URL(req.url).origin;};
const validVin=v=>/^[A-HJ-NPR-Z0-9]{17}$/.test(String(v||'').trim().toUpperCase());
export async function vinPanel(request,env,call){
  const url=new URL(request.url),admin=url.pathname==='/admin/adb-vin';
  const base=admin?'/admin/adb-vin':'/adb/solicitar';
  if(request.method==='GET'){
    if(!admin)return page('Acceso ADB por VIN','<p>Solo para vehículos previamente autorizados. Necesitas tu VIN y la clave privada de alta entregada por HABRO. El acceso dura 30 minutos.</p><form method="post"><label>VIN completo<input name="vin" required minlength="17" maxlength="17" autocomplete="off"></label><label>Clave privada de alta<input name="enrollmentKey" type="password" required minlength="64" maxlength="64" autocomplete="off"></label><button>Entrar en HABRO ADB</button></form>');
    return page('Gestión privada de VIN y accesos','<p>Introduce tu clave de administrador para consultar vehículos y registrar nuevos. El acceso de tu compañero debe utilizar una clave distinta.</p><form method="post"><input type="hidden" name="action" value="list"><label>Clave de administración<input type="password" name="password" required autocomplete="off"></label><button>Acceder al panel</button></form>');
  }
  if(request.method!=='POST'||!validOrigin(request))return new Response('Forbidden',{status:403});
  let f;try{f=await request.formData();}catch{return new Response('Bad request',{status:400});}
  if(!admin){
    const vin=String(f.get('vin')||'').trim().toUpperCase(),enrollmentKey=String(f.get('enrollmentKey')||'');
    if(!validVin(vin)||!/^[0-9a-f]{64}$/i.test(enrollmentKey))return page('Acceso no autorizado','<p>Comprueba el VIN y la clave privada.</p><a href="/adb/solicitar">Volver</a>');
    const {response,data}=await call(env,'/vin/issue',{vin,enrollmentKey,ip:request.headers.get('CF-Connecting-IP')||'unknown'});
    if(!response.ok||!data?.token)return page('Acceso no autorizado','<p>No se pudo autorizar el acceso. Comprueba los datos o espera antes de reintentar.</p><a href="/adb/solicitar">Volver</a>');
    return {token:data.token};
  }
  const password=String(f.get('password')||'');
  const owner=String(env.HABRO_ANALYTICS_ADMIN_TOKEN||'');
  const collaborator=String(env.HABRO_ADB_COLLABORATOR_TOKEN||'');
  const actor=owner&&password===owner?'propietario':collaborator&&password===collaborator?'colaborador':null;
  if(!actor)return page('Acceso denegado','<p>Clave de administración incorrecta.</p><a href="/admin/adb-vin">Volver</a>');
  const action=String(f.get('action')||'list'),vin=String(f.get('vin')||'').trim().toUpperCase();
  let info='';
  if(['enroll','disable','enable','rotate'].includes(action)){
    if(!validVin(vin))info='<p>VIN no válido: introduce los 17 caracteres.</p>';
    else{
      const endpoint=action==='enroll'?'/vin/enroll':action==='rotate'?'/vin/rotate':'/vin/status';
      const {response,data}=await call(env,endpoint,{vin,label:String(f.get('label')||''),enabled:action==='enable',actor});
      info=response.ok?'<p>Operación realizada para '+escape(vin)+'.</p>':'<p>No se pudo completar la operación: '+escape(data?.error||'error')+'.</p>';
      if(response.ok&&data.enrollmentKey)info+='<section><strong>Clave privada de alta (mostrar una sola vez)</strong><p>Entrégala al titular por un canal seguro. No aparecerá de nuevo en el historial.</p><code>'+escape(data.enrollmentKey)+'</code></section>';
    }
  }
  const {data}=await call(env,'/vin/list',{});
  const vehicles=data?.vehicles||[],events=data?.events||[];
  const rows=vehicles.map(v=>'<tr><td>'+escape(v.vin)+'</td><td>'+escape(v.label)+'</td><td>'+(v.enabled?'Activo':'Bloqueado')+'</td><td>'+Number(v.issued||0)+'</td></tr>').join('');
  const history=events.slice(0,100).map(e=>'<tr><td>'+escape(new Date(e.at).toLocaleString('es-ES'))+'</td><td>'+escape(e.vin)+'</td><td>'+escape(e.event)+'</td><td>'+escape(e.actor)+'</td></tr>').join('');
  const auth='<input type="hidden" name="password" value="'+escape(password)+'">';
  return page('Gestión privada de VIN y accesos',info+'<p>Cuenta: '+escape(actor)+'. Los tokens no se muestran completos en el historial.</p><section><h2>Registrar o gestionar vehículo</h2><form method="post">'+auth+'<label>VIN<input name="vin" required maxlength="17"></label><label>Identificador opcional<input name="label" maxlength="80"></label><label>Acción<select name="action"><option value="enroll">Registrar y crear clave privada</option><option value="disable">Bloquear VIN y sesiones</option><option value="enable">Reactivar VIN</option><option value="rotate">Renovar clave privada y revocar sesiones</option><option value="list">Actualizar listado</option></select></label><button>Confirmar</button></form></section><section><h2>Vehículos</h2><div style="overflow:auto"><table><tr><th>VIN</th><th>Etiqueta</th><th>Estado</th><th>Tokens emitidos</th></tr>'+rows+'</table></div></section><section><h2>Historial reciente</h2><div style="overflow:auto"><table><tr><th>Fecha</th><th>VIN</th><th>Evento</th><th>Actor</th></tr>'+history+'</table></div></section>');
}
