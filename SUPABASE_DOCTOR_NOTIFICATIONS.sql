-- AuraFem Doctor Portal : lecture des notifications envoyées par l'administrateur
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
begin;

alter table public.notifications enable row level security;

-- Un médecin actif peut lire les notifications destinées aux médecins ou à tout le monde.
drop policy if exists notifications_doctor_read on public.notifications;
create policy notifications_doctor_read on public.notifications
for select to authenticated
using (
  audience::text in ('doctors','everyone')
  and public.my_doctor_id() is not null
);

-- Mise à jour en temps réel du badge (ignorer si déjà ajoutée).
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
         when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
commit;
