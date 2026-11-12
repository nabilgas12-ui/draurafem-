-- AuraFem : permettre à la médecin de supprimer ses rendez-vous.
-- À exécuter dans Supabase > SQL Editor.
drop policy if exists appointments_doctor_delete on public.appointments;
create policy appointments_doctor_delete on public.appointments
for delete to authenticated using (doctor_id = public.my_doctor_id());
