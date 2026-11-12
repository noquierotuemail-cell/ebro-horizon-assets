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
