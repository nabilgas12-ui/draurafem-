-- AuraFem Doctor Portal: production-oriented additive migration
-- Run AFTER AuraFem_Backend_Complet.sql in Supabase SQL Editor.
-- Never expose service_role keys in browser code.
begin;

alter table public.doctors add column if not exists clinic_name text;
alter table public.doctors add column if not exists phone text;
alter table public.patient_health_profiles add column if not exists allergies text;
alter table public.patient_health_profiles add column if not exists medical_history text;
alter table public.patient_health_profiles add column if not exists chronic_conditions text;
alter table public.patient_health_profiles add column if not exists blood_group text;

-- Doctor self profile
drop policy if exists doctors_self_update on public.doctors;
create policy doctors_self_update on public.doctors
for update to authenticated
using (auth_id = auth.uid() and status = 'active')
with check (auth_id = auth.uid() and status = 'active');
grant select, update on public.doctors to authenticated;

-- Permit doctors to resolve the patient row only when an active care relationship exists.
drop policy if exists patients_doctor_link_read on public.patients;
create policy patients_doctor_link_read on public.patients
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
 where l.doctor_id=public.my_doctor_id() and l.patient_id=patients.id and l.status='active')
);

-- Read-only access for doctors to patient-entered health information for active links.
drop policy if exists doctor_read_patient_health_profile on public.patient_health_profiles;
create policy doctor_read_patient_health_profile on public.patient_health_profiles
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
 where l.doctor_id=public.my_doctor_id() and l.patient_id=patient_health_profiles.patient_id and l.status='active')
);
drop policy if exists doctor_read_symptom_logs on public.symptom_logs;
create policy doctor_read_symptom_logs on public.symptom_logs
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
 where l.doctor_id=public.my_doctor_id() and l.patient_id=symptom_logs.patient_id and l.status='active')
);
drop policy if exists doctor_read_cycle_logs on public.cycle_logs;
create policy doctor_read_cycle_logs on public.cycle_logs
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
 where l.doctor_id=public.my_doctor_id() and l.patient_id=cycle_logs.patient_id and l.status='active')
);
drop policy if exists doctor_read_intake_logs on public.intake_logs;
create policy doctor_read_intake_logs on public.intake_logs
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
 where l.doctor_id=public.my_doctor_id() and l.patient_id=intake_logs.patient_id and l.status='active')
);

