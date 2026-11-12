import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {telegramState} from '../src/adb-telegram-state.js';
globalThis.crypto ||= webcrypto;
class Storage{
  data=new Map();
  async get(k){return this.data.get(k);}
  async put(k,v){this.data.set(k,v);}
  async list({prefix='',reverse=false,limit}={}){let x=[...this.data].filter(([k])=>k.startsWith(prefix)).sort((a,b)=>a[0].localeCompare(b[0]));if(reverse)x.reverse();return new Map(limit?x.slice(0,limit):x);}
}
const call=async(db,path,b)=>{const r=await telegramState(db,new Request('https://habroremote.com'+path,{method:'POST',body:JSON.stringify(b)}));return {status:r.status,...await r.json()};};
const vin='LVSAAAAA1AA123456';
test('Telegram challenge needs both bot verification and browser secret; token is one-use',async()=>{
 const db=new Storage();
 const a=await call(db,'/telegram/start',{vin,username:'@testuser',ip:'192.0.2.1'});
 assert.equal(a.status,200);
 assert.equal((await call(db,'/telegram/poll',{nonce:a.nonce,browserSecret:a.browserSecret})).status,'pending');
 assert.equal((await call(db,'/telegram/confirm',{nonce:a.nonce,telegramId:123,username:'otheruser'})).status,403);
 assert.equal((await call(db,'/telegram/confirm',{nonce:a.nonce,telegramId:123,username:'testuser'})).status,200);
 assert.equal((await call(db,'/telegram/poll',{nonce:a.nonce,browserSecret:'f'.repeat(64)})).status,403);
 const issued=await call(db,'/telegram/poll',{nonce:a.nonce,browserSecret:a.browserSecret});
 assert.equal(issued.status,'issued');
 assert.equal(issued.token.length,64);
 assert.equal((await call(db,'/telegram/poll',{nonce:a.nonce,browserSecret:a.browserSecret})).status,410);
 const vehicle=await db.get('vin:vehicle:'+vin);
 assert.equal(vehicle.telegramId,123);
 const tokens=[...db.data].filter(([k])=>k.startsWith('adb:token:'));
 assert.equal(tokens.length,1);
 assert.equal(tokens[0][1].sessionTtlMs,30*60_000);
});
test('VIN cannot be claimed by a second Telegram identity',async()=>{
 const db=new Storage();
 const a=await call(db,'/telegram/start',{vin,username:'firstuser',ip:'192.0.2.2'});
 assert.equal((await call(db,'/telegram/confirm',{nonce:a.nonce,telegramId:111,username:'firstuser'})).status,200);
 const b=await call(db,'/telegram/start',{vin,username:'seconduser',ip:'192.0.2.3'});
 assert.equal((await call(db,'/telegram/confirm',{nonce:b.nonce,telegramId:222,username:'seconduser'})).status,409);
});
test('Telegram challenge issuance is rate limited',async()=>{
 const db=new Storage();
 for(let i=0;i<6;i++)assert.equal((await call(db,'/telegram/start',{vin,username:'testuser',ip:'192.0.2.4'})).status,200);
 assert.equal((await call(db,'/telegram/start',{vin,username:'testuser',ip:'192.0.2.4'})).status,429);
});
