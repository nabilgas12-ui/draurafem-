-- AuraFem : rendez-vous pour les dossiers créés par la médecin (sans compte patiente).
-- À exécuter dans Supabase > SQL Editor.
begin;

alter table public.appointments alter column patient_id drop not null;
alter table public.appointments
  add column if not exists managed_patient_id uuid
  references public.doctor_managed_patients(id) on delete cascade;

alter table public.appointments drop constraint if exists appointments_one_patient_chk;
alter table public.appointments add constraint appointments_one_patient_chk
  check ((patient_id is not null)::int + (managed_patient_id is not null)::int = 1);

create index if not exists appointments_managed_patient_idx on public.appointments(managed_patient_id);

-- SELECT
drop policy if exists appointments_doctor_select on public.appointments;
create policy appointments_doctor_select on public.appointments
for select to authenticated using (
 doctor_id = public.my_doctor_id()
 and (
  (patient_id is not null and exists (select 1 from public.doctor_patient_links l
     where l.doctor_id = appointments.doctor_id and l.patient_id = appointments.patient_id and l.status = 'active'))
  or
  (managed_patient_id is not null and exists (select 1 from public.doctor_managed_patients m
     where m.id = appointments.managed_patient_id and m.doctor_id = public.my_doctor_id()))
 )
);

-- INSERT
drop policy if exists appointments_doctor_insert on public.appointments;
create policy appointments_doctor_insert on public.appointments
for insert to authenticated with check (
 doctor_id = public.my_doctor_id()
 and status in ('confirmed','requested')
 and (
  (patient_id is not null and exists (select 1 from public.doctor_patient_links l
     where l.doctor_id = appointments.doctor_id and l.patient_id = appointments.patient_id and l.status = 'active'))
  or
  (managed_patient_id is not null and exists (select 1 from public.doctor_managed_patients m
     where m.id = appointments.managed_patient_id and m.doctor_id = public.my_doctor_id()))
 )
);

-- UPDATE
drop policy if exists appointments_doctor_update on public.appointments;
create policy appointments_doctor_update on public.appointments
for update to authenticated
using (
 doctor_id = public.my_doctor_id()
 and (
  (patient_id is not null and exists (select 1 from public.doctor_patient_links l
     where l.doctor_id = appointments.doctor_id and l.patient_id = appointments.patient_id and l.status = 'active'))
  or
  (managed_patient_id is not null and exists (select 1 from public.doctor_managed_patients m
     where m.id = appointments.managed_patient_id and m.doctor_id = public.my_doctor_id()))
 )
)
with check (doctor_id = public.my_doctor_id());

commit;