-- Doctor observations are separate from patient-submitted symptom logs.
create table if not exists public.doctor_observations (
 id uuid primary key default gen_random_uuid(),
 doctor_id uuid not null references public.doctors(id) on delete cascade,
 patient_id uuid not null references public.patients(id) on delete cascade,
 observation_type text not null default 'hormonal',
 observed_on date not null default current_date,
 title text not null,
 details text,
 severity integer check (severity between 0 and 10),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_doctor_observations_patient_date
 on public.doctor_observations(patient_id,observed_on desc);
drop trigger if exists trg_doctor_observations_updated on public.doctor_observations;
create trigger trg_doctor_observations_updated before update on public.doctor_observations
for each row execute function public.set_updated_at();
alter table public.doctor_observations enable row level security;
drop policy if exists doctor_observations_admin_all on public.doctor_observations;
create policy doctor_observations_admin_all on public.doctor_observations
for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists doctor_observations_doctor_all on public.doctor_observations;
create policy doctor_observations_doctor_all on public.doctor_observations
for all to authenticated using (
 doctor_id=public.my_doctor_id() and exists(
  select 1 from public.doctor_patient_links l
  where l.doctor_id=doctor_observations.doctor_id and l.patient_id=doctor_observations.patient_id and l.status='active'
 )
) with check (
 doctor_id=public.my_doctor_id() and exists(
  select 1 from public.doctor_patient_links l
  where l.doctor_id=doctor_observations.doctor_id and l.patient_id=doctor_observations.patient_id and l.status='active'
 )
);
drop policy if exists doctor_observations_patient_read on public.doctor_observations;
create policy doctor_observations_patient_read on public.doctor_observations
for select to authenticated using (patient_id=public.my_patient_id());
grant select,insert,update,delete on public.doctor_observations to authenticated;

-- Durable doctor <-> patient conversations. Both parties can only see messages
-- addressed to them and only while an active doctor-patient link exists.
create table if not exists public.doctor_patient_messages (
 id uuid primary key default gen_random_uuid(),
 doctor_id uuid not null references public.doctors(id) on delete cascade,
 patient_id uuid not null references public.patients(id) on delete cascade,
 sender_auth_id uuid not null references auth.users(id) on delete cascade,
 recipient_auth_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (length(btrim(body)) between 1 and 10000),
 attachment_path text,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 constraint doctor_patient_messages_sender_recipient check(sender_auth_id <> recipient_auth_id)
);
create index if not exists idx_doctor_patient_messages_thread
 on public.doctor_patient_messages(doctor_id,patient_id,created_at desc);
alter table public.doctor_patient_messages enable row level security;
drop policy if exists doctor_patient_messages_select on public.doctor_patient_messages;
create policy doctor_patient_messages_select on public.doctor_patient_messages
for select to authenticated using (
 (sender_auth_id=auth.uid() or recipient_auth_id=auth.uid())
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=doctor_patient_messages.doctor_id
    and l.patient_id=doctor_patient_messages.patient_id and l.status='active')
);
drop policy if exists doctor_patient_messages_insert_doctor on public.doctor_patient_messages;
create policy doctor_patient_messages_insert_doctor on public.doctor_patient_messages
for insert to authenticated with check (
 sender_auth_id=auth.uid()
 and doctor_id=public.my_doctor_id()
 and recipient_auth_id=(select p.auth_id from public.patients p where p.id=patient_id)
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=doctor_patient_messages.doctor_id
    and l.patient_id=doctor_patient_messages.patient_id and l.status='active')
);
drop policy if exists doctor_patient_messages_insert_patient on public.doctor_patient_messages;
create policy doctor_patient_messages_insert_patient on public.doctor_patient_messages
for insert to authenticated with check (
 sender_auth_id=auth.uid()
 and patient_id=public.my_patient_id()
 and recipient_auth_id=(select d.auth_id from public.doctors d where d.id=doctor_id)
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=doctor_patient_messages.doctor_id
    and l.patient_id=doctor_patient_messages.patient_id and l.status='active')
);
drop policy if exists doctor_patient_messages_read_update on public.doctor_patient_messages;
create policy doctor_patient_messages_read_update on public.doctor_patient_messages
for update to authenticated using (recipient_auth_id=auth.uid())
with check (recipient_auth_id=auth.uid());
grant select,insert,update on public.doctor_patient_messages to authenticated;

-- Request a link by patient email; request remains pending until patient/admin approval.
create or replace function public.doctor_request_patient_by_email(p_email text,p_note text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_doctor uuid; v_patient uuid; v_link uuid;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 select id into v_doctor from public.doctors where auth_id=auth.uid() and status='active';
 if v_doctor is null then raise exception 'Compte médecin actif introuvable'; end if;
 select id into v_patient from public.patients where lower(email)=lower(trim(p_email));
 if v_patient is null then raise exception 'Aucun compte patiente ne correspond à cet e-mail'; end if;
 insert into public.doctor_patient_links as existing (doctor_id,patient_id,status,requested_by,notes)
 values(v_doctor,v_patient,'pending','doctor',left(p_note,500))
 on conflict(doctor_id,patient_id) do update set
   status=case when existing.status in ('rejected','ended') then 'pending' else existing.status end,
   requested_by='doctor',notes=excluded.notes,updated_at=now()
 returning id into v_link;
 return v_link;
end $$;
revoke all on function public.doctor_request_patient_by_email(text,text) from public,anon;
grant execute on function public.doctor_request_patient_by_email(text,text) to authenticated;

-- Doctor appointment creation/update must be scoped to active linked patients.
drop policy if exists appointments_doctor_insert on public.appointments;
create policy appointments_doctor_insert on public.appointments
for insert to authenticated with check (
 doctor_id=public.my_doctor_id()
 and status in ('confirmed','requested')
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=appointments.doctor_id and l.patient_id=appointments.patient_id and l.status='active')
);
drop policy if exists appointments_doctor_update on public.appointments;
create policy appointments_doctor_update on public.appointments
for update to authenticated using (
 doctor_id=public.my_doctor_id()
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=appointments.doctor_id and l.patient_id=appointments.patient_id and l.status='active')
) with check (
 doctor_id=public.my_doctor_id()
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=appointments.doctor_id and l.patient_id=appointments.patient_id and l.status='active')
);
grant select,insert,update on public.appointments to authenticated;

