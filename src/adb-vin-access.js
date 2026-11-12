// VIN-based access. VIN is an identifier, never a credential.
// A separately issued 256-bit enrollment key proves possession.
// All operations run in the existing Durable Object to serialize state changes.
const VIN=/^[A-HJ-NPR-Z0-9]{17}$/;
const hex=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const normalize=value=>String(value||'').trim().toUpperCase();
const key=vin=>'vin:vehicle:'+vin;
const auditKey=()=> 'vin:audit:'+String(Date.now()).padStart(14,'0')+':'+random().slice(0,12);
async function audit(storage,event,vin,actor,detail=''){
  await storage.put(auditKey(),{at:Date.now(),event,vin,actor,detail});
}
export async function vinStateRequest(storage,request){
  const path=new URL(request.url).pathname;
  let b={};try{b=await request.json();}catch{return reply({ok:false,error:'invalid_json'},400);}
  const vin=normalize(b.vin),now=Date.now(),actor=String(b.actor||'system').slice(0,60);
  if(path==='/vin/list'){
    const entries=await storage.list({prefix:'vin:vehicle:'});
    const vehicles=[...entries.values()].map(v=>({vin:v.vin,label:v.label||'',enabled:v.enabled,createdAt:v.createdAt,updatedAt:v.updatedAt,issued:v.issued||0,lastIssuedAt:v.lastIssuedAt||null}));
    const logs=await storage.list({prefix:'vin:audit:',reverse:true,limit:300});
    return reply({ok:true,vehicles,events:[...logs.values()]});
  }
  if(!VIN.test(vin))return reply({ok:false,error:'invalid_vin'},400);
  if(path==='/vin/enroll'){
    const existing=await storage.get(key(vin));
    if(existing)return reply({ok:false,error:'already_registered'},409);
    const enrollmentKey=random();
    await storage.put(key(vin),{vin,label:String(b.label||'').slice(0,80),keyHash:await hex(enrollmentKey),enabled:true,createdAt:now,updatedAt:now,issued:0});
    await audit(storage,'enrolled',vin,actor);
    return reply({ok:true,vin,enrollmentKey});
  }
  if(path==='/vin/status'){
    const record=await storage.get(key(vin));
    if(!record)return reply({ok:false,error:'not_registered'},404);
    record.enabled=b.enabled===true;record.updatedAt=now;
    if(!record.enabled)record.generation=(record.generation||0)+1;
    await storage.put(key(vin),record);
    await audit(storage,record.enabled?'enabled':'disabled',vin,actor);
    // Disable all live sessions for VIN by checking record status on each validation.
    return reply({ok:true});
  }
  if(path==='/vin/rotate'){
    const record=await storage.get(key(vin));
    if(!record)return reply({ok:false,error:'not_registered'},404);
    const enrollmentKey=random();
    record.keyHash=await hex(enrollmentKey);record.updatedAt=now;record.generation=(record.generation||0)+1;
    await storage.put(key(vin),record);
    await audit(storage,'key_rotated',vin,actor);
    return reply({ok:true,vin,enrollmentKey});
  }
  if(path==='/vin/issue'){
    const record=await storage.get(key(vin));
    const proof=String(b.enrollmentKey||'').trim().toLowerCase();
    const ip=String(b.ip||'unknown').slice(0,80);
    const limitKey='vin:limit:'+await hex(ip+':'+vin);
    const limit=await storage.get(limitKey)||{count:0,until:now+15*60_000};
    if(now>limit.until){limit.count=0;limit.until=now+15*60_000;}
    if(limit.count>=6)return reply({ok:false,error:'try_later'},429);
    if(!record?.enabled||!/^[0-9a-f]{64}$/.test(proof)||await hex(proof)!==record.keyHash){
      limit.count++;await storage.put(limitKey,limit,{expirationTtl:900});
      await audit(storage,'denied',vin,'self-service');
      return reply({ok:false,error:'not_authorized'},403);
    }
    limit.count=0;await storage.put(limitKey,limit,{expirationTtl:900});
    // Single-use token; redemption creates a 30-minute session.
    const token=random(),hash=await hex(token),expiresAt=now+30*60_000;
    await storage.put('adb:token:'+hash,{createdAt:now,expiresAt,usedAt:null,lastUsedAt:null,redemptionCount:0,persistent:false,twelveHours:false,label:vin,vin,generation:record.generation||0,sessionTtlMs:30*60_000});
    record.issued=(record.issued||0)+1;record.lastIssuedAt=now;await storage.put(key(vin),record);
    await audit(storage,'issued',vin,'self-service',hash.slice(0,10));
    return reply({ok:true,token,expiresAt,vin});
  }
  return reply({ok:false,error:'not_found'},404);
}
export async function vinSessionAllowed(storage,record){
  if(!record?.vin)return true;
  const vehicle=await storage.get(key(record.vin));
  return !!vehicle?.enabled&&(vehicle.generation||0)===(record.generation||0);
}
