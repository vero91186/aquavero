-- Journal du bac : ajout d'un type "observation" (note libre, sans tâche
-- technique associée) et d'une photo optionnelle sur chaque entrée du
-- journal d'entretien (maintenance_logs), pour illustrer une observation ou
-- une intervention quand c'est utile.
alter table public.maintenance_logs
  add column if not exists photo_url text;

alter table public.maintenance_logs
  drop constraint if exists maintenance_logs_task_type_check;

alter table public.maintenance_logs
  add constraint maintenance_logs_task_type_check
  check (task_type in ('water_change', 'filter_clean', 'glass_clean', 'dosing', 'feeding', 'equipment_check', 'observation', 'other'));
