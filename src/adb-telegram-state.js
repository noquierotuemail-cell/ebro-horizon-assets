// Telegram group authentication for HABRO ADB.
// The Telegram /start deep link proves control of the Telegram account.
// The browser secret is independent of the Telegram challenge and is never sent to Telegram.
const rand=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const vinPattern=/^[A-HJ-NPR-Z0-9]{17}$/;
const usernamePattern=/^[A-Za-z0-9_]{5,32}$/;
const audit=async(storage,event,vin,id,detail='')=>storage.put('vin:audit:'+String(Date.now()).padStart(14,'0')+':'+rand().slice(0,12),{at:Date.now(),event,vin,actor:'telegram:'+id,detail});
const pendingKey=nonce=>'tg:pending:'+nonce;
export async function telegramState(storage,request){
  const path=new URL(request.url).pathname;
  let b={};try{b=await request.json();}catch{return response({ok:false,error:'invalid_json'},400);}
  const now=Date.now();
  if(path==='/telegram/start'){
    const vin=String(b.vin||'').trim().toUpperCase();
    const username=String(b.username||'').trim().replace(/^@/,'');
    if(!vinPattern.test(vin)||!usernamePattern.test(username))return response({ok:false,error:'invalid_input'},400);
    const nonce=rand().slice(0,32),browserSecret=rand();
    await storage.put(pendingKey(nonce),{vin,username:username.toLowerCase(),browserHash:await hash(browserSecret),createdAt:now,expiresAt:now+5*60_000,status:'pending',ipHash:await hash(String(b.ip||''))},{expirationTtl:360});
    return response({ok:true,nonce,browserSecret,expiresAt:now+5*60_000});
  }
  if(path==='/telegram/confirm'){
    const nonce=String(b.nonce||''),id=Number(b.telegramId),username=String(b.username||'').toLowerCase();
    if(!/^[a-f0-9]{32}$/.test(nonce)||!Number.isSafeInteger(id)||id<=0)return response({ok:false,error:'invalid_input'},400);
    const key=pendingKey(nonce),record=await storage.get(key);
    if(!record||record.status!=='pending'||record.expiresAt<=now)return response({ok:false,error:'expired'},404);
    if(record.username!==username)return response({ok:false,error:'telegram_username_mismatch'},403);
    const vehicle=await storage.get('vin:vehicle:'+record.vin);
    if(vehicle?.enabled===false)return response({ok:false,error:'vin_disabled'},403);
    if(vehicle?.telegramId&&vehicle.telegramId!==id)return response({ok:false,error:'vin_bound_to_other_user'},409);
    if(!vehicle)await storage.put('vin:vehicle:'+record.vin,{vin:record.vin,label:'Telegram @'+username,enabled:true,createdAt:now,updatedAt:now,issued:0,telegramId:id,telegramUsername:username,generation:0});
    else{vehicle.telegramId=id;vehicle.telegramUsername=username;vehicle.updatedAt=now;await storage.put('vin:vehicle:'+record.vin,vehicle);}
    record.status='verified';record.telegramId=id;record.verifiedAt=now;
    await storage.put(key,record,{expirationTtl:360});
    await audit(storage,'telegram_verified',record.vin,id);
    return response({ok:true});
  }
  if(path==='/telegram/poll'){
    const nonce=String(b.nonce||''),browserSecret=String(b.browserSecret||'');
    if(!/^[a-f0-9]{32}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(browserSecret))return response({ok:false,error:'invalid_input'},400);
    const key=pendingKey(nonce),record=await storage.get(key);
    if(!record||record.expiresAt<=now)return response({ok:false,error:'expired'},410);
    if(record.browserHash!==await hash(browserSecret))return response({ok:false,error:'forbidden'},403);
    if(record.status==='pending')return response({ok:true,status:'pending'});
    if(record.status!=='verified')return response({ok:false,error:'used'},410);
    const vehicle=await storage.get('vin:vehicle:'+record.vin);
    if(!vehicle?.enabled||vehicle.telegramId!==record.telegramId)return response({ok:false,error:'revoked'},403);
    const token=rand(),tokenHash=await hash(token),expiresAt=now+30*60_000;
    await storage.put('adb:token:'+tokenHash,{createdAt:now,expiresAt,usedAt:null,lastUsedAt:null,redemptionCount:0,persistent:false,twelveHours:false,label:record.vin+' @'+record.username,vin:record.vin,telegramId:record.telegramId,generation:vehicle.generation||0,sessionTtlMs:30*60_000});
    vehicle.issued=(vehicle.issued||0)+1;vehicle.lastIssuedAt=now;await storage.put('vin:vehicle:'+record.vin,vehicle);
    record.status='used';await storage.put(key,record,{expirationTtl:360});
    await audit(storage,'issued',record.vin,record.telegramId,tokenHash.slice(0,10));
    return response({ok:true,status:'issued',token,expiresAt});
  }
  return response({ok:false,error:'not_found'},404);
}
