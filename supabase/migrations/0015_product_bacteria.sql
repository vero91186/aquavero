-- AquaTrack AI — nouvelle catégorie de produit « bacteria » (bactéries liquides,
-- ajoutées en traitement directement dans le bac, pas à l'eau de remplacement).
alter table public.products drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check
  check (category in ('conditioner', 'bacteria', 'fertilizer', 'food', 'filter_media', 'test_kit', 'other'));
