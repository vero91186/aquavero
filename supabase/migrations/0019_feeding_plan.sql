-- AquaTrack AI — planning de nourrissage hebdomadaire : quel aliment, en quelle
-- quantité, quel jour de la semaine et à quel moment de la journée.
-- Un jour sans ligne = jour de jeûne.
create table if not exists public.feeding_plan_items (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = lundi … 6 = dimanche
  slot text not null default 'evening' check (slot in ('morning', 'evening')),
  food_name text not null,
  quantity text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.feeding_plan_items enable row level security;

create policy "feeding_plan_items_select_own" on public.feeding_plan_items for select using (auth.uid() = user_id);
create policy "feeding_plan_items_insert_own" on public.feeding_plan_items for insert with check (auth.uid() = user_id);
create policy "feeding_plan_items_update_own" on public.feeding_plan_items for update using (auth.uid() = user_id);
create policy "feeding_plan_items_delete_own" on public.feeding_plan_items for delete using (auth.uid() = user_id);

create index if not exists feeding_plan_items_tank_id_idx on public.feeding_plan_items (tank_id);

-- Même garde que les autres tables : le bac doit appartenir à l'utilisateur.
drop trigger if exists feeding_plan_items_enforce_tank_owner on public.feeding_plan_items;
create trigger feeding_plan_items_enforce_tank_owner
  before insert or update of tank_id, user_id on public.feeding_plan_items
  for each row execute function public.enforce_tank_owner();
