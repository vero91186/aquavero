-- AquaTrack AI — suivi de la mise en eau et du cyclage (cycle de l'azote)

alter table public.tanks
  add column if not exists cycling_status text not null default 'not_started'
    check (cycling_status in ('not_started', 'cycling', 'cycled'));

comment on column public.tanks.setup_date is
  'Date de mise en eau du bac (premier remplissage).';

-- Journal des apports d'ammoniac pendant un cyclage sans poisson (fishless cycling)
create table if not exists public.cycling_doses (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dosed_at timestamptz not null default now(),
  ammonia_ppm_target numeric,
  note text,
  created_at timestamptz not null default now()
);

alter table public.cycling_doses enable row level security;

create policy "cycling_doses_select_own" on public.cycling_doses for select using (auth.uid() = user_id);
create policy "cycling_doses_insert_own" on public.cycling_doses for insert with check (auth.uid() = user_id);
create policy "cycling_doses_delete_own" on public.cycling_doses for delete using (auth.uid() = user_id);

create index if not exists cycling_doses_tank_id_dosed_at_idx on public.cycling_doses (tank_id, dosed_at desc);
