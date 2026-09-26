-- Catalogue d'espèces enrichi par l'IA : chaque recherche IA "utilisée" dans
-- le formulaire d'ajout au peuplement est mémorisée ici, pour que la
-- prochaine fois la même espèce apparaisse directement dans les suggestions
-- (comme le catalogue intégré), sans repasser par l'IA.
create table if not exists public.custom_species (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  common_name text not null,
  scientific_name text not null,
  category text not null check (category in ('fish', 'invertebrate', 'plant', 'coral')),
  temperament text,
  adult_size_cm numeric,
  min_tank_liters numeric,
  bioload_factor numeric,
  swim_zone text not null default 'mid' check (swim_zone in ('top', 'mid', 'bottom')),
  solitary boolean not null default false,
  care_note text,
  created_at timestamptz not null default now()
);

alter table public.custom_species enable row level security;

create policy custom_species_select_own on public.custom_species
  for select using (auth.uid() = user_id);
create policy custom_species_insert_own on public.custom_species
  for insert with check (auth.uid() = user_id);
create policy custom_species_delete_own on public.custom_species
  for delete using (auth.uid() = user_id);

-- Fiche IA pour un matériau de décor (roche/racine) : effet sur l'eau,
-- préparation nécessaire.
alter table public.hardscape_items
  add column if not exists ai_summary text;
