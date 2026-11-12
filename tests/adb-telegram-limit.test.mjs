import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {telegramState} from '../src/adb-telegram-state.js';
globalThis.crypto ||= webcrypto;
class Storage {
  data=new Map();
  async get(k){return this.data.get(k);}
  async put(k,v){this.data.set(k,v);}
  async list({prefix=''}={}){return new Map([...this.data].filter(([k])=>k.startsWith(prefix)));}
}
const call=async(db,path,body)=>{const res=await telegramState(db,new Request('https://habroremote.com'+path,{method:'POST',body:JSON.stringify(body)}));return {...await res.json(),httpStatus:res.status};};
test('VIN gets at most two tokens, third request requires Telegram group escalation',async()=>{
 const db=new Storage(),vin='LVSAAAAA1AA123456',username='usuariohabro';
 db.data.set('vin:vehicle:'+vin,{vin,enabled:true,issued:0,telegramId:1234,generation:0});
 for(let n=0;n<3;n++){
   const started=await call(db,'/telegram/start',{vin,username,ip:'127.0.0.1'});
   assert.equal(started.httpStatus,200);
   const confirmed=await call(db,'/telegram/confirm',{nonce:started.nonce,telegramId:1234,username});
   assert.equal(confirmed.httpStatus,200);
   const result=await call(db,'/telegram/poll',{nonce:started.nonce,browserSecret:started.browserSecret});
   if(n<2){assert.equal(result.httpStatus,200);assert.equal(result.status,'issued');assert.equal(result.token.length,64);}
   else{assert.equal(result.httpStatus,429);assert.equal(result.error,'vin_token_limit');}
 }
 assert.equal(db.data.get('vin:vehicle:'+vin).issued,2);
});
