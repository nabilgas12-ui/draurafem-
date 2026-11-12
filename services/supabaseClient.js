(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  const valid=cfg.url&&cfg.anonKey&&!cfg.url.includes("VOTRE-PROJET")&&!cfg.anonKey.includes("VOTRE_CLE");
  window.sbReady=!!(valid&&window.supabase?.createClient);
  window.sb=window.sbReady?window.supabase.createClient(cfg.url,cfg.anonKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"aurafem-doctor-auth"}
  }):null;
  if(window.sb){window.sb.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){sessionStorage.removeItem("af_doctor_profile");localStorage.removeItem("af_doctor_profile")}})}
  window.requireSupabase=()=>{if(!window.sbReady)throw new Error("Configurez services/supabaseConfig.js avec l’URL et la clé anon/publishable de Supabase.");return window.sb};
})();
