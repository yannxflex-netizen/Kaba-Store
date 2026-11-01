import {db,auth} from "./firebase.js";
import {signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {collection,addDoc,updateDoc,deleteDoc,doc,onSnapshot,query,orderBy,serverTimestamp,setDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Si un élément manque dans la page (fichier pas encore mis à jour), on ne bloque pas tout le site */
var $=function(i){return document.getElementById(i)||document.createElement("div")};
var items=[],editId=null,photos=[],unsub=null,unsubR=null,rphoto="",unsubS=null,stats={},unsubB=null,bfilled=false;
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmt(n){return Number(n).toLocaleString("fr-FR")+" FCFA"}
function msg(t,ok){var m=$("fmsg");m.textContent=t;m.className=ok?"":"err"}

/* Connexion */
onAuthStateChanged(auth,function(u){
$("login").hidden=!!u;$("panel").hidden=!u;
if(u){$("who").textContent=u.email;listen();listenR();listenS();listenB()}else{if(unsubB){unsubB();unsubB=null;bfilled=false}if(unsubS){unsubS();unsubS=null}if(unsub){unsub();unsub=null}if(unsubR){unsubR();unsubR=null}}
});
$("lform").onsubmit=async function(e){
e.preventDefault();$("lmsg").textContent="";
try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("pass").value)}
catch(err){$("lmsg").textContent="E-mail ou mot de passe incorrect."}
};
$("logout").onclick=function(){signOut(auth)};

/* Photos */
function resize(f){return new Promise(function(ok){
var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){
var k=Math.min(1,700/Math.max(im.width,im.height)),c=document.createElement("canvas");
c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",0.7))};
im.src=r.result};r.readAsDataURL(f)})}
function showPrev(){$("prev").innerHTML=photos.map(function(s,i){
return '<div class="th"><img src="'+s+'" alt=""><button type="button" data-r="'+i+'" aria-label="Retirer">×</button></div>'}).join("")}
$("photo").onchange=async function(){
var files=Array.prototype.slice.call(this.files);
for(var i=0;i<files.length;i++){
if(photos.length>=5){msg("5 photos maximum.");break}
photos.push(await resize(files[i]))}
this.value="";showPrev()};
$("prev").addEventListener("click",function(e){var r=e.target.getAttribute("data-r");if(r!==null){photos.splice(Number(r),1);showPrev()}});

/* Publier ou modifier */
function setSpecs(p){
$("f_storage").value=p.storage||"";$("f_ram").value=p.ram||"";$("f_battery").value=p.battery||"";
$("f_color").value=p.color||"";$("f_warranty").value=p.warranty||"";$("specs").value=p.specs||""}
function reset(){editId=null;photos=[];$("pform").reset();showPrev();
$("ftitle").textContent="Publier un produit";$("save").textContent="Publier";$("cancel").hidden=true}
$("cancel").onclick=function(){reset();msg("")};
$("pform").onsubmit=async function(e){
e.preventDefault();
var d={name:$("name").value.trim(),cat:$("cat").value,price:Number($("price").value),desc:$("desc").value.trim(),sold:$("sold").checked,old:Number($("old").value)||0,brand:$("brand").value.trim(),state:$("state").value,feat:$("feat").checked,qty:$("qty").value===""?null:Number($("qty").value),specs:$("specs").value.trim(),storage:$("f_storage").value.trim(),ram:$("f_ram").value.trim(),battery:$("f_battery").value.trim(),color:$("f_color").value.trim(),warranty:$("f_warranty").value.trim()};
if(!d.name||!(d.price>=0)){msg("Le nom et le prix sont obligatoires.");return}
if(JSON.stringify(photos).length>900000){msg("Photos trop lourdes. Retirez-en une.");return}
if(d.old<=d.price)d.old=0;
d.imgs=photos;d.img=photos[0]||"";
$("save").disabled=true;
try{
if(editId){await updateDoc(doc(db,"products",editId),d);reset();msg("Produit modifié.",true)}
else{d.createdAt=serverTimestamp();await addDoc(collection(db,"products"),d);reset();msg("Produit publié. Il est visible sur le site.",true)}
}catch(err){msg("Échec de l’enregistrement ("+(err.code||"erreur")+"). Vérifiez les règles Firestore.")}
$("save").disabled=false;
};

