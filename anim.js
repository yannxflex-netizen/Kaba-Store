/* Animation d'accueil : le téléphone écrit KABA-Store, iPhone, Authentique… */
(function(){
var T=document.getElementById("dtype"),W=document.querySelector(".note"),L=document.querySelectorAll("#dlist li");
if(!T||!W||!L.length)return;
var sets=[
{t:"KABA-Store",l:["iPhone","Authentique","Garantie 12 mois"]},
{t:"Yopougon",l:["Neuf et occasion","Troc possible","Commande WhatsApp"]},
{t:"Le bon prix",l:["Samsung, Tecno","Accessoires","Livraison Abidjan"]}
];
var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function wait(ms){return new Promise(function(ok){setTimeout(function(){
if(!document.hidden)return ok();
var f=function(){document.removeEventListener("visibilitychange",f);ok()};
document.addEventListener("visibilitychange",f)},ms)})}
function span(i){return L[i].querySelector("span")}
function clear(){T.textContent="";Array.prototype.forEach.call(L,function(li){li.className="";li.querySelector("span").textContent=""})}
function show(s){T.textContent=s.t;Array.prototype.forEach.call(L,function(li,i){li.className="on ok";span(i).textContent=s.l[i]})}
async function type(el,txt,sp){
el.classList.add("typing");
for(var i=1;i<=txt.length;i++){el.textContent=txt.slice(0,i);await wait(sp)}
el.classList.remove("typing")}
async function run(){
if(reduce){show(sets[0]);return}
var k=0;
while(true){
var s=sets[k%sets.length];k++;
clear();
await wait(500);
await type(T,s.t,95);
await wait(250);
for(var i=0;i<L.length;i++){
L[i].classList.add("on");
await type(span(i),s.l[i],65);
L[i].classList.add("ok");
await wait(380)}
await wait(2400);
W.classList.add("out");
await wait(500);
W.classList.remove("out")}}
run();
})();
