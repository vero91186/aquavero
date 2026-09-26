-- AquaTrack AI — dosage de conditionneur d'eau à chaque changement d'eau

alter table public.tanks
  add column if not exists conditioner_dose_ml_per_100l numeric;

comment on column public.tanks.conditioner_dose_ml_per_100l is
  'Dosage de référence du conditionneur utilisé sur ce bac, en mL pour 100 L d''eau neuve.';

alter table public.maintenance_logs
  add column if not exists conditioner_ml numeric;

comment on column public.maintenance_logs.conditioner_ml is
  'Quantité de conditionneur d''eau ajoutée (mL) lors de cette intervention (changement d''eau).';
