import test from 'node:test';
import assert from 'node:assert/strict';
import {vinPanel} from '../src/adb-vin-pages.js';
const url='https://habroremote.com/adb/solicitar?utm_source=chatgpt.com';
const form='action=start&vin=BAD&username=%40testuser';
test('iOS VIN request form without Origin returns validation page rather than Forbidden',async()=>{
 const req=new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Sec-Fetch-Site':'none'},body:form});
 const res=await vinPanel(req,{},()=>{throw Error('unexpected backend call')});
 assert.equal(res.status,200);
 assert.match(await res.text(),/Revisa el VIN/);
});
test('VIN request with cross-site Origin is forbidden',async()=>{
 const req=new Request(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:'https://attacker.example'},body:form});
 const res=await vinPanel(req,{},()=>{throw Error('unexpected backend call')});
 assert.equal(res.status,403);
});