-- Report metadata is stored in Postgres; files live in private Storage bucket.
drop policy if exists reports_doctor_insert on public.patient_medical_reports;
create policy reports_doctor_insert on public.patient_medical_reports
for insert to authenticated with check (
 doctor_id=public.my_doctor_id()
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=patient_medical_reports.doctor_id
    and l.patient_id=patient_medical_reports.patient_id and l.status='active')
);
drop policy if exists reports_doctor_delete on public.patient_medical_reports;
create policy reports_doctor_delete on public.patient_medical_reports
for delete to authenticated using (
 doctor_id=public.my_doctor_id()
 and exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=patient_medical_reports.doctor_id
    and l.patient_id=patient_medical_reports.patient_id and l.status='active')
);
grant select,insert,delete on public.patient_medical_reports to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('aurafem-medical-reports','aurafem-medical-reports',false,15728640,
 array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=15728640,
 allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

drop policy if exists af_doctor_reports_select on storage.objects;
create policy af_doctor_reports_select on storage.objects for select to authenticated using (
 bucket_id='aurafem-medical-reports' and exists(
  select 1 from public.doctor_patient_links l
  where l.doctor_id=public.my_doctor_id() and l.status='active'
    and name like l.patient_id::text||'/%'
 )
);
drop policy if exists af_doctor_reports_insert on storage.objects;
create policy af_doctor_reports_insert on storage.objects for insert to authenticated with check (
 bucket_id='aurafem-medical-reports' and exists(
  select 1 from public.doctor_patient_links l
  where l.doctor_id=public.my_doctor_id() and l.status='active'
    and name like l.patient_id::text||'/%'
 )
);
drop policy if exists af_doctor_reports_delete on storage.objects;
create policy af_doctor_reports_delete on storage.objects for delete to authenticated using (
 bucket_id='aurafem-medical-reports' and exists(
  select 1 from public.doctor_patient_links l
  where l.doctor_id=public.my_doctor_id() and l.status='active'
    and name like l.patient_id::text||'/%'
 )
);

drop policy if exists af_patient_reports_select on storage.objects;
create policy af_patient_reports_select on storage.objects for select to authenticated using (
 bucket_id='aurafem-medical-reports' and name like public.my_patient_id()::text||'/%'
);

-- Keep clinical record ownership immutable and prevent a doctor from deleting
-- consultations or prescriptions through the portal.
drop policy if exists consultations_doctor_all on public.consultations;
drop policy if exists consultations_doctor_select on public.consultations;
create policy consultations_doctor_select on public.consultations for select to authenticated
 using (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=consultations.doctor_id and l.patient_id=consultations.patient_id and l.status='active'));
drop policy if exists consultations_doctor_insert on public.consultations;
create policy consultations_doctor_insert on public.consultations for insert to authenticated
 with check (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=consultations.doctor_id and l.patient_id=consultations.patient_id and l.status='active'));
drop policy if exists consultations_doctor_update on public.consultations;
create policy consultations_doctor_update on public.consultations for update to authenticated
 using (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=consultations.doctor_id and l.patient_id=consultations.patient_id and l.status='active'))
 with check (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=consultations.doctor_id and l.patient_id=consultations.patient_id and l.status='active'));

drop policy if exists prescriptions_doctor_all on public.prescriptions;
drop policy if exists prescriptions_doctor_select on public.prescriptions;
create policy prescriptions_doctor_select on public.prescriptions for select to authenticated
 using (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=prescriptions.doctor_id and l.patient_id=prescriptions.patient_id and l.status='active'));
drop policy if exists prescriptions_doctor_insert on public.prescriptions;
create policy prescriptions_doctor_insert on public.prescriptions for insert to authenticated
 with check (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=prescriptions.doctor_id and l.patient_id=prescriptions.patient_id and l.status='active'));
drop policy if exists prescriptions_doctor_update on public.prescriptions;
create policy prescriptions_doctor_update on public.prescriptions for update to authenticated
 using (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=prescriptions.doctor_id and l.patient_id=prescriptions.patient_id and l.status='active'))
 with check (doctor_id=public.my_doctor_id() and exists(select 1 from public.doctor_patient_links l where l.doctor_id=prescriptions.doctor_id and l.patient_id=prescriptions.patient_id and l.status='active'));

-- Explicit table privileges are required in addition to RLS policies.
grant select on public.doctors to authenticated;
revoke update on public.doctors from authenticated;
grant update(full_name,specialty,photo_url,clinic_name,phone) on public.doctors to authenticated;
grant select on public.patients,public.patient_health_profiles,public.symptom_logs,
 public.cycle_logs,public.intake_logs,public.patient_health_metrics,
 public.treatment_adherence_logs,public.prescriptions,public.consultations,
 public.patient_medical_reports,public.doctor_patient_links to authenticated;
