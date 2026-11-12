import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {vinStateRequest,vinSessionAllowed} from '../src/adb-vin-access.js';
globalThis.crypto ||= webcrypto;
class Storage{
  data=new Map();
  async get(k){return this.data.get(k);}
  async put(k,v){this.data.set(k,v);}
  async list({prefix='',reverse=false,limit}={}){const entries=[...this.data].filter(([k])=>k.startsWith(prefix)).sort((a,b)=>a[0].localeCompare(b[0]));if(reverse)entries.reverse();return new Map(limit?entries.slice(0,limit):entries);}
}
const call=async(storage,path,body)=>{const r=await vinStateRequest(storage,new Request('https://habroremote.com'+path,{method:'POST',body:JSON.stringify(body)}));return {status:r.status,...await r.json()};};
test('VIN must be registered and requires possession proof; token lasts 30m',async()=>{
 const db=new Storage(),vin='LVSAAAAA1AA123456';
 assert.equal((await call(db,'/vin/issue',{vin,enrollmentKey:'0'.repeat(64)})).status,403);
 const enrolled=await call(db,'/vin/enroll',{vin,actor:'owner'});
 assert.equal(enrolled.status,200);
 assert.equal(enrolled.enrollmentKey.length,64);
 const denied=await call(db,'/vin/issue',{vin,enrollmentKey:'f'.repeat(64)});
 assert.equal(denied.status,403);
 const issued=await call(db,'/vin/issue',{vin,enrollmentKey:enrolled.enrollmentKey});
 assert.equal(issued.status,200);
 assert.equal(issued.token.length,64);
 const records=[...db.data].filter(([k])=>k.startsWith('adb:token:'));
 assert.equal(records.length,1);
 assert.equal(records[0][1].vin,vin);
 assert.equal(records[0][1].sessionTtlMs,1800000);
 assert.ok(records[0][1].expiresAt>Date.now());
 assert.equal((await call(db,'/vin/list',{})).vehicles[0].issued,1);
 assert.equal(await vinSessionAllowed(db,{vin,generation:0}),true);
 await call(db,'/vin/status',{vin,enabled:false});
 assert.equal(await vinSessionAllowed(db,{vin,generation:0}),false);
 await call(db,'/vin/status',{vin,enabled:true});
 assert.equal(await vinSessionAllowed(db,{vin,generation:0}),false,'reenabling VIN must not restore old sessions');
 await call(db,'/vin/rotate',{vin});
 assert.equal(await vinSessionAllowed(db,{vin,generation:0}),false);
});
