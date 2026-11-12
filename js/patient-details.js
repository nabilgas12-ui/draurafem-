(async()=>{
try{

shell("patients","Dossier médical","../");const id=new URLSearchParams(location.search).get("id");let ch;
async function draw(){const p=await patientService.get(id);if(!p){$("#d").innerHTML='<p class="muted">Dossier introuvable.</p>';return}
 const w=p.weights.at(-1)?.kg,bmi=w?(w/((p.height/100)**2)).toFixed(1):"—",age=Math.floor((Date.now()-new Date(p.birth))/3.156e10);
 $("#head").innerHTML=`<div class="patient-detail-heading"><div class="av patient-av patient-av-lg">${avImg(p.name,p.photo)}</div><div><h2>${p.name}</h2><div class="muted">${age||"—"} ans · ${p.phone||"Téléphone non renseigné"} · ${p.address||"Adresse non renseignée"}</div></div></div><a class="btn" href="patients.html">Retour à la liste</a>`;
 $("#ov").innerHTML=[["Poids actuel",w?w+" kg":"—"],["Taille",p.height+" cm"],["IMC",bmi],["Cycle moyen",p.cycleDays+" jours"],["Diagnostic",fmt(p.diagnosis)],["Observance",p.recordType==="managed"?"Suivi cabinet":p.adherence+" %"]].map(([l,v])=>`<div class="card stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
 $("#sy").innerHTML=p.symptoms.map(s=>`<span class="badge">${s}</span>`).join(" ")||'<span class="muted">Aucun symptôme enregistré.</span>';
 $("#nl").innerHTML=p.notes.map(n=>`<li><div><b>${fmt(n.date)}</b><div>${n.text}</div></div></li>`).join("")||'<li class="muted">Aucune note pour le moment.</li>';
 ch?.destroy();ch=chart($("#cw"),"line",{labels:p.weights.map(x=>fmt(x.date)),datasets:[{label:"Poids (kg)",data:p.weights.map(x=>x.kg),borderColor:palette()[1],tension:.3}]});
 const E=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const mo=["#C62F4B","#E0703A","#E0A000","#6BA84F","#1E9E5A"];
 $("#hl").innerHTML=(p.dailyLogs||[]).map(x=>`<li><div><b>${fmt(x.log_date)}${x.cycle_day?" · J"+x.cycle_day:""}</b><div>${x.mood!=null?`<span class="badge" style="background:${mo[x.mood]};color:#fff">${MOOD_LABELS[x.mood]}</span> `:""}${(x.symptoms||[]).map(s=>`<span class="badge">${E(s)}</span>`).join(" ")||'<span class="muted">Aucun symptôme</span>'}${x.weight_kg!=null?` · <b>${x.weight_kg} kg</b>`:""}</div>${x.note?`<div class="muted"><i>${E(x.note)}</i></div>`:""}</div></li>`).join("")||'<li class="muted">La patiente n’a pas encore rempli son journal.</li>';
 const takenN=(p.last14||[]).filter(x=>x.state==="taken").length;
 $("#ad").innerHTML=p.recordType==="managed"?'<p class="muted">Dossier cabinet : pas de données de l’application.</p>':`<div class="grid g6" style="margin-bottom:14px"><div class="card stat"><div class="v">${p.adherence} %</div><div class="l">Observance (30 j)</div></div><div class="card stat"><div class="v">${takenN} / 14</div><div class="l">Prises sur 14 jours</div></div></div><div style="display:flex;gap:6px;flex-wrap:wrap">${(p.last14||[]).map(x=>`<div style="text-align:center;font-size:11px" class="muted"><i style="width:26px;height:26px;border-radius:50%;display:block;margin:0 auto 4px;background:${x.state==="taken"?"var(--magenta)":x.state==="missed"?"#E0A000":"var(--border)"}"></i>${x.date.slice(8)}/${x.date.slice(5,7)}</div>`).join("")}</div><p class="muted" style="margin-top:12px">● magenta : pris · ● orange : oublié · ● gris : pas de donnée</p>`}
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x==t));document.querySelectorAll("[data-p]").forEach(x=>x.hidden=x.dataset.p!=t.dataset.t)});
$("#nf").onsubmit=async e=>{e.preventDefault();const t=$("#nt").value.trim();if(!t)return;await patientService.addNote(id,t);$("#nt").value="";toast("Note ajoutée");draw()};
await draw();

}catch(e){console.error(e);const c=document.getElementById("content");if(c)c.hidden=false}
})();