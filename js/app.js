(()=>{if(document.querySelector('link[href*="themes.css"]'))return;const st=document.querySelector('link[href*="style.css"]');if(!st)return;const l=document.createElement("link");l.rel="stylesheet";l.href=st.getAttribute("href").replace(/style\.css.*$/,"themes.css?v=2");st.after(l)})();

const t=(()=>{const d=document.documentElement,l=localStorage;let t=l.getItem("af_theme")||"light";if(t==="auto")t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";d.dataset.theme=t;d.dataset.palette=l.getItem("af_palette")||"orchid";d.dataset.side=l.getItem("af_side")||"dark";return t})();
const $=(s,r=document)=>r.querySelector(s);
const initials=n=>n.split(" ").map(w=>w[0]).slice(0,2).join("");
const PHOTOS=[44,68,12,65,33,21,79,5,47,26,90,56,17,39,62,8,71,2,85,30];
const photoUrl=n=>{let h=0;for(const c of String(n||""))h=(h*31+c.charCodeAt(0))>>>0;return`https://randomuser.me/api/portraits/women/${PHOTOS[h%PHOTOS.length]}.jpg`};
const avImg=(n,url)=>{const i=initials(String(n||"?").replace("Dr. ",""));return url?`<img class="av-img" src="${url}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${i}'))">`:i};
const pn=n=>`<span class="who-inline"><span>${String(n).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</span></span>`;
const fmt=d=>{if(!d||d==="—")return "—";const t=new Date(d);return isNaN(t)?String(d):t.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})};
const toast=m=>{const e=document.createElement("div");e.className="toast";e.textContent=m;document.body.append(e);setTimeout(()=>e.remove(),2600)};
const NAV=[["dashboard","Vue d'ensemble","grid-2x2","dashboard.html"],["patients","Mes patientes","users-round","pages/patients.html"],["hormonal","Suivi hormonal","activity","pages/hormonal.html"],["adherence","Observance","pill","pages/adherence.html"],["nutrition","Nutrition","salad","pages/nutrition.html"],["appointments","Rendez-vous","calendar","pages/appointments.html"],["reports","Rapports médicaux","file-text","pages/reports.html"],["messages","Messages","message-square","pages/messages.html"],["insights","Données & Insights","chart-no-axes-column","pages/insights.html"],["settings","Paramètres","settings","pages/settings.html"]];
function shell(active,title,base=""){const doc=authService.current();if(!doc){location.href=base+"login.html";return}
 // Session Supabase absente ou d'un autre compte que le profil affiché : retour à la connexion (au lieu d'erreurs obscures).
 try{requireSupabase().auth.getSession().then(({data})=>{const u=data?.session?.user;if(!u||(doc.auth_id&&u.id!==doc.auth_id)){sessionStorage.removeItem("af_doctor_profile");localStorage.removeItem("af_doctor_profile");location.href=base+"login.html"}})}catch(_){}
 const main=$("#content");document.body.insertAdjacentHTML("afterbegin",`<div class="shell" id="shell"><aside class="side"><button class="side-close ib" id="sideClose" aria-label="Fermer le menu"><i data-lucide="x"></i></button><a class="brand" href="${base}dashboard.html"><img src="${base}assets/images/aurafem_logo.png" alt="AuraFem" class="logo-tile"><span>AuraFem</span></a>
 <div class="side-section-label">Workspace</div>
 ${NAV.slice(0,5).map(([k,l,i,h])=>`<a class="nav ${k==active?"on":""} ${h?"":"soon"}" href="${h?base+h:"#"}"><i data-lucide="${i}"></i><span class="nl">${l}</span>${h?"":'<small class="nl">Bientôt</small>'}</a>`).join("")}
 <div class="side-divider"></div>
 ${NAV.slice(5,8).map(([k,l,i,h])=>`<a class="nav ${k==active?"on":""} ${h?"":"soon"}" href="${h?base+h:"#"}"><i data-lucide="${i}"></i><span class="nl">${l}</span>${h?"":'<small class="nl">Bientôt</small>'}</a>`).join("")}
 <div class="side-divider"></div>
 ${NAV.slice(8).map(([k,l,i,h])=>`<a class="nav ${k==active?"on":""} ${h?"":"soon"}" href="${h?base+h:"#"}"><i data-lucide="${i}"></i><span class="nl">${l}</span>${h?"":'<small class="nl">Bientôt</small>'}</a>`).join("")}
 <div class="side-version">AuraFem · v4</div><a class="side-profile" href="${base}pages/profile.html" title="Mon profil"><div class="side-profile-avatar">${avImg(doc.name,doc.photo_url)}</div><div class="side-profile-info"><b>${doc.name}</b><small>${doc.specialty||"Gynécologue"}</small></div><i data-lucide="chevron-right"></i></a></aside><button class="drawer-backdrop" id="drawerBackdrop" aria-label="Fermer le menu"></button>
 <div class="main"><header class="top"><button class="ib" id="burger" aria-label="Menu"><i data-lucide="menu"></i></button><h1>${title}</h1>
 <label class="search"><i data-lucide="search"></i><input placeholder="Rechercher une patiente…" id="gs"></label>
 <a class="ib bell-btn" id="bell" href="${base}pages/notifications.html" aria-label="Notifications" title="Notifications"><i data-lucide="bell"></i><span class="notif-badge" id="notifBadge" hidden>0</span></a>
 <button class="ib" id="theme" aria-label="Changer de thème"><i data-lucide="${t=="dark"?"sun":"moon"}"></i></button>
 <div class="top-date"><i data-lucide="calendar-days"></i>${new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}</div>
 <a class="top-home" href="${base}dashboard.html"><i data-lucide="house"></i><span>Accueil</span></a>
 <button class="ib" id="out" title="Se déconnecter"><i data-lucide="log-out"></i></button><a class="av" href="${base}pages/profile.html" title="Mon profil">${avImg(doc.name,doc.photo_url)}</a></header><div class="page" id="slot"></div></div></div>`);
 $("#slot").append(main);main.hidden=false;
 $("#burger").onclick=()=>{if(matchMedia("(min-width:901px)").matches)$("#shell").classList.toggle("collapsed");else $("#shell").classList.toggle("open")};
 const closeDrawer=()=>$("#shell").classList.remove("open");
 $("#sideClose").onclick=closeDrawer;$("#drawerBackdrop").onclick=closeDrawer;
 $("#shell").querySelectorAll(".nav").forEach(a=>a.addEventListener("click",closeDrawer));
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer()});
 $("#theme").onclick=()=>{
  const rootEl=document.documentElement, next=rootEl.dataset.theme==="dark"?"light":"dark";
  const btn=$("#theme"); btn.classList.add("theme-switching");
  rootEl.classList.add("theme-transitioning");
  rootEl.dataset.theme=next; localStorage.setItem("af_theme",next);
  btn.innerHTML=`<i data-lucide="${next==="dark"?"sun":"moon"}"></i>`;
  btn.setAttribute("aria-label",next==="dark"?"Passer au mode jour":"Passer au mode nuit");
  window.lucide&&lucide.createIcons();
  setTimeout(()=>{rootEl.classList.remove("theme-transitioning");btn.classList.remove("theme-switching")},650);
};
document.querySelectorAll('a[href]').forEach(a=>{
  const href=a.getAttribute("href");
  if(!href||href.startsWith("#")||a.target==="_blank"||a.hasAttribute("download"))return;
  a.addEventListener("click",e=>{
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin||url.pathname===location.pathname&&url.search===location.search)return;
    e.preventDefault();document.documentElement.classList.add("page-leaving");
    const bar=document.createElement("div");bar.className="route-progress";document.body.append(bar);
    requestAnimationFrame(()=>bar.classList.add("run"));
    setTimeout(()=>location.href=url.href,180);
  });
});
 $("#out").onclick=()=>{authService.logout();location.href=base+"login.html"};
 $("#gs").onkeydown=e=>{if(e.key=="Enter")location.href=`${base}pages/patients.html?q=${encodeURIComponent(e.target.value)}`};
 window.lucide&&lucide.createIcons();notifService.init(doc);return doc}


/* ===== Notifications envoyées par l'administrateur (badge + liste) ===== */
const notifService={
 _doc:null,_items:[],_ready:false,_timer:null,_ch:null,
 esc:x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),
 _key(){return "af_notif_read_"+(this._doc?.id||"x")},
 _readSet(){try{return new Set(JSON.parse(localStorage.getItem(this._key())||"[]").map(String))}catch(e){return new Set()}},
 _saveRead(set){try{localStorage.setItem(this._key(),JSON.stringify([...set].slice(-500)))}catch(e){}},
 unread(){const r=this._readSet();return this._items.filter(n=>!r.has(String(n.id)))},
 isRead(id){return this._readSet().has(String(id))},
 async fetch(){
  if(!window.sbReady)return this._items;
  const {data,error}=await window.sb.from("notifications").select("*").in("audience",["doctors","everyone"]).order("sent_at",{ascending:false}).limit(100);
  if(error){console.warn("[notifications]",error.message);return this._items}
  const hidden=["draft","scheduled","failed","cancelled","canceled"];
  this._items=(data||[]).filter(n=>!hidden.includes(String(n.status||"").toLowerCase())).map(n=>({id:n.id,title:n.title||"Notification",body:n.body||"",audience:n.audience,date:n.sent_at||n.created_at||""}));
  return this._items},
 renderBadge(){
  const b=document.getElementById("notifBadge");if(!b)return;
  const n=this.unread().length;
  b.hidden=n===0;b.textContent=n>99?"99+":String(n);
  document.getElementById("bell")?.classList.toggle("has-new",n>0);
  document.getElementById("bell")?.setAttribute("aria-label",n?`Notifications (${n} non lues)`:"Notifications")},
 async refresh(){
  const before=new Set(this._items.map(n=>String(n.id)));
  await this.fetch();
  if(this._ready){const fresh=this.unread().filter(n=>!before.has(String(n.id)));
   if(fresh.length&&!document.body.classList.contains("on-notifs"))toast("🔔 "+(fresh.length>1?fresh.length+" nouvelles notifications":fresh[0].title))}
  this._ready=true;this.renderBadge();
  document.dispatchEvent(new CustomEvent("af:notifs",{detail:this._items}))},
 markAllRead(){const r=this._readSet();this._items.forEach(n=>r.add(String(n.id)));this._saveRead(r);this.renderBadge()},
 init(doc){
  this._doc=doc;this.renderBadge();
  this.refresh();
  clearInterval(this._timer);this._timer=setInterval(()=>this.refresh(),30000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)this.refresh()});
  window.addEventListener("storage",e=>{if(e.key===this._key())this.renderBadge()});
  try{if(window.sbReady&&!this._ch){this._ch=window.sb.channel("doctor-notifs-"+(doc.id||"x")).on("postgres_changes",{event:"*",schema:"public",table:"notifications"},()=>this.refresh()).subscribe()}}catch(e){}}
};
