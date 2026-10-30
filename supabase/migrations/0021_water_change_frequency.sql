-- AquaTrack AI — fréquence du changement d'eau : toutes les 1 ou 2 semaines.
-- Le planning d'entretien en tient compte (test d'eau et engrais suivent le changement d'eau).
alter table public.tanks
  add column if not exists water_change_every_weeks smallint not null default 1
    check (water_change_every_weeks in (1, 2));
