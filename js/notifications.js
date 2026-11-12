(()=>{
const doc=shell("notifications","Notifications","../");if(!doc)return;
document.body.classList.add("on-notifs");
const root=$("#feature"),S=notifService;
const when=d=>{if(!d)return "";const t=new Date(d);return isNaN(t)?"":t.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})+" · "+t.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})};
let seen=null; // ids déjà lus avant l'ouverture de la page (pour mettre en évidence les nouvelles)
function draw(){
 const items=S._items;
 if(seen===null)seen=S._readSet();
 const fresh=items.filter(n=>!seen.has(String(n.id))).length;
 root.innerHTML=`<div class="feature-head"><div><p class="muted">AURAFEM · ESPACE MÉDICAL</p><h2>Notifications</h2><p class="muted">Messages envoyés par l'équipe AuraFem aux médecins.</p></div><div class="notif-count">${fresh?`<span class="notif-pill">${fresh} nouvelle${fresh>1?"s":""}</span>`:""}</div></div>
 <div class="notif-list">${items.length?items.map(n=>{const isNew=!seen.has(String(n.id));return `<article class="card notif-item ${isNew?"is-new":""}"><div class="notif-ico"><i data-lucide="${isNew?"bell-ring":"bell"}"></i></div><div class="notif-body"><div class="notif-top"><h3>${S.esc(n.title)}</h3>${isNew?'<span class="notif-new">Nouveau</span>':""}</div>${n.body?`<p>${S.esc(n.body).replace(/\n/g,"<br>")}</p>`:""}<small class="muted">${S.esc(when(n.date))}${n.audience==="everyone"?" · Tout le monde":" · Médecins"}</small></div></article>`}).join(""):`<div class="card notif-empty"><i data-lucide="bell-off"></i><h3>Aucune notification</h3><p class="muted">Les messages envoyés depuis le tableau de bord administrateur apparaîtront ici.</p></div>`}</div>`;
 window.lucide&&lucide.createIcons();
 S.markAllRead(); // le badge disparaît dès l'ouverture
}
document.addEventListener("af:notifs",draw);
S.refresh().then(draw);
})();
