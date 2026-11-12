-- AuraFem : codes / QR de liaison Médecin ↔ Patientes
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor (après les migrations existantes).
-- Principe : l'administrateur génère le code d'une médecin depuis le tableau de bord ;
-- la médecin l'affiche (QR + code) dans « Mes patientes » ; la patiente le scanne dans
-- l'application mobile, qui appelle la fonction patient_link_doctor_by_code(code).
begin;

create table if not exists public.doctor_link_codes (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors(id) on delete cascade,
  code        text not null unique,
  status      text not null default 'active' check (status in ('active','revoked')),
  uses_count  integer not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
-- Un seul code actif par médecin
create unique index if not exists doctor_link_codes_one_active
  on public.doctor_link_codes(doctor_id) where status = 'active';

alter table public.doctor_link_codes enable row level security;

-- L'administrateur voit tout ; la médecin ne voit que son propre code.
drop policy if exists doctor_link_codes_admin_read on public.doctor_link_codes;
create policy doctor_link_codes_admin_read on public.doctor_link_codes
  for select to authenticated using (public.is_active_admin());
drop policy if exists doctor_link_codes_doctor_read on public.doctor_link_codes;
create policy doctor_link_codes_doctor_read on public.doctor_link_codes
  for select to authenticated using (doctor_id = public.my_doctor_id());
-- Aucune politique d'écriture : toute écriture passe par les fonctions ci-dessous.
revoke all on public.doctor_link_codes from anon;
revoke insert, update, delete on public.doctor_link_codes from authenticated;
grant select on public.doctor_link_codes to authenticated;

-- ADMIN : générer (ou régénérer) le code d'une médecin. L'ancien code est révoqué.
create or replace function public.admin_generate_doctor_link_code(p_doctor_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_code text; v_hex text; v_try int := 0;
begin
  if auth.uid() is null or not exists (
       select 1 from public.admin_profiles a
       where a.id = auth.uid() and a.status = 'active' and a.role in ('owner','admin')) then
    raise exception 'Action réservée aux administrateurs';
  end if;
  if not exists (select 1 from public.doctors where id = p_doctor_id) then
    raise exception 'Médecin introuvable';
  end if;

  update public.doctor_link_codes
     set status = 'revoked', revoked_at = now()
   where doctor_id = p_doctor_id and status = 'active';

  loop
    v_hex  := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    v_code := 'DR-' || substr(v_hex, 1, 5) || '-' || substr(v_hex, 6, 5);
    begin
      insert into public.doctor_link_codes(doctor_id, code, created_by)
      values (p_doctor_id, v_code, auth.uid());
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise exception 'Génération impossible, réessayez'; end if;
    end;
  end loop;
  return v_code;
end $$;
revoke all on function public.admin_generate_doctor_link_code(uuid) from public, anon;
grant execute on function public.admin_generate_doctor_link_code(uuid) to authenticated;

-- ADMIN : révoquer le code actif d'une médecin.
create or replace function public.admin_revoke_doctor_link_code(p_doctor_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (
       select 1 from public.admin_profiles a
       where a.id = auth.uid() and a.status = 'active' and a.role in ('owner','admin')) then
    raise exception 'Action réservée aux administrateurs';
  end if;
  update public.doctor_link_codes
     set status = 'revoked', revoked_at = now()
   where doctor_id = p_doctor_id and status = 'active';
end $$;
revoke all on function public.admin_revoke_doctor_link_code(uuid) from public, anon;
grant execute on function public.admin_revoke_doctor_link_code(uuid) to authenticated;

-- PATIENTE (appli mobile) : lier son compte à la médecin après scan du QR / saisie du code.
create or replace function public.patient_link_doctor_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_patient uuid; v_doc record; v_code_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  v_patient := public.my_patient_id();
  if v_patient is null then raise exception 'Compte patiente introuvable'; end if;

  select c.id, d.id as doctor_id, d.full_name, d.specialty
    into v_doc
    from public.doctor_link_codes c
    join public.doctors d on d.id = c.doctor_id
   where c.code = upper(trim(p_code)) and c.status = 'active' and d.status = 'active';
  if v_doc.doctor_id is null then raise exception 'Code invalide ou expiré'; end if;

  insert into public.doctor_patient_links as l (doctor_id, patient_id, status, requested_by)
  values (v_doc.doctor_id, v_patient, 'active', 'patient')
  on conflict (doctor_id, patient_id) do update
    set status = 'active', updated_at = now();

  update public.doctor_link_codes set uses_count = uses_count + 1 where id = v_doc.id;

  return jsonb_build_object('doctor_id', v_doc.doctor_id,
                            'doctor_name', v_doc.full_name,
                            'specialty', v_doc.specialty);
end $$;
revoke all on function public.patient_link_doctor_by_code(text) from public, anon;
grant execute on function public.patient_link_doctor_by_code(text) to authenticated;

commit;
