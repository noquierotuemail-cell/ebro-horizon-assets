import test from 'node:test';
import assert from 'node:assert/strict';
import {telegramWebhookSetup} from '../src/adb-telegram-gateway.js';
const env={HABRO_ADB_OWNER_TOKEN:'correct',HABRO_TELEGRAM_BOT_TOKEN:'fake',HABRO_TELEGRAM_WEBHOOK_SECRET:'secret'};
test('iOS form POST without Origin reaches password validation',async()=>{
 const req=new Request('https://habroremote.com/admin/adb-telegram-setup',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Sec-Fetch-Site':'none'},body:'password=wrong'});
 const res=await telegramWebhookSetup(req,env);
 assert.equal(res.status,200);
 assert.match(await res.text(),/Clave incorrecta/);
});
test('cross-site webhook setup is rejected',async()=>{
 const req=new Request('https://habroremote.com/admin/adb-telegram-setup',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/x-www-form-urlencoded'},body:'password=wrong'});
 const res=await telegramWebhookSetup(req,env);
 assert.match(await res.text(),/Solicitud de otro sitio bloqueada/);
});
