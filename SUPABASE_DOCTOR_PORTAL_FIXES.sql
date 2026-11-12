-- AuraFem Doctor Portal: supplemental read policies
-- Run AFTER SUPABASE_DOCTOR_PORTAL_MIGRATION.sql if these policies do not already exist.
begin;

drop policy if exists doctors_self_read on public.doctors;
create policy doctors_self_read on public.doctors
for select to authenticated
using (auth_id = auth.uid() or public.is_active_admin());

drop policy if exists doctor_patient_links_doctor_read on public.doctor_patient_links;
create policy doctor_patient_links_doctor_read on public.doctor_patient_links
for select to authenticated
using (doctor_id = public.my_doctor_id() or public.is_active_admin());

drop policy if exists appointments_doctor_select on public.appointments;
create policy appointments_doctor_select on public.appointments
for select to authenticated
using (
 doctor_id = public.my_doctor_id()
 and exists (
  select 1 from public.doctor_patient_links l
  where l.doctor_id = appointments.doctor_id
    and l.patient_id = appointments.patient_id
    and l.status = 'active'
 )
);

drop policy if exists reports_doctor_select on public.patient_medical_reports;
create policy reports_doctor_select on public.patient_medical_reports
for select to authenticated
using (
 doctor_id = public.my_doctor_id()
 and exists (
  select 1 from public.doctor_patient_links l
  where l.doctor_id = patient_medical_reports.doctor_id
    and l.patient_id = patient_medical_reports.patient_id
    and l.status = 'active'
 )
);

drop policy if exists doctor_read_treatment_adherence_logs on public.treatment_adherence_logs;
create policy doctor_read_treatment_adherence_logs on public.treatment_adherence_logs
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=public.my_doctor_id()
    and l.patient_id=treatment_adherence_logs.patient_id and l.status='active')
);

drop policy if exists doctor_read_patient_health_metrics on public.patient_health_metrics;
create policy doctor_read_patient_health_metrics on public.patient_health_metrics
for select to authenticated using (
 exists(select 1 from public.doctor_patient_links l
  where l.doctor_id=public.my_doctor_id()
    and l.patient_id=patient_health_metrics.patient_id and l.status='active')
);

commit;
