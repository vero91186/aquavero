-- AquaTrack AI — matériel du bac (filtre, pompe, chauffage, éclairage...).
create table if not exists public.tank_equipment (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'other' check (kind in ('aquarium', 'filter', 'pump', 'heater', 'light', 'co2', 'other')),
  name text not null,
  specs text,
  power_w numeric check (power_w is null or power_w >= 0),
  flow_lph numeric check (flow_lph is null or flow_lph >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tank_equipment enable row level security;

create policy "tank_equipment_select_own" on public.tank_equipment for select using (auth.uid() = user_id);
create policy "tank_equipment_insert_own" on public.tank_equipment for insert with check (auth.uid() = user_id);
create policy "tank_equipment_update_own" on public.tank_equipment for update using (auth.uid() = user_id);
create policy "tank_equipment_delete_own" on public.tank_equipment for delete using (auth.uid() = user_id);