grant select,insert on public.appointments to authenticated;
revoke update on public.appointments from authenticated;
grant update(status,doctor_note,scheduled_at,duration_minutes,appointment_type,meeting_url,patient_note) on public.appointments to authenticated;
grant select,insert,update on public.consultations,public.prescriptions to authenticated;
revoke update on public.consultations,public.prescriptions from authenticated;
grant update(consultation_date,symptoms_summary,clinical_notes,assessment,recommendations,follow_up_at,appointment_id) on public.consultations to authenticated;
grant update(medication_name,dosage,frequency,instructions,start_date,end_date,status) on public.prescriptions to authenticated;
grant select,insert,delete on public.doctor_observations to authenticated;
revoke update on public.doctor_observations from authenticated;
grant update(observation_type,observed_on,title,details,severity) on public.doctor_observations to authenticated;
grant select,insert on public.doctor_patient_messages to authenticated;
revoke update on public.doctor_patient_messages from authenticated;
grant update(read_at) on public.doctor_patient_messages to authenticated;
grant select,insert,delete on public.patient_medical_reports to authenticated;

-- Immutable audit trail for clinical and communication records.
create table if not exists public.medical_audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_auth_id uuid references auth.users(id) on delete set null,
 actor_role text not null check(actor_role in ('doctor','patient','admin','system')),
 doctor_id uuid references public.doctors(id) on delete set null,
 patient_id uuid references public.patients(id) on delete set null,
 table_name text not null,
 record_id uuid,
 action text not null check(action in ('INSERT','UPDATE','DELETE')),
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
create index if not exists idx_medical_audit_patient_time
 on public.medical_audit_events(patient_id,created_at desc);
create index if not exists idx_medical_audit_doctor_time
 on public.medical_audit_events(doctor_id,created_at desc);
alter table public.medical_audit_events enable row level security;
drop policy if exists medical_audit_admin_read on public.medical_audit_events;
create policy medical_audit_admin_read on public.medical_audit_events
 for select to authenticated using (public.is_active_admin());
drop policy if exists medical_audit_doctor_read on public.medical_audit_events;
create policy medical_audit_doctor_read on public.medical_audit_events
 for select to authenticated using (doctor_id=public.my_doctor_id());
drop policy if exists medical_audit_patient_read on public.medical_audit_events;
create policy medical_audit_patient_read on public.medical_audit_events
 for select to authenticated using (patient_id=public.my_patient_id());
grant select on public.medical_audit_events to authenticated;

create or replace function public.capture_medical_audit_event()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_before jsonb; v_after jsonb; v_row jsonb; v_doctor uuid; v_patient uuid;
 v_record uuid; v_actor_role text;
begin
 if tg_op='DELETE' then v_before=to_jsonb(old); v_row=v_before;
 else v_after=to_jsonb(new); v_row=v_after; end if;
 if tg_op='UPDATE' then v_before=to_jsonb(old); end if;
 v_doctor=nullif(v_row->>'doctor_id','')::uuid;
 v_patient=nullif(v_row->>'patient_id','')::uuid;
 if v_doctor is null then v_doctor=public.my_doctor_id(); end if;
 if v_patient is null then v_patient=public.my_patient_id(); end if;
 v_record=nullif(v_row->>'id','')::uuid;
 if public.my_doctor_id() is not null then v_actor_role='doctor';
 elsif public.my_patient_id() is not null then v_actor_role='patient';
 elsif public.is_active_admin() then v_actor_role='admin';
 else v_actor_role='system'; end if;
 insert into public.medical_audit_events(actor_auth_id,actor_role,doctor_id,patient_id,table_name,record_id,action,before_data,after_data)
 values(auth.uid(),v_actor_role,v_doctor,v_patient,tg_table_name,v_record,tg_op,v_before,v_after);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;

do $$ declare t text; begin
 foreach t in array array['appointments','consultations','prescriptions','doctor_observations','doctor_patient_messages','patient_medical_reports','symptom_logs','cycle_logs','treatment_adherence_logs','patient_health_metrics'] loop
  execute format('drop trigger if exists trg_medical_audit on public.%I',t);
  execute format('create trigger trg_medical_audit after insert or update or delete on public.%I for each row execute function public.capture_medical_audit_event()',t);
 end loop;
end $$;

-- Realtime for chat: enable if not already present in publication.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='doctor_patient_messages') then
  alter publication supabase_realtime add table public.doctor_patient_messages;
 end if;
exception when undefined_object then null; end $$;

commit;
