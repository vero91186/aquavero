-- Repère "eau du robinet" : les valeurs de l'analyse de l'eau de ville
-- (distribuée périodiquement par la mairie/le distributeur), utiles en
-- référence pour les changements d'eau — pH, dureté, chlore à neutraliser...
alter table public.tanks
  add column if not exists tap_analyzed_at date,
  add column if not exists tap_ph numeric,
  add column if not exists tap_gh_dgh numeric,
  add column if not exists tap_kh_dkh numeric,
  add column if not exists tap_nitrate_ppm numeric,
  add column if not exists tap_chlorine_total_mg_l numeric,
  add column if not exists tap_temperature_c numeric,
  add column if not exists tap_conductivity_us_cm numeric;
