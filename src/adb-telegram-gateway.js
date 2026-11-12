// Telegram Bot API integration; all secrets are Cloudflare Worker secrets.
const noStore={'Cache-Control':'no-store'};
const fail=(error,status=400)=>Response.json({ok:false,error},{status,headers:noStore});
const api=async(env,method,payload)=>{
  const r=await fetch('https://api.telegram.org/bot'+env.HABRO_TELEGRAM_BOT_TOKEN+'/'+method,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  const data=await r.json();
  if(!r.ok||!data.ok)throw new Error('telegram_api_error');
  return data.result;
};
export async function telegramWebhook(request,env,call){
  if(request.method!=='POST')return fail('method_not_allowed',405);
  if(!env.HABRO_TELEGRAM_BOT_TOKEN||!env.HABRO_TELEGRAM_GROUP_ID||!env.HABRO_TELEGRAM_WEBHOOK_SECRET)return fail('not_configured',503);
  if(request.headers.get('X-Telegram-Bot-Api-Secret-Token')!==env.HABRO_TELEGRAM_WEBHOOK_SECRET)return fail('unauthorized',403);
  let update;try{update=await request.json();}catch{return fail('invalid_json');}
  const msg=update.message,from=msg?.from;
  if(!msg||msg.chat?.type!=='private'||!from||from.is_bot)return Response.json({ok:true},{headers:noStore});
  const match=String(msg.text||'').match(/^\/start ([a-f0-9]{32})$/);
  if(!match)return Response.json({ok:true},{headers:noStore});
  const nonce=match[1],username=String(from.username||'');
  let allowed=false;
  try{
    const member=await api(env,'getChatMember',{chat_id:env.HABRO_TELEGRAM_GROUP_ID,user_id:from.id});
    allowed=['creator','administrator','member'].includes(member.status)||(member.status==='restricted'&&member.is_member===true);
  }catch{
    await api(env,'sendMessage',{chat_id:msg.chat.id,text:'No se pudo comprobar tu pertenencia al grupo HABRO. Contacta con un administrador.'});
    return Response.json({ok:true},{headers:noStore});
  }
  if(!allowed){
    await api(env,'sendMessage',{chat_id:msg.chat.id,text:'No perteneces al grupo de Telegram autorizado para HABRO ADB.'});
    return Response.json({ok:true},{headers:noStore});
  }
  const {response,data}=await call(env,'/telegram/confirm',{nonce,telegramId:from.id,username});
  const messages={
    telegram_username_mismatch:'El usuario de Telegram no coincide con el indicado en HABRO. Vuelve a iniciar la solicitud con tu @usuario correcto.',
    vin_bound_to_other_user:'Ese VIN ya está asociado a otra cuenta. Solicita revisión a un administrador.',
    vin_disabled:'Este VIN está bloqueado. Contacta con un administrador.',
    expired:'La solicitud ha caducado. Inicia una nueva desde HABRO.'
  };
  const text=response.ok?'Identidad y pertenencia al grupo verificadas. Vuelve a la página HABRO ADB para continuar.':(messages[data?.error]||'No se pudo verificar la solicitud. Vuelve a intentarlo.');
  await api(env,'sendMessage',{chat_id:msg.chat.id,text});
  return Response.json({ok:true},{headers:noStore});
}
export async function telegramBegin(request,env,call){
  if(request.method!=='POST')return fail('method_not_allowed',405);
  if(!env.HABRO_TELEGRAM_BOT_USERNAME||!env.HABRO_TELEGRAM_BOT_TOKEN||!env.HABRO_TELEGRAM_GROUP_ID||!env.HABRO_TELEGRAM_WEBHOOK_SECRET)return fail('not_configured',503);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return fail('forbidden',403);
  let b;try{b=await request.json();}catch{return fail('invalid_json');}
  const {response,data}=await call(env,'/telegram/start',{vin:b.vin,username:b.username,ip:request.headers.get('CF-Connecting-IP')||''});
  if(!response.ok)return fail(data?.error||'invalid_input',response.status);
  return Response.json({ok:true,nonce:data.nonce,browserSecret:data.browserSecret,expiresAt:data.expiresAt,telegramUrl:'https://t.me/'+encodeURIComponent(env.HABRO_TELEGRAM_BOT_USERNAME.replace(/^@/,''))+'?start='+data.nonce},{headers:noStore});
}
export async function telegramPoll(request,env,call){
  if(request.method!=='POST')return fail('method_not_allowed',405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return fail('forbidden',403);
  let b;try{b=await request.json();}catch{return fail('invalid_json');}
  return call(env,'/telegram/poll',{nonce:b.nonce,browserSecret:b.browserSecret});
}

export async function telegramWebhookSetup(request,env){
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"};
  const render=message=>new Response('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>HABRO · Activar webhook Telegram</title><main style="max-width:550px;margin:50px auto;padding:24px;font:16px system-ui"><h1>Activar Telegram HABRO</h1><p>Registra el webhook del bot sin mostrar su token secreto. Solo el propietario puede hacerlo.</p><form method="post"><label>Clave de administrador HABRO ADB<br><input type="password" name="password" required autocomplete="off" style="width:100%;padding:12px;margin:12px 0"></label><button style="padding:14px;background:#087dff;color:white;border:0;border-radius:8px">Registrar webhook</button></form><p role="status">'+String(message||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</p></main></html>',{headers});
  if(request.method==='GET')return render('');
  if(request.method!=='POST'||request.headers.get('Origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
  if(!env.HABRO_ADB_OWNER_TOKEN||!env.HABRO_TELEGRAM_BOT_TOKEN||!env.HABRO_TELEGRAM_WEBHOOK_SECRET)return render('Faltan secretos de Cloudflare. Configura la clave de propietario y los secretos del bot.');
  let form;try{form=await request.formData();}catch{return render('Formulario no válido.');}
  if(String(form.get('password')||'')!==env.HABRO_ADB_OWNER_TOKEN)return render('Clave incorrecta.');
  try{
    const url=new URL(request.url);
    const target=url.origin+'/adb/telegram/webhook';
    const result=await api(env,'setWebhook',{url:target,secret_token:env.HABRO_TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message'],drop_pending_updates:false});
    const info=await api(env,'getWebhookInfo',{});
    return render(result&&info.url===target?'Webhook registrado correctamente. URL: '+target:'Telegram no ha confirmado la URL del webhook.');
  }catch{return render('No se ha podido registrar el webhook. Revisa permisos y configuración del bot.');}
}
