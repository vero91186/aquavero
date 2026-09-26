-- AquaTrack AI — photo sur les roches/racines et les produits, + suivi de
-- l'ouverture d'un produit pour calculer sa date limite d'usage.
-- (livestock.photo_url et water_tests.photo_url existent déjà depuis 0001.)

alter table public.hardscape_items
  add column if not exists photo_url text;

alter table public.products
  add column if not exists photo_url text,
  add column if not exists opened_at date,
  add column if not exists shelf_life_days_after_opening integer;

comment on column public.products.opened_at is
  'Date d''ouverture du produit, saisie par l''utilisateur.';
comment on column public.products.shelf_life_days_after_opening is
  'Durée de conservation estimée après ouverture, en jours (fiche IA ou saisie manuelle) — sert à calculer la date limite d''usage.';
