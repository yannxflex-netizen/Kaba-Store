var C="kaba-v1";
self.addEventListener("install",function(){self.skipWaiting()});
self.addEventListener("activate",function(e){
e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
/* Réseau d'abord : le site est toujours à jour, le cache ne sert que hors connexion */
self.addEventListener("fetch",function(e){
var r=e.request;
if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
e.respondWith(fetch(r).then(function(res){
if(res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)}).catch(function(){})}
return res}).catch(function(){return caches.match(r).then(function(m){return m||caches.match("index.html")})}))});
