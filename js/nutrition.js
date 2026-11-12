(async()=>{
const doc=shell("nutrition","Nutrition","../");if(!doc)return;
const root=$("#feature"),sb=requireSupabase();
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dkey=d=>d.toLocaleDateString("sv-SE");
const TEMPLATE=[
 {kind:"meal",slot:"Petit-déjeuner",title:"Porridge avoine & cannelle",details:"8:00 · 320 kcal\nAvoine, cannelle, amandes, myrtilles"},
 {kind:"meal",slot:"Déjeuner",title:"Bowl anti-inflammatoire",details:"13:00 · 410 kcal\nQuinoa, pois chiches, épinards, curcuma, huile d’olive"},
 {kind:"meal",slot:"Dîner",title:"Saumon & légumes verts",details:"20:00 · 380 kcal\nSaumon, brocoli, courgette, citron"},
 {kind:"move",slot:"Marche rapide",title:"30 min · Après le déjeuner",details:"Améliore la sensibilité à l’insuline"},
 {kind:"move",slot:"Yoga doux",title:"25 min · Soir",details:"Réduit le stress et le cortisol"}];
let patients=[],cur=new URLSearchParams(location.search).get("patient"),items=[],checks=[],editing=null,doctorId=null;

async function loadPatients(){
 patients=(await patientService.all()).filter(p=>p.recordType!=="managed");
 if(!cur||!patients.some(p=>p.id===cur))cur=patients[0]?.id||null;
 if(!doctorId)doctorId=await authService.doctorId();
}
async function loadPlan(){
 if(!cur){items=[];checks=[];return}
 const since=dkey(new Date(Date.now()-6*864e5));
 const [a,b]=await Promise.all([
  sb.from("patient_nutrition_items").select("*").eq("patient_id",cur).order("sort_order").order("created_at"),
  sb.from("patient_nutrition_checks").select("*").eq("patient_id",cur).gte("check_date",since)]);
 if(a.error)throw a.error;if(b.error)throw b.error;items=a.data||[];checks=b.data||[];
}
const nextOrder=()=>items.reduce((m,x)=>Math.max(m,x.sort_order||0),0)+1;
async function insertRows(rows){
 const {error}=await sb.from("patient_nutrition_items").insert(rows.map((r,i)=>({doctor_id:doctorId,patient_id:cur,kind:r.kind,slot:r.slot,title:r.title,details:r.details||"",sort_order:nextOrder()+i})));
 if(error)throw error;
}
function week(){
 const ids=new Set(items.map(x=>x.id)),out=[];
 for(let i=0;i<7;i++){const d=new Date(Date.now()-i*864e5),k=dkey(d);
  const done=checks.filter(c=>c.check_date===k&&c.done&&ids.has(c.item_id)).length;out.push({k,done,total:items.length})}
 return out;
}
const row=x=>`<li style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><div><small class="muted">${esc(x.slot)}</small><div><b>${esc(x.title)}</b></div><div class="muted" style="font-size:13px">${esc(x.details).replace(/\n/g,"<br>")}</div></div><div style="display:flex;gap:6px"><button class="obs-ib" title="Modifier" data-edit="${esc(x.id)}"><i data-lucide="pencil"></i></button><button class="obs-ib danger" title="Supprimer" data-del="${esc(x.id)}"><i data-lucide="trash-2"></i></button></div></li>`;

function draw(){
 const p=patients.find(x=>x.id===cur),meals=items.filter(x=>x.kind==="meal"),moves=items.filter(x=>x.kind==="move"),w=week(),today=w[0];
 const avg=items.length?Math.round(w.reduce((s,d)=>s+d.done,0)*100/(items.length*7)):0;
 root.innerHTML=`<div class="feature-head"><div><p class="muted">AURAFEM · ESPACE MÉDICAL</p><h2>Nutrition</h2><p class="muted">Définissez le plan repas et mouvement de chaque patiente : elle le voit dans son application et coche ce qu’elle réalise.</p></div>
  ${cur?`<button class="btn p" id="add"><i data-lucide="plus"></i>Ajouter un élément</button>`:""}</div>
  ${patients.length?`<label style="display:block;max-width:360px;margin-bottom:16px">Patiente<select id="pat">${patients.map(x=>`<option value="${esc(x.id)}" ${x.id===cur?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label>`:`<div class="card muted">Aucune patiente liée à votre compte pour le moment.</div>`}
  ${cur?`<div class="grid g6"><div class="card stat"><div class="v">${items.length}</div><div class="l">Éléments du plan</div></div><div class="card stat"><div class="v">${today.done} / ${today.total}</div><div class="l">Réalisés aujourd’hui</div></div><div class="card stat"><div class="v">${avg} %</div><div class="l">Réalisation sur 7 jours</div></div></div>
  ${items.length?"":`<div class="card" style="margin-top:16px"><h3>Aucun plan pour ${esc(p?.name||"cette patiente")}</h3><p class="muted">Ajoutez des éléments un par un, ou partez du modèle AuraFem (3 repas + 2 mouvements) puis adaptez-le.</p><button class="btn" id="tpl" style="margin-top:8px"><i data-lucide="copy"></i>Charger le modèle AuraFem</button></div>`}
  <div class="feature-grid" style="margin-top:16px"><div class="card"><h3>Repas</h3><ul class="list" style="list-style:none;padding:0;margin:0">${meals.map(row).join("")||'<li class="muted">Aucun repas.</li>'}</ul></div><div class="card"><h3>Mouvement</h3><ul class="list" style="list-style:none;padding:0;margin:0">${moves.map(row).join("")||'<li class="muted">Aucun mouvement.</li>'}</ul></div></div>
  <div class="card" style="margin-top:16px"><h3>7 derniers jours</h3><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${w.slice().reverse().map(d=>`<div style="text-align:center;min-width:54px"><div style="height:60px;width:26px;margin:0 auto;border-radius:8px;background:var(--border);position:relative;overflow:hidden"><i style="position:absolute;left:0;right:0;bottom:0;height:${d.total?Math.round(d.done*100/d.total):0}%;background:var(--magenta)"></i></div><small class="muted">${d.k.slice(8)}/${d.k.slice(5,7)}</small><div style="font-size:12px"><b>${d.done}/${d.total}</b></div></div>`).join("")}</div></div>`:""}
  <div class="modal" id="modal"><form id="form"><h3 id="mt">Nouvel élément</h3>
   <label>Type<select name="kind"><option value="meal">Repas</option><option value="move">Mouvement</option></select></label>
   <label>Libellé<input name="slot" required maxlength="60" placeholder="Petit-déjeuner, Marche rapide…"></label>
   <label>Titre<input name="title" required maxlength="120" placeholder="Porridge avoine & cannelle"></label>
   <label>Détails<textarea name="details" rows="3" maxlength="500" placeholder="8:00 · 320 kcal&#10;Avoine, cannelle, amandes…"></textarea></label>
   <div class="feature-actions" style="justify-content:flex-end"><button type="button" class="btn" id="cancel">Annuler</button><button class="btn p">Enregistrer</button></div></form></div>`;
 const modal=$("#modal"),form=$("#form"),close=()=>{editing=null;form.reset();$("#mt").textContent="Nouvel élément";modal.classList.remove("open")};
 $("#cancel").onclick=close;
 if($("#pat"))$("#pat").onchange=async e=>{cur=e.target.value;history.replaceState(null,"","?patient="+encodeURIComponent(cur));await refresh()};
 if($("#add"))$("#add").onclick=()=>{close();modal.classList.add("open")};
 if($("#tpl"))$("#tpl").onclick=async()=>{try{await insertRows(TEMPLATE);toast("Modèle chargé");await refresh()}catch(err){toast(err.message||"Échec");console.error(err)}};
 root.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const x=items.find(i=>i.id===b.dataset.edit);if(!x)return;editing=x;
  form.elements.kind.value=x.kind;form.elements.slot.value=x.slot;form.elements.title.value=x.title;form.elements.details.value=x.details||"";$("#mt").textContent="Modifier l’élément";modal.classList.add("open")});
 root.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(!confirm("Supprimer cet élément du plan ? L’historique de coches associé sera aussi supprimé."))return;
  try{const {data,error}=await sb.from("patient_nutrition_items").delete().eq("id",b.dataset.del).select("id");if(error)throw error;if(!data?.length)throw new Error("Suppression refusée.");toast("Élément supprimé");await refresh()}catch(err){toast(err.message||"Échec");console.error(err)}});
 form.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form));
  try{
   if(editing){const {data,error}=await sb.from("patient_nutrition_items").update({kind:v.kind,slot:v.slot.trim(),title:v.title.trim(),details:v.details.trim(),updated_at:new Date().toISOString()}).eq("id",editing.id).select("id");if(error)throw error;if(!data?.length)throw new Error("Modification refusée.")}
   else await insertRows([{kind:v.kind,slot:v.slot.trim(),title:v.title.trim(),details:v.details.trim()}]);
   const was=!!editing;close();toast(was?"Élément modifié":"Élément ajouté");await refresh()
  }catch(err){toast(err.message||"Échec de l’enregistrement");console.error(err)}};
 window.lucide&&lucide.createIcons();
}
async function refresh(){await loadPlan();draw()}
try{await loadPatients();await loadPlan();draw()}
catch(e){console.error(e);root.innerHTML=`<div class="card">Erreur : ${esc(e.message)}<p class="muted">Avez-vous exécuté SUPABASE_NUTRITION_PLAN.sql dans Supabase ?</p></div>`}
})();
