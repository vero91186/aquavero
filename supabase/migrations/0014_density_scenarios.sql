-- AquaTrack AI — projets de peuplement enregistrés depuis le simulateur de densité.
create table if not exists public.density_scenarios (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lines jsonb not null default '[]'::jsonb,
  net_liters numeric,
  ratio_net numeric,
  note text,
  created_at timestamptz not null default now()
);

alter table public.density_scenarios enable row level security;

create policy "density_scenarios_select_own" on public.density_scenarios for select using (auth.uid() = user_id);
create policy "density_scenarios_insert_own" on public.density_scenarios for insert with check (auth.uid() = user_id);
create policy "density_scenarios_update_own" on public.density_scenarios for update using (auth.uid() = user_id);
create policy "density_scenarios_delete_own" on public.density_scenarios for delete using (auth.uid() = user_id);
