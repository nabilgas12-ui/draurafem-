-- AuraFem : dossiers créés directement par la médecin, sans compte patient ni e-mail.
begin;
create table if not exists public.doctor_managed_patients (
 id uuid primary key default gen_random_uuid(),
 doctor_id uuid not null default public.my_doctor_id() references public.doctors(id) on delete cascade,
 full_name text not null, birth_date date, phone text, address text, profession text,
 initial_reason text, diagnosis text, notes text, status text not null default 'suivi',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint doctor_managed_patients_name_not_empty check(length(trim(full_name))>0)
);
create index if not exists doctor_managed_patients_doctor_created_idx on public.doctor_managed_patients(doctor_id,created_at desc);
alter table public.doctor_managed_patients enable row level security;
drop policy if exists doctor_managed_patients_access on public.doctor_managed_patients;
create policy doctor_managed_patients_access on public.doctor_managed_patients for all to authenticated
 using (doctor_id=public.my_doctor_id()) with check (doctor_id=public.my_doctor_id());
grant select,insert,update,delete on public.doctor_managed_patients to authenticated;

create table if not exists public.doctor_patient_record_visits (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.doctor_managed_patients(id) on delete cascade,
 title text not null default 'Note médicale', notes text not null,
 visit_date timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists doctor_patient_record_visits_patient_date_idx on public.doctor_patient_record_visits(patient_id,visit_date desc);
alter table public.doctor_patient_record_visits enable row level security;
drop policy if exists doctor_patient_record_visits_access on public.doctor_patient_record_visits;
create policy doctor_patient_record_visits_access on public.doctor_patient_record_visits for all to authenticated
 using (exists(select 1 from public.doctor_managed_patients p where p.id=patient_id and p.doctor_id=public.my_doctor_id()))
 with check (exists(select 1 from public.doctor_managed_patients p where p.id=patient_id and p.doctor_id=public.my_doctor_id()));
grant select,insert,update,delete on public.doctor_patient_record_visits to authenticated;
commit;
