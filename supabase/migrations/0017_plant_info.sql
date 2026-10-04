-- AquaTrack AI — fiche précise d'une plante (recherche IA) : emplacement,
-- dimensions adultes, lumière, CO2, entretien... stockée sur la ligne du peuplement.
alter table public.livestock
  add column if not exists plant_info jsonb;