/* Liste des produits */
function listen(){
if(unsub)return;
unsub=onSnapshot(query(collection(db,"products"),orderBy("createdAt","desc")),function(snap){
items=snap.docs.map(function(d){var x=d.data();x.id=d.id;return x});
$("n").textContent=items.length;renderStats();
$("plist").innerHTML=items.length?items.map(function(p){
return '<div class="prow">'+(p.img?'<img src="'+p.img+'" alt="">':'<div class="noimg"></div>')+
'<div class="grow"><b>'+esc(p.name)+'</b>'+((p.sold||p.qty===0)?' <span class="err">· VENDU</span>':'')+(p.feat?' ★':'')+'<br><span class="meta">'+esc(p.cat)+(p.brand?' · '+esc(p.brand):'')+' · '+fmt(p.price)+(p.qty!=null?' · Stock : '+p.qty:'')+'</span></div>'+
'<div class="pbtns"><button class="sm" data-s="'+p.id+'">'+(p.sold?'Remettre en vente':'Marquer vendu')+'</button> <button class="sm" data-e="'+p.id+'">Modifier</button> <button class="sm" data-c="'+p.id+'">Dupliquer</button> <button class="sm" data-x="'+p.id+'">Supprimer</button></div></div>'}).join(""):'<p class="empty">Aucun produit pour l’instant.</p>';
},function(err){$("plist").innerHTML='<p class="err">Lecture impossible. Code d’erreur : '+esc(err.code||err.message)+'</p>'});
}
$("plist").addEventListener("click",async function(e){
var ed=e.target.getAttribute("data-e"),x=e.target.getAttribute("data-x"),s=e.target.getAttribute("data-s"),c=e.target.getAttribute("data-c");
if(s){
var q=items.filter(function(i){return i.id===s})[0];
if(q){try{await updateDoc(doc(db,"products",s),{sold:!q.sold})}catch(err){msg("Échec ("+(err.code||"erreur")+").")}}
}
if(c){
var d0=items.filter(function(i){return i.id===c})[0];if(!d0)return;
reset();photos=(d0.imgs||(d0.img?[d0.img]:[])).slice();showPrev();
$("name").value=d0.name+" (copie)";$("cat").value=d0.cat;$("brand").value=d0.brand||"";$("state").value=d0.state||"";
$("price").value=d0.price;$("old").value=d0.old||"";$("qty").value="";$("desc").value=d0.desc||"";setSpecs(d0);
$("sold").checked=false;$("feat").checked=false;
$("ftitle").textContent="Dupliquer un produit";$("cancel").hidden=false;
msg("Changez ce qui diffère (nom, prix, photos) puis touchez Publier.",true);
window.scrollTo({top:0,behavior:"smooth"});return}
if(ed){
var p=items.filter(function(i){return i.id===ed})[0];if(!p)return;
editId=ed;photos=p.imgs||(p.img?[p.img]:[]);showPrev();$("sold").checked=!!p.sold;$("old").value=p.old||"";$("brand").value=p.brand||"";$("state").value=p.state||"";$("feat").checked=!!p.feat;$("qty").value=p.qty==null?"":p.qty;setSpecs(p);
$("name").value=p.name;$("cat").value=p.cat;$("price").value=p.price;$("desc").value=p.desc||"";
$("ftitle").textContent="Modifier le produit";$("save").textContent="Enregistrer";$("cancel").hidden=false;msg("");
window.scrollTo({top:0,behavior:"smooth"});
}
if(x&&confirm("Supprimer ce produit ?")){
try{await deleteDoc(doc(db,"products",x))}catch(err){msg("Suppression impossible ("+(err.code||"erreur")+").")}
}
});

