import {db} from "./firebase.js";
import {collection,onSnapshot,query,orderBy,doc,setDoc,increment,addDoc,serverTimestamp,limit} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Les produits viennent de la base Firestore : on les ajoute depuis admin.html */
var PRODUCTS=[],loaded=false,jumped=false;
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var saved={},restored=false;
try{saved=JSON.parse(localStorage.getItem("kaba_cart")||"{}")||{}}catch(e){saved={}}
var cart={},brand="Tous",q="",order="new",mark="Toutes",mode="retrait",budget="all";
var favs=[],favOnly=false;
try{favs=JSON.parse(localStorage.getItem("kaba_fav")||"[]")||[]}catch(e){favs=[]}
var fmt=function(n){return n.toLocaleString("fr-FR")+" FCFA"};
var $=function(i){return document.getElementById(i)};
/* Statistiques : un compteur par produit et par visite (views, carts, asks) */
function track(id,f){
try{var k="s:"+id+":"+f;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1")}catch(e){}
var o={};o[f]=increment(1);setDoc(doc(db,"stats",id),o,{merge:true}).catch(function(){})}

function renderChips(){renderCats();renderBrands();renderBudget()}
function renderBrands(){
var l=PRODUCTS.filter(function(p){return brand==="Tous"||p.cat===brand}).map(function(p){return (p.brand||"").trim()}).filter(function(b,i,a){return b&&a.indexOf(b)===i});
if(mark!=="Toutes"&&l.indexOf(mark)<0)mark="Toutes";
$("bchips").hidden=!l.length;
$("bchips").innerHTML=["Toutes"].concat(l).map(function(b){return '<button class="chip" aria-pressed="'+(b===mark)+'" data-m="'+esc(b)+'">'+(b==="Toutes"?"Toutes les marques":esc(b))+'</button>'}).join("")}
var BUDGETS=[["lt50","Moins de 50 000"],["50_100","50 000 à 100 000"],["gt100","Plus de 100 000"]];
function inBudget(p,b){b=b||budget;return b==="all"||(b==="lt50"&&p.price<50000)||(b==="50_100"&&p.price>=50000&&p.price<=100000)||(b==="gt100"&&p.price>100000)}
function renderBudget(){
var base=PRODUCTS.filter(function(p){return (brand==="Tous"||p.cat===brand)&&(mark==="Toutes"||(p.brand||"").trim()===mark)});
var l=BUDGETS.filter(function(b){return base.some(function(p){return inBudget(p,b[0])})});
if(l.length<2||!l.some(function(b){return b[0]===budget}))budget="all";
$("pchips").hidden=l.length<2;
$("pchips").innerHTML=[["all","Tous les prix"]].concat(l).map(function(b){return '<button class="chip" aria-pressed="'+(b[0]===budget)+'" data-p="'+b[0]+'">'+b[1]+(b[0]==="all"?"":" FCFA")+'</button>'}).join("")}
function renderCats(){
if(!favs.length)favOnly=false;
var brands=["Tous"].concat(PRODUCTS.map(function(p){return p.cat}).filter(function(b,i,a){return a.indexOf(b)===i}));
$("chips").innerHTML=brands.map(function(b){return '<button class="chip" aria-pressed="'+(b===brand)+'" data-b="'+esc(b)+'">'+esc(b)+'</button>'}).join("")+(favs.length?'<button class="chip" aria-pressed="'+favOnly+'" data-fav="1">♥ Favoris ('+favs.length+')</button>':'');
}
function renderGrid(){renderGrid0();renderCmp();if(!$("grid").children.length)$("grid").innerHTML='<p class="empty">'+(!loaded?'Chargement des produits…':PRODUCTS.length?'Aucun produit trouvé. Essayez un autre mot ou écrivez-nous sur WhatsApp.':'Les produits arrivent bientôt. Écrivez-nous sur WhatsApp pour connaître nos disponibilités.')+'</p>'}
function imgsOf(p){return p.imgs&&p.imgs.length?p.imgs:(p.img?[p.img]:[])}
function stageHtml(p){
var im=imgsOf(p);
if(im.length>1)return '<div class="slides">'+im.map(function(s){return '<img src="'+s+'" alt="'+esc(p.name)+'" loading="lazy" decoding="async">'}).join("")+'</div><span class="cnt">1/'+im.length+'</span>';
if(im.length)return '<img src="'+im[0]+'" alt="'+esc(p.name)+'" loading="lazy" decoding="async">';
return '<div class="phone" style="background:'+(p.c||"#d4d4d4")+'"></div>'}
function sorted(l){return order==='asc'?l.slice().sort(function(a,b){return a.price-b.price}):order==='desc'?l.slice().sort(function(a,b){return b.price-a.price}):l.filter(function(p){return p.feat}).concat(l.filter(function(p){return !p.feat}))}
function isNew(p){var t=p.createdAt;if(t===null)return true;return !!(t&&t.toMillis&&Date.now()-t.toMillis()<7*864e5)}
function promo(p){return p.old>p.price}
function renderGrid0(){
$("grid").innerHTML=sorted(PRODUCTS.filter(function(p){return (brand==="Tous"||p.cat===brand)&&(mark==="Toutes"||(p.brand||"").trim()===mark)&&inBudget(p)&&(!favOnly||favs.indexOf(p.id)>-1)&&(p.name+" "+(p.desc||"")+" "+(p.brand||"")+" "+(p.specs||"")+" "+(p.storage||"")+" "+(p.color||"")).toLowerCase().indexOf(q)>-1})).map(function(p){
return '<article class="card'+(p.sold?' sold':'')+(p.feat?' feat':'')+'" data-pid="'+p.id+'"><div class="stage">'+(isNew(p)&&!p.sold?'<span class="tag nw">Nouveau</span>':'')+(p.sold?'<span class="tag">Vendu</span>':'')+(promo(p)&&!p.sold?'<span class="tag pr">-'+Math.round((1-p.price/p.old)*100)+'%</span>':'')+(p.state?'<span class="tag st">'+esc(p.state)+'</span>':'')+heart(p)+stageHtml(p)+'</div>'+
'<span class="meta">'+esc(p.cat)+(p.brand?' · '+esc(p.brand):'')+(p.storage?' · '+esc(p.storage):'')+'</span><h3 data-det="'+p.id+'">'+(p.feat?'★ ':'')+esc(p.name)+'</h3><span class="meta">'+esc(p.desc)+'</span>'+'<button class="more" type="button" data-det="'+p.id+'">Voir les détails</button>'+(p.sold?'':'<button class="cmp" type="button" data-cmp="'+p.id+'">Comparer</button>')+(p.qty>0&&p.qty<=3?'<span class="low">Plus que '+p.qty+' en stock !</span>':'')+
'<div class="row"><span class="price">'+(promo(p)?'<s class="was">'+fmt(p.old)+'</s>':'')+fmt(p.price)+'</span>'+(p.sold?'<button class="add" disabled>Vendu</button>':'<button class="add" data-id="'+p.id+'">Ajouter</button>')+'</div>'+(p.sold?'<a class="ask" href="'+wa("Bonjour KABA-Store, le produit « "+p.name+" » est indiqué vendu. Pouvez-vous me prévenir quand il sera de nouveau disponible ? Merci.")+'" target="_blank" rel="noopener">Me prévenir au retour</a>':'<div class="acts"><a class="ask" href="'+wa("Bonjour KABA-Store, je suis intéressé par : "+p.name+" ("+fmt(p.price)+"). Est-il disponible ?")+'" target="_blank" rel="noopener">Poser une question</a><button class="shr" type="button" data-share="'+p.id+'" aria-label="Partager ce produit">Partager</button></div>')+'</article>'}).join("");
}
function restoreCart(){
if(restored)return;restored=true;
Object.keys(saved).forEach(function(id){var p=PRODUCTS.filter(function(x){return x.id==id})[0],n=Number(saved[id])||0;
if(p&&!p.sold&&n>0)cart[id]=Math.min(n,p.qty>0?p.qty:99)})}
function renderSugg(){
var phones=Object.keys(cart).map(function(id){return PRODUCTS.filter(function(x){return x.id==id})[0]}).filter(function(p){return p&&p.cat==="Téléphones"});
var br=phones.map(function(p){return (p.brand||"").trim().toLowerCase()}).filter(Boolean);
var l=PRODUCTS.filter(function(p){return p.cat==="Accessoires"&&!p.sold&&!cart[p.id]});
function rk(p){return br.indexOf((p.brand||"").trim().toLowerCase())>-1?0:1}
l=l.map(function(p,i){return {p:p,i:i}}).sort(function(a,b){return rk(a.p)-rk(b.p)||a.i-b.i}).map(function(o){return o.p}).slice(0,3);
$("sugg").hidden=!(phones.length&&l.length);
$("sgl").innerHTML=l.map(function(p){var im=imgsOf(p)[0];
return '<div class="sg">'+(im?'<img src="'+im+'" alt="" loading="lazy">':'<div class="ph"></div>')+'<div class="grow"><b>'+esc(p.name)+'</b><br><span class="meta">'+fmt(p.price)+'</span></div><button type="button" data-sg="'+p.id+'">+ Ajouter</button></div>'}).join("")}
function renderCart(){
Object.keys(cart).forEach(function(id){if(!PRODUCTS.some(function(x){return x.id==id&&!x.sold}))delete cart[id]});
if(loaded){try{localStorage.setItem("kaba_cart",JSON.stringify(cart))}catch(e){}}
var ids=Object.keys(cart),n=0,t=0;
$("lines").innerHTML=ids.length?ids.map(function(id){
var p=PRODUCTS.filter(function(x){return x.id==id})[0],q=cart[id];n+=q;t+=q*p.price;
return '<div class="line"><div><b>'+esc(p.name)+'</b><br><span class="meta">'+fmt(p.price)+'</span></div><div><button data-d="'+id+'" aria-label="Retirer un">−</button> '+q+' <button data-u="'+id+'" aria-label="Ajouter un">+</button></div></div>'}).join(""):'<p class="empty">Votre panier est vide. Ajoutez un téléphone depuis le catalogue.</p>';
$("lhint").hidden=!(n&&mode==="livraison"&&!livOk());renderSugg();$("count").textContent=n;$("total").textContent=fmt(t);["order","promo"].forEach(function(i){var o=$(i),ok=n&&livOk();o.href=ok?waLink(i):"#";o.style.opacity=ok?1:.4;o.style.pointerEvents=ok?"auto":"none"});
}
function wa(m){return "https://wa.me/2250779672534?text="+encodeURIComponent(m)}
function livOk(){return mode==="retrait"||$("quartier").value.trim().length>1}
function waLink(k){
var liv=mode==="livraison";
var m="Bonjour KABA-Store, "+(k==="promo"?"je souhaite commander les articles ci-dessous et je voudrais savoir si vous pouvez me faire une réduction :":"je souhaite commander les articles ci-dessous"+(liv?" en livraison :":". Le paiement se fera en magasin :"))+"\n",t=0;
Object.keys(cart).forEach(function(id){var p=PRODUCTS.filter(function(x){return x.id==id})[0];m+="- "+cart[id]+" x "+p.name+" ("+fmt(p.price)+")\n";t+=cart[id]*p.price});
m+="Total : "+fmt(t)+"\n";
m+=liv?"Mode : livraison\nQuartier : "+$("quartier").value.trim()+($("repere").value.trim()?"\nPoint de repère : "+$("repere").value.trim():""):"Mode : retrait en magasin";
m+=k==="promo"?"\nPouvez-vous me proposer un meilleur prix ? Merci.":(liv?"\nPouvez-vous me confirmer la disponibilité, les frais de livraison et le paiement ? Merci.":"\nPouvez-vous me confirmer la disponibilité ? Merci.");
return wa(m)}
function drawer(open){var d=$("drawer");d.classList.toggle("open",open);d.setAttribute("aria-hidden",!open);if(open)$("msg").textContent=""}

$("chips").addEventListener("click",function(e){var b=e.target.getAttribute("data-b");if(b){brand=b;renderChips();renderGrid()}});
$("grid").addEventListener("click",function(e){var id=e.target.getAttribute("data-id");if(id){var pg=PRODUCTS.filter(function(x){return x.id==id})[0];cart[id]=Math.min((cart[id]||0)+1,pg&&pg.qty>0?pg.qty:99);track(id,"carts");renderCart();drawer(true)}});
$("grid").addEventListener("scroll",function(e){var s=e.target;
if(s.classList&&s.classList.contains("slides"))s.nextElementSibling.textContent=(Math.round(s.scrollLeft/s.clientWidth)+1)+"/"+s.children.length},true);
$("sgl").addEventListener("click",function(e){var id=e.target.getAttribute("data-sg");if(!id)return;
var p=PRODUCTS.filter(function(x){return x.id==id})[0];if(!p)return;
cart[id]=Math.min((cart[id]||0)+1,p.qty>0?p.qty:99);track(id,"carts");renderCart()});
$("lines").addEventListener("click",function(e){
var u=e.target.getAttribute("data-u"),d=e.target.getAttribute("data-d");
if(u){var pu=PRODUCTS.filter(function(x){return x.id==u})[0];cart[u]=Math.min(cart[u]+1,pu&&pu.qty>0?pu.qty:99)}if(d){cart[d]--;if(!cart[d])delete cart[d]}renderCart()});
$("bchips").addEventListener("click",function(e){var m=e.target.getAttribute("data-m");if(m){mark=m;renderBrands();renderBudget();renderGrid()}});
$("grid").addEventListener("click",function(e){
var sid=e.target.getAttribute("data-share");if(!sid)return;
var p=PRODUCTS.filter(function(x){return x.id===sid})[0];if(!p)return;
var url=location.href.split("#")[0]+"#"+sid,text=p.name+" – "+fmt(p.price)+" chez KABA-Store";
if(navigator.share){navigator.share({title:p.name,text:text,url:url}).catch(function(){})}
else{window.open("https://wa.me/?text="+encodeURIComponent(text+"\n"+url),"_blank")}});
function goHash(){var id=location.hash.slice(1).replace(/[^\w-]/g,"");if(!id)return;
var a=document.querySelector('[data-pid="'+id+'"]');if(a){a.scrollIntoView({block:"center"});a.classList.add("hl")}}
$("pchips").addEventListener("click",function(e){var p=e.target.getAttribute("data-p");if(p){budget=p;renderBudget();renderGrid()}});
$("sort").onchange=function(){order=this.value;renderGrid()};
try{$("quartier").value=localStorage.getItem("kaba_q")||""}catch(e){}
try{if(localStorage.getItem("kaba_mode")==="livraison"){mode="livraison";document.querySelector('input[name="mode"][value="livraison"]').checked=true;$("liv").hidden=false}}catch(e){}
document.querySelectorAll('input[name="mode"]').forEach(function(r){r.onchange=function(){mode=this.value;$("liv").hidden=mode!=="livraison";try{localStorage.setItem("kaba_mode",mode)}catch(e){}renderCart()}});
$("quartier").oninput=function(){try{localStorage.setItem("kaba_q",this.value)}catch(e){}renderCart()};
$("repere").oninput=renderCart;
$("open").onclick=function(){drawer(true)};
$("close").onclick=function(){drawer(false)};
document.addEventListener("keydown",function(e){if(e.key==="Escape"){drawer(false);closeLb();closeDt()}});
function trocLink(){var a=$("mine").value.trim(),b=$("want").value.trim(),t=$("trocsend"),ok=a&&b;t.href=ok?wa("Bonjour KABA-Store, je souhaite faire un troc.\nMon téléphone : "+a+"\nTéléphone souhaité : "+b+"\nPouvez-vous me proposer une estimation ? Merci."):"#";t.style.opacity=ok?1:.4;t.style.pointerEvents=ok?"auto":"none"}
$("mine").oninput=trocLink;$("want").oninput=trocLink;
$("trocbtn").onclick=function(){var t=$("troc");t.hidden=!t.hidden;trocLink()};
document.querySelectorAll(".act").forEach(function(a){a.onclick=function(){$("msg").textContent="WhatsApp s’ouvre avec votre message. Envoyez-le pour valider."}});

$("q").oninput=function(){q=this.value.trim().toLowerCase();renderGrid();var r=$("catalogue").getBoundingClientRect();if(r.top>150)window.scrollTo({top:window.scrollY+r.top-130,behavior:"smooth"})};
/* Photo en plein écran */
function openLb(p,start){
var im=imgsOf(p);if(!im.length)return;
$("lbs").innerHTML=im.map(function(s){return '<img src="'+s+'" alt="'+esc(p.name)+'">'}).join("");
$("lb").hidden=false;document.body.style.overflow="hidden";
$("lbc").hidden=im.length<2;$("lbc").textContent=(start+1)+"/"+im.length;
$("lbs").scrollLeft=start*$("lbs").clientWidth}
function closeLb(){$("lb").hidden=true;$("lbs").innerHTML="";document.body.style.overflow=$("dtl").hidden?"":"hidden"}
$("grid").addEventListener("click",function(e){
var st=e.target.closest(".stage");if(!st||e.target.tagName!=="IMG")return;
var a=st.closest("article"),p=PRODUCTS.filter(function(x){return x.id===a.getAttribute("data-pid")})[0];if(!p)return;
track(p.id,"views");var sl=st.querySelector(".slides");openLb(p,sl?Math.round(sl.scrollLeft/sl.clientWidth):0)});
$("lbs").addEventListener("scroll",function(){var s=$("lbs");$("lbc").textContent=(Math.round(s.scrollLeft/s.clientWidth)+1)+"/"+s.children.length});
$("revs").addEventListener("click",function(e){if(e.target.tagName==="IMG")openLb({name:"Photo client",imgs:[e.target.src]},0)});
$("grid").addEventListener("click",function(e){var a=e.target.closest(".ask");if(a)track(a.closest("article").getAttribute("data-pid"),"asks")});
/* Fiche détaillée du produit */
var curDet=null;
function addCart(id){var pg=PRODUCTS.filter(function(x){return x.id==id})[0];cart[id]=Math.min((cart[id]||0)+1,pg&&pg.qty>0?pg.qty:99);track(id,"carts");renderCart();drawer(true)}
function specsHtml(p){
var rows=[["Stockage",p.storage],["RAM",p.ram],["Batterie",p.battery],["Couleur",p.color],["Garantie",p.warranty]].filter(function(r){return r[1]}).map(function(r){return '<li><b>'+r[0]+'</b><span>'+esc(r[1])+'</span></li>'});
String(p.specs||"").split("\n").map(function(x){return x.trim()}).filter(Boolean).forEach(function(x){var i=x.indexOf(":");rows.push(i>0?'<li><b>'+esc(x.slice(0,i).trim())+'</b><span>'+esc(x.slice(i+1).trim())+'</span></li>':'<li><span>'+esc(x)+'</span></li>')});
return rows.length?'<ul class="specs">'+rows.join("")+'</ul>':""}
function openDt(p){
curDet=p;
var meta=[p.cat,p.brand,p.state].filter(Boolean).map(esc).join(" · ");
var ask=wa(p.sold?"Bonjour KABA-Store, le produit « "+p.name+" » est indiqué vendu. Pouvez-vous me prévenir quand il sera de nouveau disponible ? Merci.":"Bonjour KABA-Store, je suis intéressé par : "+p.name+" ("+fmt(p.price)+"). Est-il disponible ?");
$("dtc").innerHTML='<div class="stage">'+stageHtml(p)+'</div>'+
'<h2>'+esc(p.name)+'</h2><p class="meta">'+meta+'</p>'+
'<p class="price">'+(promo(p)?'<s class="was">'+fmt(p.old)+'</s>':'')+fmt(p.price)+'</p>'+
(p.qty>0&&p.qty<=3&&!p.sold?'<p class="low">Plus que '+p.qty+' en stock !</p>':'')+
(p.desc?'<p>'+esc(p.desc)+'</p>':'')+specsHtml(p)+
(p.sold?'<p class="err">Ce produit est vendu.</p><a class="ask" href="'+ask+'" target="_blank" rel="noopener">Me prévenir au retour</a>':'<button class="cta addb" type="button" data-add="'+p.id+'">Ajouter au panier</button><a class="ask" href="'+ask+'" target="_blank" rel="noopener">Poser une question sur WhatsApp</a>')+simHtml(p);
$("dtl").hidden=false;$("dtc").parentNode.scrollTop=0;document.body.style.overflow="hidden"}
function closeDt(){$("dtl").hidden=true;$("dtc").innerHTML="";curDet=null;document.body.style.overflow=""}
$("grid").addEventListener("click",function(e){
var d=e.target.getAttribute("data-det");if(!d)return;
var p=PRODUCTS.filter(function(x){return x.id===d})[0];if(p)openDt(p)});
$("dtc").addEventListener("click",function(e){
var a=e.target.getAttribute("data-add");
if(a){addCart(a);closeDt();return}
if(e.target.closest(".ask")&&curDet){track(curDet.id,"asks");return}
if(e.target.tagName==="IMG"&&curDet){var sl=e.target.closest(".slides"),i=sl?Array.prototype.indexOf.call(sl.children,e.target):0;openLb(curDet,Math.max(0,i))}});
$("dtc").addEventListener("scroll",function(e){var s=e.target;
if(s.classList&&s.classList.contains("slides"))s.nextElementSibling.textContent=(Math.round(s.scrollLeft/s.clientWidth)+1)+"/"+s.children.length},true);
/* Vous aimerez aussi */
function simHtml(p){
var l=PRODUCTS.filter(function(x){return x.id!==p.id&&!x.sold&&x.cat===p.cat}).map(function(x){var s=0;if(p.brand&&x.brand===p.brand)s+=2;if(Math.abs(x.price-p.price)<=p.price*.3)s+=1;return {x:x,s:s}}).filter(function(o){return o.s>0}).sort(function(a,b){return b.s-a.s}).slice(0,3).map(function(o){return o.x});
if(!l.length)return "";
return '<h3>Vous aimerez aussi</h3><div class="sims">'+l.map(function(x){var im=imgsOf(x)[0];return '<button type="button" class="sim" data-sim="'+x.id+'">'+(im?'<img src="'+im+'" alt="" loading="lazy">':'<div class="ph"></div>')+'<span>'+esc(x.name)+'</span><b>'+fmt(x.price)+'</b></button>'}).join("")+'</div>'}
$("dtc").addEventListener("click",function(e){
var b=e.target.closest("[data-sim]");if(!b)return;
var p=PRODUCTS.filter(function(x){return x.id===b.getAttribute("data-sim")})[0];if(p)openDt(p)});
$("dtx").onclick=closeDt;
$("dtl").addEventListener("click",function(e){if(e.target===$("dtl"))closeDt()});
$("lbx").onclick=closeLb;
$("lbs").addEventListener("click",function(e){if(e.target.tagName!=="IMG")closeLb()});

/* Favoris */
function saveFav(){try{localStorage.setItem("kaba_fav",JSON.stringify(favs))}catch(e){}}
function heart(p){var on=favs.indexOf(p.id)>-1;return '<button class="fav'+(on?' on':'')+'" type="button" data-fav="'+p.id+'" aria-pressed="'+on+'" aria-label="Favori">'+(on?'♥':'♡')+'</button>'}
$("grid").addEventListener("click",function(e){
var id=e.target.getAttribute("data-fav");if(!id)return;
var i=favs.indexOf(id);if(i>-1)favs.splice(i,1);else favs.push(id);
saveFav();renderChips();renderGrid()});
$("chips").addEventListener("click",function(e){
if(e.target.getAttribute("data-fav")){favOnly=!favOnly;renderChips();renderGrid()}});

/* Comparer deux téléphones */
var cmpIds=[];
function cmpProducts(){return cmpIds.map(function(id){return PRODUCTS.filter(function(x){return x.id===id})[0]}).filter(function(p){return p&&!p.sold})}
function renderCmp(){
var l=cmpProducts();cmpIds=l.map(function(p){return p.id});
$("cmpbar").hidden=!l.length;
$("cmpinfo").textContent=l.length<2?"1 choisi. Ajoutez-en un autre à comparer.":l[0].name+" / "+l[1].name;
$("cmpgo").disabled=l.length<2;
document.querySelectorAll(".cmp[data-cmp]").forEach(function(b){
var on=cmpIds.indexOf(b.getAttribute("data-cmp"))>-1;
b.classList.toggle("on",on);b.textContent=on?"✓ Choisi":"Comparer"})}
$("grid").addEventListener("click",function(e){
var id=e.target.getAttribute("data-cmp");if(!id)return;
var i=cmpIds.indexOf(id);
if(i>-1)cmpIds.splice(i,1);
else{cmpIds.push(id);if(cmpIds.length>2)cmpIds.shift()}
renderCmp()});
$("cmpx").onclick=function(){cmpIds=[];renderCmp()};
/* Lit un nombre dans un texte ("128 Go" -> 128, "1 To" -> 1000, "89 %" -> 89) */
function numOf(s){var t=String(s||"").toLowerCase().replace(",","."),m=t.match(/\d+(\.\d+)?/);if(!m)return null;var n=parseFloat(m[0]);if(isNaN(n))return null;if(/\bto\b|\btb\b/.test(t))n*=1000;return n}
function openCmp(){
var l=cmpProducts();if(l.length<2)return;
/* [libellé, valeur numérique (ou null), texte affiché, meilleur: 1 = plus grand, -1 = plus petit] */
var rows=[
["Prix",function(p){return p.price},function(p){return fmt(p.price)},-1],
["État",null,function(p){return p.state||"–"}],
["Stockage",function(p){return numOf(p.storage)},function(p){return p.storage||"–"},1],
["RAM",function(p){return numOf(p.ram)},function(p){return p.ram||"–"},1],
["Batterie",function(p){return numOf(p.battery)},function(p){return p.battery||"–"},1],
["Couleur",null,function(p){return p.color||"–"}],
["Garantie",null,function(p){return p.warranty||"–"}]];
var h='<h2>Comparer</h2><table class="cmpt"><thead><tr><th></th>'+l.map(function(p){var im=imgsOf(p)[0];return '<th>'+(im?'<img src="'+im+'" alt="">':'')+esc(p.name)+'</th>'}).join("")+'</tr></thead><tbody>';
rows.forEach(function(r){
var v=r[1]?l.map(r[1]):[null,null],best=-1;
if(r[3]&&v[0]!=null&&v[1]!=null&&v[0]!==v[1])best=(r[3]>0?v[0]>v[1]:v[0]<v[1])?0:1;
h+='<tr><th>'+r[0]+'</th>'+l.map(function(p,i){return '<td'+(i===best?' class="best"':'')+'>'+esc(r[2](p))+'</td>'}).join("")+'</tr>'});
h+='<tr><th></th>'+l.map(function(p){return '<td><button type="button" data-add="'+p.id+'">Ajouter</button></td>'}).join("")+'</tr></tbody></table>';
curDet=null;$("dtc").innerHTML=h;$("dtl").hidden=false;$("dtc").parentNode.scrollTop=0;document.body.style.overflow="hidden"}
$("cmpgo").onclick=openCmp;

renderChips();renderGrid();renderCart();trocLink();
onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),function(snap){
PRODUCTS=snap.docs.map(function(d){var x=d.data();x.id=d.id;if(x.qty===0)x.sold=true;return x});
loaded=true;restoreCart();renderChips();renderGrid();renderCart();
if(!jumped&&PRODUCTS.length){jumped=true;goHash()}
},function(err){loaded=true;renderGrid()});

