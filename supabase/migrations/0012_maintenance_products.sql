-- AquaTrack AI — produits dosés dans le journal d'entretien.
alter table public.maintenance_logs
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists product_name text,
  add column if not exists product_dose_ml numeric check (product_dose_ml is null or product_dose_ml >= 0);
