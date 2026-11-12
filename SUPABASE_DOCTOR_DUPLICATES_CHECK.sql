-- Diagnostic : y a-t-il plusieurs lignes (ou aucune) dans public.doctors pour un même compte ?
select auth_id, count(*) as lignes, array_agg(status) as statuts, array_agg(id) as ids
from public.doctors
group by auth_id
having count(*) > 1;

-- Vue complète des médecins avec l'e-mail du compte Auth
select d.id, d.auth_id, d.status, u.email
from public.doctors d left join auth.users u on u.id = d.auth_id
order by u.email;
