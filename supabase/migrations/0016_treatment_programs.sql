-- AquaTrack AI — programmes de traitement avec date de début et de fin
-- (ex. bactéries liquides : une dose par jour pendant 7 jours).
create table if not exists public.treatment_programs (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  name text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  every_days integer not null default 1 check (every_days >= 1),
  dose_ml numeric check (dose_ml is null or dose_ml >= 0),
  notes text,
  done_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.treatment_programs enable row level security;

create policy "treatment_programs_select_own" on public.treatment_programs for select using (auth.uid() = user_id);
create policy "treatment_programs_insert_own" on public.treatment_programs for insert with check (auth.uid() = user_id);
create policy "treatment_programs_update_own" on public.treatment_programs for update using (auth.uid() = user_id);
create policy "treatment_programs_delete_own" on public.treatment_programs for delete using (auth.uid() = user_id);
