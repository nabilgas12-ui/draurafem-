-- AuraFem Doctor : correction de l'enregistrement du profil médecin
-- À exécuter UNE FOIS dans Supabase > SQL Editor.

alter table public.doctors add column if not exists clinic_name text;
alter table public.doctors add column if not exists phone text;
alter table public.doctors add column if not exists photo_url text;

-- Policies et droits (au cas où la migration principale n'a pas été appliquée)
drop policy if exists doctors_self_read on public.doctors;
create policy doctors_self_read on public.doctors
for select to authenticated using (auth_id = auth.uid());

drop policy if exists doctors_self_update on public.doctors;
create policy doctors_self_update on public.doctors
for update to authenticated
using (auth_id = auth.uid() and status = 'active')
with check (auth_id = auth.uid() and status = 'active');

grant select on public.doctors to authenticated;
grant update(full_name,specialty,photo_url,clinic_name,phone) on public.doctors to authenticated;

-- Fonction sécurisée : un médecin ne peut modifier QUE sa propre ligne et QUE ces 5 champs
create or replace function public.update_my_doctor_profile(p_patch jsonb)
returns public.doctors
language plpgsql security definer set search_path = public as $$
declare r public.doctors;
begin
  update public.doctors d set
    full_name   = case when p_patch ? 'full_name'   then coalesce(nullif(trim(p_patch->>'full_name'),''), d.full_name) else d.full_name end,
    specialty   = case when p_patch ? 'specialty'   then nullif(trim(p_patch->>'specialty'),'')   else d.specialty end,
    clinic_name = case when p_patch ? 'clinic_name' then nullif(trim(p_patch->>'clinic_name'),'') else d.clinic_name end,
    phone       = case when p_patch ? 'phone'       then nullif(trim(p_patch->>'phone'),'')       else d.phone end,
    photo_url   = case when p_patch ? 'photo_url'   then nullif(p_patch->>'photo_url','')         else d.photo_url end
  where d.auth_id = auth.uid() and d.status = 'active'
  returning d.* into r;
  if r.id is null then raise exception 'doctor_not_found'; end if;
  return r;
end $$;

revoke all on function public.update_my_doctor_profile(jsonb) from public, anon;
grant execute on function public.update_my_doctor_profile(jsonb) to authenticated;

-- Force Supabase (PostgREST) à reconnaître la nouvelle fonction immédiatement
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- VÉRIFICATION (facultatif) : lancez ces deux requêtes séparément.
-- 1) La fonction existe-t-elle ?
--    select proname from pg_proc where proname = 'update_my_doctor_profile';
-- 2) Votre compte médecin est-il bien lié et actif ?
--    select d.id, d.full_name, d.status, d.auth_id, u.email
--    from public.doctors d left join auth.users u on u.id = d.auth_id;
--    -> auth_id doit être rempli (non vide) et status = 'active'.

-- Si l'erreur « Compte médecin actif introuvable » persiste APRÈS reconnexion :
-- lier la ligne médecin au compte de connexion (remplacez l'e-mail) :
--    update public.doctors d set auth_id = u.id, status = 'active'
--    from auth.users u
--    where u.email = 'sarah.benali@gmail.com' and d.email = u.email;
