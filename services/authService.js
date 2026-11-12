// Authentification réelle via Supabase Auth + profil public.doctors.
const authService={
 async login(email,password,remember){
  const sb=requireSupabase();
  const {data,error}=await sb.auth.signInWithPassword({email:email.trim(),password});
  if(error)throw error;
  const {data:doctor,error:profileError}=await sb.from("doctors").select("*").eq("auth_id",data.user.id).eq("status","active").maybeSingle();
  if(profileError)throw profileError;
  if(!doctor){await sb.auth.signOut();throw new Error("Compte médecin actif introuvable. Vérifiez que votre compte est créé dans public.doctors et activé.");}
  // Supabase gère la session persistante. Le choix « se souvenir » est pris en charge par le client.
  const profile=this.mapDoctor(doctor,data.user);
  if(remember){localStorage.setItem("af_doctor_profile",JSON.stringify(profile));sessionStorage.removeItem("af_doctor_profile")}else{sessionStorage.setItem("af_doctor_profile",JSON.stringify(profile));localStorage.removeItem("af_doctor_profile")}
  return profile;
 },
 // Identifiant du médecin connecté, sans .single() : évite « Cannot coerce the result to a single JSON object »
 // quand public.doctors contient 0 ou plusieurs lignes pour le même auth_id (ex. doublon inactif).
 async doctorId(){
  const sb=requireSupabase();const {data:u}=await sb.auth.getUser();
  if(!u?.user)throw new Error("Session expirée, reconnectez-vous.");
  this._assertSession(u);
  const cur=this.current();
  if(cur&&cur.id&&cur.auth_id===u.user.id)return cur.id;
  const {data,error}=await sb.from("doctors").select("id").eq("auth_id",u.user.id).eq("status","active").limit(1);
  if(error)throw error;
  if(!data||!data.length)throw new Error("Compte médecin actif introuvable. Vérifiez public.doctors (auth_id et status='active').");
  return data[0].id;
 },
 mapDoctor(row,user){
  return {id:row.id,auth_id:row.auth_id,name:row.full_name||row.name||user?.email||"Médecin",
   email:user?.email||row.email||"",specialty:row.specialty||"",clinic:row.clinic_name||"",
   phone:row.phone||"",photo_url:row.photo_url||"",status:row.status};
 },
 _assertSession(u){
  const cur=this.current();
  if(cur&&cur.auth_id&&u?.user&&cur.auth_id!==u.user.id)throw new Error("La session Supabase active ("+(u.user.email||"autre compte")+") ne correspond pas au profil affiché ("+(cur.email||cur.name)+"). Déconnectez-vous puis reconnectez-vous avec le compte médecin.");
 },
 async verifySession(){
  const sb=requireSupabase();const {data}=await sb.auth.getUser();const cur=this.current();
  return {ok:!!(data?.user&&cur&&data.user.id===cur.auth_id),sessionEmail:data?.user?.email||null,profileEmail:cur?.email||null};
 },
 async saveProfile(v){
  const sb=requireSupabase();const {data:u}=await sb.auth.getUser();if(!u?.user)throw new Error("Session expirée, reconnectez-vous.");this._assertSession(u);this._assertSession(u);this._assertSession(u);
  const row={};if(v.name!==undefined)row.full_name=String(v.name).trim();if(v.specialty!==undefined)row.specialty=String(v.specialty).trim()||null;if(v.clinic!==undefined)row.clinic_name=String(v.clinic).trim()||null;if(v.phone!==undefined)row.phone=String(v.phone).trim()||null;if(v.photo_url!==undefined)row.photo_url=v.photo_url;
  if(row.full_name!==undefined&&row.full_name.length<2)throw new Error("Le nom est obligatoire.");
  let data=null;
  // 1) Fonction sécurisée (SUPABASE_DOCTOR_PROFILE_FIX.sql) : méthode recommandée
  const rpc=await sb.rpc("update_my_doctor_profile",{p_patch:row});
  if(!rpc.error)data=Array.isArray(rpc.data)?rpc.data[0]:rpc.data;
  else if(/doctor_not_found/.test(rpc.error.message||""))throw new Error("Compte médecin actif introuvable pour cet utilisateur (vérifiez doctors.auth_id et status='active').");
  else{
   // 2) Repli : mise à jour directe (nécessite la policy doctors_self_update)
   const r=await sb.from("doctors").update(row).eq("auth_id",u.user.id).select("*");
   if(r.error)throw r.error;
   data=r.data?.[0]||null;
   if(!data)throw new Error("Droits insuffisants dans Supabase. Exécutez SUPABASE_DOCTOR_PROFILE_FIX.sql dans le SQL Editor. Détail : "+(rpc.error.message||rpc.error.code||"fonction introuvable"));
  }
  if(!data)throw new Error("Aucune donnée retournée par Supabase.");
  const p=this.mapDoctor(data,u.user);(localStorage.getItem("af_doctor_profile")?localStorage:sessionStorage).setItem("af_doctor_profile",JSON.stringify(p));return p;
 },
 async uploadPhoto(file){
  const sb=requireSupabase();const {data:u}=await sb.auth.getUser();if(!u?.user)throw new Error("Session expirée, reconnectez-vous.");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Format non autorisé (JPG, PNG ou WebP).");
  if(file.size>2*1024*1024)throw new Error("Photo trop volumineuse (2 Mo maximum).");
  const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"})[file.type];const path=`${u.user.id}/${Date.now()}.${ext}`;
  const {error}=await sb.storage.from("doctor-avatars").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(error)throw error;
  return sb.storage.from("doctor-avatars").getPublicUrl(path).data.publicUrl;
 },
 async changePassword(oldPw,newPw){
  const sb=requireSupabase();const {data:u}=await sb.auth.getUser();if(!u?.user)throw new Error("Session expirée, reconnectez-vous.");
  if(newPw.length<8)throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
  const c=await sb.auth.signInWithPassword({email:u.user.email,password:oldPw});if(c.error)throw new Error("Mot de passe actuel incorrect.");
  const r=await sb.auth.updateUser({password:newPw});if(r.error)throw r.error;
 },
 current(){try{return JSON.parse(sessionStorage.getItem("af_doctor_profile")||localStorage.getItem("af_doctor_profile")||"null")}catch(_){return null}},
 async logout(){if(window.sbReady)await window.sb.auth.signOut();sessionStorage.removeItem("af_doctor_profile");localStorage.removeItem("af_doctor_profile")},
 async resetPassword(email){const client=requireSupabase();const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname.replace(/[^/]*$/,"")+"login.html"});if(error)throw error;}
};