/* Avis clients */
onSnapshot(query(collection(db,"reviews"),orderBy("createdAt","desc")),function(snap){
var l=snap.docs.map(function(d){return d.data()});
$("avis").hidden=!l.length;
$("revs").innerHTML=l.map(function(r){return '<figure class="rc">'+(r.img?'<img src="'+r.img+'" alt="" loading="lazy">':'')+'<blockquote>'+esc(r.text)+'</blockquote><figcaption>'+esc(r.name||"Client KABA-Store")+'</figcaption></figure>'}).join("")
},function(){});

/* Bandeau d'annonce */
onSnapshot(doc(db,"settings","banner"),function(s){
var d=s.exists()?s.data():{},t=(d.text||"").trim(),show=!!(d.on&&t);
try{if(show&&sessionStorage.getItem("kaba_bx")===t)show=false}catch(e){}
$("bnrt").textContent=t;$("bnr").hidden=!show
},function(){});
$("bnrx").onclick=function(){$("bnr").hidden=true;try{sessionStorage.setItem("kaba_bx",$("bnrt").textContent)}catch(e){}};

/* Accès admin caché : 5 appuis rapides sur « KABA-Store » en bas de page */
var tapN=0,tapT=0;
$("secret").addEventListener("click",function(){
var n=Date.now();tapN=n-tapT>2000?1:tapN+1;tapT=n;
if(tapN>=5){tapN=0;location.href="admin.html"}});