/* Avis clients */
function rmsg(t,ok){var m=$("rmsg");m.textContent=t;m.className=ok?"":"err"}
$("rphoto").onchange=async function(){var f=this.files[0];if(!f)return;rphoto=await resize(f);$("rprev").src=rphoto;$("rprev").hidden=false;this.value=""};
$("rform").onsubmit=async function(e){
e.preventDefault();
var t=$("rtext").value.trim();if(!t){rmsg("Le message est obligatoire.");return}
$("rsave").disabled=true;
try{
await addDoc(collection(db,"reviews"),{name:$("rname").value.trim(),text:t,img:rphoto,createdAt:serverTimestamp()});
$("rform").reset();rphoto="";$("rprev").hidden=true;$("rprev").removeAttribute("src");rmsg("Avis publié. Il est visible sur le site.",true)
}catch(err){rmsg("Échec ("+(err.code||"erreur")+"). Ajoutez les règles Firestore pour « reviews ».")}
$("rsave").disabled=false};
function listenR(){
if(unsubR)return;
unsubR=onSnapshot(query(collection(db,"reviews"),orderBy("createdAt","desc")),function(snap){
$("rn").textContent=snap.size;
$("rlist").innerHTML=snap.docs.map(function(d){var r=d.data();
return '<div class="prow">'+(r.img?'<img src="'+r.img+'" alt="">':'<div class="noimg"></div>')+
'<div class="grow"><b>'+esc(r.name||"Client")+'</b><br><span class="meta">'+esc(r.text)+'</span></div>'+
'<button class="sm" data-rx="'+d.id+'">Supprimer</button></div>'}).join("")||'<p class="empty">Aucun avis pour l’instant.</p>';
},function(err){$("rlist").innerHTML='<p class="err">Lecture impossible ('+esc(err.code||err.message)+'). Ajoutez les règles Firestore pour « reviews ».</p>'});
}
$("rlist").addEventListener("click",async function(e){
var x=e.target.getAttribute("data-rx");
if(x&&confirm("Supprimer cet avis ?")){try{await deleteDoc(doc(db,"reviews",x))}catch(err){rmsg("Suppression impossible ("+(err.code||"erreur")+").")}}});

/* Statistiques */
function listenS(){
if(unsubS)return;
unsubS=onSnapshot(collection(db,"stats"),function(snap){
stats={};snap.docs.forEach(function(d){stats[d.id]=d.data()});renderStats()
},function(err){$("slist").innerHTML='<p class="err">Lecture impossible ('+esc(err.code||err.message)+'). Ajoutez les règles Firestore pour « stats ».</p>'});
}
function renderStats(){
var T={v:0,c:0,a:0};
var rows=items.map(function(p){var s=stats[p.id]||{},r={n:p.name,v:s.views||0,c:s.carts||0,a:s.asks||0};T.v+=r.v;T.c+=r.c;T.a+=r.a;return r})
.sort(function(a,b){return (b.c*3+b.a*2+b.v)-(a.c*3+a.a*2+a.v)});
if(!rows.length)return;
$("slist").innerHTML='<p><b>Total :</b> '+T.v+' photos vues · '+T.c+' ajouts au panier · '+T.a+' questions WhatsApp</p>'+
rows.map(function(r){return '<div class="prow"><div class="grow"><b>'+esc(r.n)+'</b><br><span class="meta">Photos vues : '+r.v+' · Panier : '+r.c+' · Questions : '+r.a+'</span></div></div>'}).join("")}

/* Bandeau d'annonce */
function bmsg(t,ok){var m=$("bmsg");m.textContent=t;m.className=ok?"":"err"}
function listenB(){
if(unsubB)return;
unsubB=onSnapshot(doc(db,"settings","banner"),function(s){
if(bfilled)return;bfilled=true;
var d=s.exists()?s.data():{};$("btext").value=d.text||"";$("bon").checked=!!d.on
},function(err){bmsg("Lecture impossible ("+(err.code||"erreur")+"). Ajoutez les règles Firestore pour « settings ».")});
}
$("bform").onsubmit=async function(e){
e.preventDefault();$("bsave").disabled=true;
try{
await setDoc(doc(db,"settings","banner"),{text:$("btext").value.trim(),on:$("bon").checked,updatedAt:serverTimestamp()});
bmsg("Bandeau enregistré. "+($("bon").checked?"Il est visible sur le site.":"Il est masqué."),true)
}catch(err){bmsg("Échec ("+(err.code||"erreur")+"). Ajoutez les règles Firestore pour « settings ».")}
$("bsave").disabled=false};
