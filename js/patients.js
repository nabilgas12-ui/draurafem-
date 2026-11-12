(async()=>{
try{

shell("patients","Mes patientes","../");
const qs=new URLSearchParams(location.search),st={q:qs.get("q")||"",status:"",sort:"name",dir:1,page:1,size:8,edit:null};$("#q").value=st.q;
const LB={active:["Active","ok"],suivi:["En suivi",""],attention:["Attention","danger"],"archivée":["Archivée","warn"]};
async function draw(){const{total,items}=await patientService.list(st);
 $("#rows").innerHTML=items.map(p=>`<tr><td><div class="patient-row"><a class="av patient-av" href="patient-details.html?id=${p.id}" title="${p.name}">${avImg(p.name,p.photo)}</a><div class="patient-name"><a href="patient-details.html?id=${p.id}"><b>${p.name}</b></a><div class="muted">${p.phone||p.address|| (p.recordType==="managed"?"Dossier créé par la médecin":p.email)}</div></div></div></td>
 <td><span class="badge ${(LB[p.status]||["En suivi",""])[1]}">${(LB[p.status]||["En suivi",""])[0]}</span></td><td>${fmt(p.lastActivity)}</td><td><div class="bar"><i style="width:${p.adherence}%"></i></div>${p.adherence} %</td>
 <td style="white-space:nowrap"><a class="btn" href="patient-details.html?id=${p.id}">Dossier</a> ${p.recordType==="managed"?`<button class="btn" data-edit="${p.id}">Modifier</button><button class="btn danger-action" data-delete="${p.id}">Supprimer</button>`:""}</td></tr>`).join("")||`<tr><td colspan=5 class="muted">Aucune patiente ne correspond à votre recherche.</td></tr>`;
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editPatient(b.dataset.edit));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deletePatient(b.dataset.delete));
 const pages=Math.max(1,Math.ceil(total/st.size));$("#info").textContent=`${total} patiente(s) · page ${st.page}/${pages}`;$("#prev").disabled=st.page<=1;$("#next").disabled=st.page>=pages}
$("#q").oninput=e=>{st.q=e.target.value;st.page=1;draw()};$("#f").onchange=e=>{st.status=e.target.value;st.page=1;draw()};
$("#s").onchange=e=>{const[a,b]=e.target.value.split(":");st.sort=a;st.dir=+b;draw()};
$("#prev").onclick=()=>{st.page--;draw()};$("#next").onclick=()=>{st.page++;draw()};
const open=()=>{st.edit=null;$("#f2").reset();$("#mt").textContent="Ajouter une patiente";$("#m").classList.add("open")};
async function editPatient(id){try{const p=await patientService.get(id);if(!p||p.recordType!=="managed")return toast("Seuls les dossiers créés par la médecin sont modifiables ici.");st.edit=id;const f=$("#f2");f.reset();f.elements.full_name.value=p.name||"";f.elements.birth_date.value=p.birth||"";f.elements.phone.value=p.phone||"";f.elements.address.value=p.address||"";f.elements.profession.value=p.profession||"";f.elements.initial_reason.value=p.initial_reason||"";f.elements.diagnosis.value=p.diagnosis||"";f.elements.notes.value=p.rawNotes||"";$("#mt").textContent="Modifier le dossier de la patiente";$("#err").textContent="";$("#m").classList.add("open")}catch(err){toast(err.message||"Impossible de charger le dossier.")}}
async function deletePatient(id){const p=await patientService.get(id);if(!p||p.recordType!=="managed")return toast("Ce dossier ne peut pas être supprimé depuis cette liste.");if(!confirm(`Supprimer définitivement le dossier de « ${p.name} » et son historique de suivi ? Cette action est irréversible.`))return;try{await patientService.remove(id);toast("Dossier supprimé.");draw()}catch(err){toast(err.message||"Impossible de supprimer le dossier.")}}
$("#add").onclick=open;$("#x").onclick=()=>$("#m").classList.remove("open");if(qs.get("new"))open();
$("#f2").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
 if(!d.full_name?.trim())return $("#err").textContent="Le nom complet est obligatoire.";$("#err").textContent="";
 try{if(st.edit)await patientService.update(st.edit,d);else await patientService.add(d);$("#m").classList.remove("open");toast(st.edit?"Dossier de la patiente modifié avec succès.":"Dossier de la patiente créé avec succès.");st.edit=null;draw()}catch(err){$("#err").textContent=err.message||"Impossible d’enregistrer le dossier."}};
async function drawQR(){
 const box=$("#qrBox"),code=$("#qrCode"),meta=$("#qrMeta"),cp=$("#qrCopy"),pr=$("#qrPrint");
 try{
  const row=await linkCodeService.get();
  if(!row){box.innerHTML='<span class="muted">Aucun code actif</span>';code.textContent="—";meta.textContent="Aucun code n’a encore été généré pour votre compte. Contactez l’administration AuraFem pour en obtenir un.";return}
  box.innerHTML="";
  if(window.QRCode)new QRCode(box,{text:row.code,width:180,height:180,correctLevel:QRCode.CorrectLevel.M});else box.textContent=row.code;
  code.textContent=row.code;cp.hidden=pr.hidden=false;
  meta.textContent=`${row.uses_count||0} patiente(s) liée(s) avec ce code.`;
  cp.onclick=()=>{navigator.clipboard?.writeText(row.code);toast("Code copié.")};
  pr.onclick=()=>{const w=window.open("","_blank","width=480,height=700");if(!w)return toast("Autorisez les fenêtres pop-up pour imprimer.");
   const img=box.querySelector("canvas")?.toDataURL("image/png")||box.querySelector("img")?.src||"";
   const d=authService.current()||{},esc=t=>String(t||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
   const photo=d.photo_url?`<img src="${esc(d.photo_url)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #d6247a;margin-bottom:8px">`:"";
   const lines=[d.clinic&&`<div>${esc(d.clinic)}</div>`,d.phone&&`<div>${esc(d.phone)}</div>`,d.email&&`<div>${esc(d.email)}</div>`].filter(Boolean).join("");
   w.document.write(`<title>QR AuraFem</title><body style="font-family:sans-serif;text-align:center;padding:40px">${photo}<h2 style="margin:4px 0">Dr ${esc(d.name)}</h2><div style="color:#d6247a;font-weight:600;margin-bottom:6px">${esc(d.specialty||"Gynécologue")}</div><div style="color:#444;font-size:14px;margin-bottom:24px">${lines}</div><h3>Rejoignez mon suivi sur AuraFem</h3><img src="${img}" width="260" height="260"><h1 style="letter-spacing:3px">${row.code}</h1><p>Scannez ce QR code dans l’application AuraFem.</p><script>onload=()=>setTimeout(print,300)<\/script></body>`);w.document.close()};
 }catch(err){box.innerHTML='<span class="muted">—</span>';meta.textContent="Impossible de charger le code : "+(err.message||err)}
}
drawQR();
draw();

}catch(e){console.error(e);const c=document.getElementById("content");if(c)c.hidden=false}
})();