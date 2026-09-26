-- AquaTrack AI — page « Propriétés » du bac, roches/racines (hardscape) et
-- catalogue de produits personnels (avec recherche IA et réutilisation dans
-- les autres onglets, ex. conditionneur au changement d'eau).

alter table public.tanks
  add column if not exists length_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists substrate text,
  add column if not exists lighting_hours_per_day numeric,
  add column if not exists fertile_soil boolean not null default false;

comment on column public.tanks.length_cm is 'Longueur du bac en cm.';
comment on column public.tanks.width_cm is 'Largeur du bac en cm.';
comment on column public.tanks.height_cm is 'Hauteur du bac en cm.';
comment on column public.tanks.substrate is 'Type de substrat/sol utilisé (sable, gravier, sol technique...).';
comment on column public.tanks.lighting_hours_per_day is 'Durée d''éclairage quotidienne, en heures.';
comment on column public.tanks.fertile_soil is 'Vrai si un sol fertile / nutritif est utilisé sous le substrat.';

-- ============================================================
-- ROCHES & RACINES (hardscape_items)
-- ============================================================
create table if not exists public.hardscape_items (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('rock', 'wood')),
  name text not null,
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.hardscape_items enable row level security;

create policy "hardscape_items_select_own" on public.hardscape_items for select using (auth.uid() = user_id);
create policy "hardscape_items_insert_own" on public.hardscape_items for insert with check (auth.uid() = user_id);
create policy "hardscape_items_update_own" on public.hardscape_items for update using (auth.uid() = user_id);
create policy "hardscape_items_delete_own" on public.hardscape_items for delete using (auth.uid() = user_id);

-- ============================================================
-- PRODUITS (products) — catalogue personnel, alimenté par recherche IA,
-- réutilisable dans les autres onglets (ex. conditionneur d'eau)
-- ============================================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in ('conditioner', 'fertilizer', 'food', 'filter_media', 'test_kit', 'other')),
  dose_info text,
  dose_ml_per_100l numeric,
  ai_summary text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_own" on public.products for select using (auth.uid() = user_id);
create policy "products_insert_own" on public.products for insert with check (auth.uid() = user_id);
create policy "products_update_own" on public.products for update using (auth.uid() = user_id);
create policy "products_delete_own" on public.products for delete using (auth.uid() = user_id);

create index if not exists products_tank_id_category_idx on public.products (tank_id, category);
