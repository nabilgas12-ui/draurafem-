// Accès aux données réelles. Les règles RLS de Supabase restent la frontière de sécurité.
const trackingMath={
 day:d=>String(d||"").slice(0,10),
 // Observance : jours pris / jours écoulés depuis la 1re prise (30 j max) — même formule que l'appli patiente.
 adherence(doses){
  const taken=new Set((doses||[]).filter(x=>x.taken).map(x=>this.day(x.log_date)));
  if(!taken.size)return 0;
  const today=new Date();today.setHours(0,0,0,0);
  const first=new Date([...taken].sort()[0]+"T00:00:00");
  const span=Math.min(30,Math.max(1,Math.round((today-first)/864e5)+1));
  const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-(span-1));
  const n=[...taken].filter(d=>new Date(d+"T00:00:00")>=cutoff).length;
  return Math.max(0,Math.min(100,Math.round(n*100/span)));
 },
 // Les 14 derniers jours : "taken" | "missed" | "none" (avant la 1re prise) — pour les pastilles.
 last14(doses){
  const m=new Map((doses||[]).map(x=>[this.day(x.log_date),x.taken]));
  const first=[...m.entries()].filter(([,t])=>t).map(([d])=>d).sort()[0]||null;
  const out=[],today=new Date();today.setHours(0,0,0,0);
  for(let i=13;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toLocaleDateString("sv-SE");
   out.push({date:k,state:m.get(k)?"taken":(first&&k>=first&&i>0||first&&k>=first&&m.has(k))?"missed":"none"})}
  return out;
 }
};
const MOOD_LABELS=["Très mal","Mal","Moyen","Bien","Super"];
const patientService={
 mapPatient(row,profile={},logs=[],observations=[],daily=[],doses=[]){
  const full=row.full_name||row.name||row.patient_name||"Patiente";
  const health=profile||{};
  const symptoms=[...logs.map(x=>x.symptoms||x.symptom||x.symptom_name),...daily.map(x=>x.symptoms)].filter(Boolean).flatMap(x=>Array.isArray(x)?x:String(x).split(/[,;]+/)).map(x=>x.trim()).filter(Boolean);
  const weights=daily.filter(x=>x.weight_kg!=null).map(x=>({date:trackingMath.day(x.log_date),kg:Number(x.weight_kg)})).sort((a,b)=>a.date.localeCompare(b.date));
  const lastTrack=[...daily.map(x=>trackingMath.day(x.log_date)),...doses.map(x=>trackingMath.day(x.log_date))].sort().at(-1)||"";
  return {id:row.id,name:full,photo:row.photo_url||row.avatar_url||row.profile_photo_url||row.profile_image_url||row.image_url||row.picture_url||"",email:row.email||"",phone:row.phone||"",address:row.address||"",profession:row.profession||"",recordType:row.record_type||"linked",birth:row.birth_date||row.date_of_birth||"",rawNotes:row.notes||"",
   diagnosis:row.diagnosis_date||row.diagnosis||"",initial_reason:row.initial_reason||"",created:(row.created_at||"").slice(0,10),createdAt:row.created_at,
   status:row.status==="archived"?"archivée":row.status==="active"?"active":row.status||"suivi",
   height:health.height_cm||health.height||165,history:health.medical_history||"",allergies:health.allergies||"",
   chronic_conditions:health.chronic_conditions||"",blood_group:health.blood_group||"",
   adherence:doses.length?trackingMath.adherence(doses):(row.adherence_percentage||row.adherence||0),lastActivity:[lastTrack,row.last_activity_at?.slice(0,10),row.updated_at?.slice(0,10)].filter(Boolean).sort().at(-1)||"—",
   dailyLogs:daily,doses,last14:trackingMath.last14(doses),
   symptoms:[...new Set(symptoms)],weights,cycleDays:health.average_cycle_length||28,
   notes:[...(row.initial_reason||row.notes?[{date:row.created_at,text:[row.initial_reason,row.notes].filter(Boolean).join("\n"),title:"Informations initiales",type:"clinical"}]:[]),...observations.map(o=>({date:o.observed_on,text:o.details||o.title||"",title:o.title,type:o.observation_type,id:o.id}))]};
 },
 async list({q="",status="",sort="name",dir=1,page=1,size=8}={}){
  const all=await this.all();let filtered=all.filter(p=>(p.name||"").toLowerCase().includes(q.toLowerCase())&&(!status||p.status===status));
  filtered.sort((a,b)=>((a[sort]??"")>(b[sort]??"")?1:-1)*dir);
  return {total:filtered.length,items:filtered.slice((page-1)*size,page*size)};
 },
 async all(){
  const sb=requireSupabase();
  const {data:managed,error:me}=await sb.from("doctor_managed_patients").select("*").order("created_at",{ascending:false});
  if(me)throw me;
  const {data:links,error}=await sb.from("doctor_patient_links").select("patient_id,status").eq("status","active");
  if(error)throw error;if(!links?.length)return (managed||[]).map(p=>this.mapPatient({...p,record_type:"managed"}, {}, [], []));
  const ids=links.map(x=>x.patient_id);
  const since=new Date(Date.now()-90*864e5).toLocaleDateString("sv-SE");
  const soft=async q=>{const r=await q;if(r.error){console.warn("[suivi patiente] table indisponible :",r.error.message);return {data:[]}}return r};
  const [pr,hp,sy,ob,dl,ds]=await Promise.all([
   sb.from("patients").select("*").in("id",ids),
   sb.from("patient_health_profiles").select("*").in("patient_id",ids),
   sb.from("symptom_logs").select("*").in("patient_id",ids).order("created_at",{ascending:false}),
   sb.from("doctor_observations").select("*").in("patient_id",ids).order("observed_on",{ascending:false}),
   soft(sb.from("patient_daily_logs").select("*").in("patient_id",ids).gte("log_date",since).order("log_date",{ascending:false}).order("created_at",{ascending:false})),
   soft(sb.from("patient_dose_logs").select("*").in("patient_id",ids).gte("log_date",since).order("log_date",{ascending:false}))
  ]);
  for(const r of [pr,hp,sy,ob])if(r.error)throw r.error;
  const linked=(pr.data||[]).map(p=>this.mapPatient(p,(hp.data||[]).find(x=>x.patient_id===p.id),(sy.data||[]).filter(x=>x.patient_id===p.id),(ob.data||[]).filter(x=>x.patient_id===p.id),(dl.data||[]).filter(x=>x.patient_id===p.id),(ds.data||[]).filter(x=>x.patient_id===p.id)));
  return [...(managed||[]).map(p=>this.mapPatient({...p,record_type:"managed"}, {}, [], [])),...linked];
 },
 async get(id){
  const sb=requireSupabase();
  const {data:own,error}=await sb.from("doctor_managed_patients").select("*").eq("id",id).maybeSingle();
  if(error)throw error;
  if(own){const {data:visits,error:ve}=await sb.from("doctor_patient_record_visits").select("*").eq("patient_id",id).order("visit_date",{ascending:false});if(ve)throw ve;return this.mapPatient({...own,record_type:"managed"},{},[],(visits||[]).map(v=>({id:v.id,observed_on:v.visit_date,details:v.notes,title:v.title,observation_type:"clinical"})));}
  return (await this.all()).find(p=>p.id===id)||null
 },
 async add(p){
  const sb=requireSupabase();
  const payload={full_name:p.full_name.trim(),birth_date:p.birth_date||null,phone:p.phone||null,address:p.address||null,profession:p.profession||null,initial_reason:p.initial_reason||null,diagnosis:p.diagnosis||null,notes:p.notes||null,status:"suivi"};
  const {data,error}=await sb.from("doctor_managed_patients").insert(payload).select("id").single();
  if(error)throw error;return {id:data.id,...p,status:"suivi",recordType:"managed"};
 },
 async update(id,patch){
  const sb=requireSupabase();
  const payload={full_name:String(patch.full_name||"").trim(),birth_date:patch.birth_date||null,phone:patch.phone||null,address:patch.address||null,profession:patch.profession||null,initial_reason:patch.initial_reason||null,diagnosis:patch.diagnosis||null,notes:patch.notes||null,updated_at:new Date().toISOString()};
  if(!payload.full_name)throw new Error("Le nom complet est obligatoire.");
  const {data,error}=await sb.from("doctor_managed_patients").update(payload).eq("id",id).select("id").maybeSingle();
  if(error)throw error;if(!data)throw new Error("Dossier introuvable ou accès non autorisé.");return data;
 },
 async remove(id){
  const sb=requireSupabase();
  const {data,error}=await sb.from("doctor_managed_patients").delete().eq("id",id).select("id").maybeSingle();
  if(error)throw error;if(!data)throw new Error("Dossier introuvable ou accès non autorisé.");return true;
 },
 async updateNote(item,{text,date}){
  const sb=requireSupabase(),t=String(text||"").trim();if(!t)throw new Error("L’observation ne peut pas être vide.");
  let r;
  if(item.src==="visit"){const patch={notes:t};if(date&&date!==item.date)patch.visit_date=date;r=await sb.from("doctor_patient_record_visits").update(patch).eq("id",item.id).select("id");}
  else{const patch={title:t.slice(0,120),details:t};if(date)patch.observed_on=date;r=await sb.from("doctor_observations").update(patch).eq("id",item.id).select("id");}
  if(r.error)throw r.error;if(!r.data?.length)throw new Error("Modification refusée ou observation introuvable.");
 },
 async deleteNote(item){
  const sb=requireSupabase();
  const r=await sb.from(item.src==="visit"?"doctor_patient_record_visits":"doctor_observations").delete().eq("id",item.id).select("id");
  if(r.error)throw r.error;if(!r.data?.length)throw new Error("Suppression refusée ou observation introuvable.");
 },
 async archive(id){throw new Error("La fin d'un suivi doit être effectuée via le statut du lien patient-médecin, selon le workflow administrateur.");},
 async addNote(id,text,type="clinical"){
  const sb=requireSupabase();
  const {data:own,error:oe}=await sb.from("doctor_managed_patients").select("id").eq("id",id).maybeSingle();if(oe)throw oe;
  if(own){const {error}=await sb.from("doctor_patient_record_visits").insert({patient_id:id,title:type==="clinical"?"Note médicale":type,notes:text});if(error)throw error;return;}
  const doctor={id:await authService.doctorId()};
  const {error}=await sb.from("doctor_observations").insert({doctor_id:doctor.id,patient_id:id,observation_type:type,title:text.slice(0,120),details:text});
  if(error)throw error;
 }
};
const linkCodeService={
 // Le code est généré uniquement par l'administrateur (tableau de bord). La médecin ne peut que le lire.
 async get(){
  const sb=requireSupabase();
  const {data,error}=await sb.from("doctor_link_codes").select("code,uses_count,created_at").eq("status","active").maybeSingle();
  if(error)throw error;return data||null;
 }
};
const appointmentService={
 async list(){
  const sb=requireSupabase(),{data,error}=await sb.from("appointments").select("*").order("scheduled_at",{ascending:true});
  if(error)throw error;
  return (data||[]).map(a=>({id:a.id,patientId:a.patient_id||a.managed_patient_id,date:(a.scheduled_at||"").slice(0,10),time:(a.scheduled_at||"").slice(11,16),type:a.patient_note||(a.appointment_type==="online"?"En ligne":"En cabinet"),status:a.status,doctor_note:a.doctor_note,raw_note:a.patient_note||"",appointment_type:a.appointment_type,duration:a.duration_minutes,scheduled_at:a.scheduled_at}));
 },
 async create(item){
  const sb=requireSupabase(),doctor={id:await authService.doctorId()};
  const {data:own,error:oe}=await sb.from("doctor_managed_patients").select("id").eq("id",item.patient_id).maybeSingle();if(oe)throw oe;
  const map={"Confirmé":"confirmed","En attente":"requested"};
  if(item.status&&!map[item.status])throw new Error("À la création, le statut doit être « Confirmé » ou « En attente ».");
  const row={doctor_id:doctor.id,scheduled_at:item.scheduled_at,duration_minutes:Number(item.duration_minutes||30),appointment_type:["online","in_person"].includes(item.appointment_type)?item.appointment_type:"in_person",status:map[item.status]||"requested",patient_note:item.patient_note||""};
  if(own)row.managed_patient_id=own.id;else row.patient_id=item.patient_id;
  const {error}=await sb.from("appointments").insert(row);if(error)throw error;
 },
 async update(id,item){
  const sb=requireSupabase(),map={"Confirmé":"confirmed","En attente":"requested","Terminé":"completed","Annulé":"cancelled"};
  const row={scheduled_at:item.scheduled_at,appointment_type:["online","in_person"].includes(item.appointment_type)?item.appointment_type:"in_person",patient_note:item.patient_note||""};
  if(item.status&&map[item.status])row.status=map[item.status];
  const {data,error}=await sb.from("appointments").update(row).eq("id",id).select("id");if(error)throw error;
  if(!data||!data.length)throw new Error("Modification refusée. Exécutez SUPABASE_DOCTOR_APPOINTMENTS_EDIT_DELETE.sql dans Supabase.");
 },
 async remove(id){
  const sb=requireSupabase(),{data,error}=await sb.from("appointments").delete().eq("id",id).select("id");if(error)throw error;
  if(!data||!data.length)throw new Error("Suppression refusée. Exécutez SUPABASE_DOCTOR_APPOINTMENTS_EDIT_DELETE.sql dans Supabase.");
 }
};
const alertService={async list(){const ps=await patientService.all();return ps.filter(p=>Number(p.adherence||0)>0&&Number(p.adherence)<50).map(p=>({p:p.id,t:"Observance faible — vérifier le suivi"})).slice(0,10)}};
