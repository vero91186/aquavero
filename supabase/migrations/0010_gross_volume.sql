-- Volume brut (annoncé par le fabricant) en plus du volume réel d'eau déjà
-- stocké dans volume_liters : sert au simulateur de densité (cm / L brut).
alter table public.tanks
  add column if not exists gross_volume_liters numeric
    check (gross_volume_liters is null or gross_volume_liters > 0);
