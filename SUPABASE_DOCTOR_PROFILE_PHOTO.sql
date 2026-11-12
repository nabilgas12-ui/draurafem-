-- AuraFem Doctor : photo de profil des médecins
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- (Le droit de modifier nom, spécialité, établissement, téléphone et photo existe déjà
--  grâce à SUPABASE_DOCTOR_PORTAL_MIGRATION.sql.)

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('doctor-avatars','doctor-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Chaque médecin ne peut écrire que dans son propre dossier : <auth.uid()>/fichier
drop policy if exists "Doctors upload own avatar" on storage.objects;
create policy "Doctors upload own avatar" on storage.objects
for insert to authenticated with check (
  bucket_id='doctor-avatars' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.doctors d where d.auth_id=auth.uid() and d.status='active')
);

drop policy if exists "Doctors delete own avatar" on storage.objects;
create policy "Doctors delete own avatar" on storage.objects
for delete to authenticated using (
  bucket_id='doctor-avatars' and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Public can view doctor avatars" on storage.objects;
create policy "Public can view doctor avatars" on storage.objects
for select to public using (bucket_id='doctor-avatars');
