const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root=path.join(__dirname,'../public');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
for(const icon of manifest.icons)assert(fs.existsSync(path.join(root,icon.src)));
const handlers={}; const fallback={offline:true};let networkFails=false;
const scope='http://localhost/subfolder/';
const context={URL,location:{origin:'http://localhost'},fetch:async()=>{if(networkFails)throw Error('offline');return {online:true};},caches:{match:async url=>{assert(String(url).endsWith('/subfolder/offline.html'));return fallback;}},self:{registration:{scope},addEventListener:(name,handler)=>handlers[name]=handler}};
vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
async function request(url,mode='cors',method='GET'){let response;handlers.fetch({request:{url,mode,method},respondWith:r=>response=r});return response?await response:null;}
(async()=>{
 assert.equal(await request(scope+'api.php?action=roster'),null);
 assert.equal(await request(scope+'admin.php','navigate'),null);
 assert.equal(await request(scope+'api.php?action=publish','cors','POST'),null);
 assert.equal(await request('https://example.org/assets/photo.jpg'),null);
 networkFails=true;assert.equal(await request(scope,'navigate'),fallback);
 networkFails=false;assert.equal((await request(scope,'navigate')).online,true);
 console.log('PASS: manifest icons, offline navigation under subdirectory, online recovery, no interception of API/admin/POST/external resources');
})().catch(error=>{console.error(error);process.exitCode=1;});
