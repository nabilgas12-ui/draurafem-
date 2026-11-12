# AuraFem – Espace Praticien connecté à Supabase

## Ce qui a été branché
- Supabase Auth : connexion par e-mail/mot de passe, contrôle du profil `public.doctors` actif, réinitialisation du mot de passe.
- Patientes : lecture des patientes ayant un lien `active` avec la médecin, profils de santé et journaux de symptômes.
- Ajouter une patiente : demande via `doctor_request_patient_by_email`; le dossier ne devient visible qu'après activation du lien.
- Notes/observations : écrit dans `public.doctor_observations`.
- Rendez-vous : lecture et création dans `public.appointments`.
- Messages : lecture et envoi via `public.doctor_patient_messages`.
- Paramètres : mise à jour des champs professionnels autorisés de `public.doctors`.
- Rapports et indicateurs : calculés à partir des patientes accessibles; alertes simples d'observance faible.

## Configuration obligatoire
1. Dans Supabase, exécuter d'abord votre script de base `AuraFem_Backend_Complet.sql`.
2. Exécuter ensuite `SUPABASE_DOCTOR_PORTAL_MIGRATION.sql` (migration fournie avec le projet).
3. Exécuter `SUPABASE_DOCTOR_PORTAL_FIXES.sql` après la migration principale pour garantir les politiques de lecture médecin (si elles n’existent pas déjà).\n4. Ouvrir `services/supabaseConfig.js` et remplacer Project URL et la clé anon/publishable.
   Ne jamais placer `service_role` dans le navigateur.
5. Créer le compte de la médecin dans Supabase Authentication, puis créer/activer sa ligne correspondante dans `public.doctors` avec `auth_id` égal à l'UUID Auth et `status='active'`.
6. Héberger le dossier sur HTTP/HTTPS, pas `file://`. Exemple : `python -m http.server 8080`, puis `http://localhost:8080/login.html`.

## Hypothèses de schéma à vérifier
La migration reçue suppose les tables et colonnes du backend principal, notamment `doctors(auth_id,status,full_name,specialty,photo_url)`, `patients(id,auth_id,email)`, `doctor_patient_links(doctor_id,patient_id,status)`, `patient_health_profiles(patient_id)`, `symptom_logs(patient_id)`, `appointments(doctor_id,patient_id,scheduled_at,...)` et `doctor_observations`.
Le code utilise `patients.full_name` ou `patients.name` pour le nom, et `patient_health_profiles.height_cm` ou `height` pour la taille. Si le SQL de base emploie d'autres noms, adaptez le mapping dans `services/patientService.js`.

## À finaliser selon le schéma métier
- L'observance est affichée si le backend fournit `adherence_percentage` ou `adherence`; l'écriture des prises reste côté application patiente.
- Les poids ne sont pas présentés comme données réelles : la table/les colonnes de mesures ne sont pas identifiables dans les fichiers fournis.
- Les demandes de liaison doivent être acceptées par la patiente ou un administrateur selon votre workflow.
- Le bucket privé des rapports est créé par la migration; l'interface d'upload/téléchargement sera à ajouter après confirmation du schéma exact de `patient_medical_reports`.

## Sécurité
Les requêtes navigateur utilisent la clé publique et les politiques RLS. Ne désactivez pas RLS. Testez avec un compte médecin et un compte patiente de test.


## Dossiers patients créés par le médecin
Exécuter aussi `SUPABASE_DOCTOR_PATIENTS_INDEPENDENT.sql`. Le portail permet alors de créer des dossiers autonomes (nom, date de naissance, téléphone, adresse, profession, motif, diagnostic, notes) sans compte patient ni e-mail. Les notes de suivi sont stockées dans `doctor_patient_record_visits`. Les patientes liées via AuraFem continuent d’être listées séparément.


## Notifications (cloche en haut)
Exécuter `SUPABASE_DOCTOR_NOTIFICATIONS.sql`. La cloche affiche le nombre de notifications non lues envoyées depuis le tableau de bord admin (public « Médecins » ou « Tout le monde »). Un clic ouvre `pages/notifications.html`; le badge se met à jour automatiquement (temps réel + vérification toutes les 30 s). L'état « lu » est mémorisé par navigateur.
