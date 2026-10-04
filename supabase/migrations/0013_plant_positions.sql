-- AquaTrack AI — emplacement des plantes dans le bac (vue de dessus).
-- Tableau de points {x, y} en cm : x depuis la gauche, y depuis la vitre avant.
alter table public.livestock
  add column if not exists positions jsonb;