/* Note du site par les clients */
var rate=0,rated=false;
try{rated=localStorage.getItem("kaba_rated")==="1"}catch(e){}
function drawStars(n){$("stars").innerHTML=[1,2,3,4,5].map(function(v){return '<button type="button" class="star" data-s="'+v+'" aria-label="'+v+' sur 5">'+(v<=n?'★':'☆')+'</button>'}).join("")}
drawStars(0);
if(rated){$("rbody").hidden=true;$("rmsg2").textContent="Merci pour votre note !"}
$("stars").addEventListener("click",function(e){var s=Number(e.target.getAttribute("data-s"));if(!s)return;rate=s;drawStars(s)});
$("rsend").onclick=async function(){
if(!rate){$("rmsg2").textContent="Touchez les étoiles pour choisir une note.";return}
this.disabled=true;
try{
await addDoc(collection(db,"ratings"),{stars:rate,text:$("rcom").value.trim().slice(0,300),createdAt:serverTimestamp()});
rated=true;try{localStorage.setItem("kaba_rated","1")}catch(e){}
$("rbody").hidden=true;$("rmsg2").textContent="Merci pour votre note !"
}catch(err){$("rmsg2").textContent="Envoi impossible pour le moment. Réessayez plus tard.";this.disabled=false}};
onSnapshot(query(collection(db,"ratings"),orderBy("createdAt","desc"),limit(200)),function(snap){
var n=snap.size,t=0;snap.docs.forEach(function(d){t+=d.data().stars||0});
$("ravg").textContent=n?"Note moyenne : "+(t/n).toFixed(1).replace(".",",")+" / 5 ("+n+" avis)":"Soyez le premier à noter notre boutique."},function(){});
