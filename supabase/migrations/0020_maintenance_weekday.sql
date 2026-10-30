-- AquaTrack AI — jour d'entretien choisi pour le bac : le planning cale le changement
-- d'eau (et les tâches liées) sur ce jour de la semaine. Null = rythme calé sur le jour 0.
alter table public.tanks
  add column if not exists maintenance_weekday smallint
    check (maintenance_weekday is null or maintenance_weekday between 0 and 6); -- 0 = lundi … 6 = dimanche
