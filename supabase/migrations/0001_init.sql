-- AquaTrack AI — schéma initial
-- Toutes les tables sont protégées par Row Level Security : chaque utilisateur
-- ne voit et ne modifie que ses propres données.

create extension if not exists "uuid-ossp";

-- ============================================================
-- BACS (tanks) — générique : n'importe quel volume / type d'eau
-- ============================================================
create table if not exists public.tanks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  water_type text not null default 'freshwater' check (water_type in ('freshwater', 'saltwater', 'brackish')),
  volume_liters numeric not null check (volume_liters > 0),
  is_planted boolean not null default false,
  setup_date date,
  notes text,
  cover_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tanks enable row level security;

create policy "tanks_select_own" on public.tanks for select using (auth.uid() = user_id);
create policy "tanks_insert_own" on public.tanks for insert with check (auth.uid() = user_id);
create policy "tanks_update_own" on public.tanks for update using (auth.uid() = user_id);
create policy "tanks_delete_own" on public.tanks for delete using (auth.uid() = user_id);

-- ============================================================
-- PARAMÈTRES D'EAU (water_tests)
-- ============================================================
create table if not exists public.water_tests (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tested_at timestamptz not null default now(),
  ph numeric,
  ammonia_ppm numeric,
  nitrite_ppm numeric,
  nitrate_ppm numeric,
  gh_dgh numeric,
  kh_dkh numeric,
  temperature_c numeric,
  salinity_sg numeric,
  phosphate_ppm numeric,
  source text not null default 'manual' check (source in ('manual', 'photo_ai')),
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.water_tests enable row level security;

create policy "water_tests_select_own" on public.water_tests for select using (auth.uid() = user_id);
create policy "water_tests_insert_own" on public.water_tests for insert with check (auth.uid() = user_id);
create policy "water_tests_update_own" on public.water_tests for update using (auth.uid() = user_id);
create policy "water_tests_delete_own" on public.water_tests for delete using (auth.uid() = user_id);

create index if not exists water_tests_tank_id_tested_at_idx on public.water_tests (tank_id, tested_at desc);

-- ============================================================
-- PEUPLEMENT (livestock) — poissons, invertébrés, plantes, coraux
-- ============================================================
create table if not exists public.livestock (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('fish', 'invertebrate', 'plant', 'coral')),
  species_common_name text not null,
  species_scientific_name text,
  quantity integer not null default 1 check (quantity > 0),
  sex text check (sex in ('male', 'female', 'unknown', 'mixed')),
  adult_size_cm numeric,
  bioload_factor numeric not null default 1.0,
  temperament text,
  min_tank_liters numeric,
  added_at date,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.livestock enable row level security;

create policy "livestock_select_own" on public.livestock for select using (auth.uid() = user_id);
create policy "livestock_insert_own" on public.livestock for insert with check (auth.uid() = user_id);
create policy "livestock_update_own" on public.livestock for update using (auth.uid() = user_id);
create policy "livestock_delete_own" on public.livestock for delete using (auth.uid() = user_id);

-- ============================================================
-- ENTRETIEN (maintenance_logs) — tâches, rappels, journal
-- ============================================================
create table if not exists public.maintenance_logs (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_type text not null check (task_type in ('water_change', 'filter_clean', 'glass_clean', 'dosing', 'feeding', 'equipment_check', 'other')),
  description text,
  percentage_changed numeric,
  performed_at timestamptz not null default now(),
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.maintenance_logs enable row level security;

create policy "maintenance_logs_select_own" on public.maintenance_logs for select using (auth.uid() = user_id);
create policy "maintenance_logs_insert_own" on public.maintenance_logs for insert with check (auth.uid() = user_id);
create policy "maintenance_logs_update_own" on public.maintenance_logs for update using (auth.uid() = user_id);
create policy "maintenance_logs_delete_own" on public.maintenance_logs for delete using (auth.uid() = user_id);

create index if not exists maintenance_logs_tank_id_next_due_idx on public.maintenance_logs (tank_id, next_due_at);

-- ============================================================
-- CONVERSATIONS IA (ai_conversations + ai_messages)
-- ============================================================
create table if not exists public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_conversations enable row level security;

create policy "ai_conversations_select_own" on public.ai_conversations for select using (auth.uid() = user_id);
create policy "ai_conversations_insert_own" on public.ai_conversations for insert with check (auth.uid() = user_id);
create policy "ai_conversations_update_own" on public.ai_conversations for update using (auth.uid() = user_id);
create policy "ai_conversations_delete_own" on public.ai_conversations for delete using (auth.uid() = user_id);

create table if not exists public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

create policy "ai_messages_select_own" on public.ai_messages for select using (auth.uid() = user_id);
create policy "ai_messages_insert_own" on public.ai_messages for insert with check (auth.uid() = user_id);

create index if not exists ai_messages_conversation_id_idx on public.ai_messages (conversation_id, created_at);

-- ============================================================
-- DIAGNOSTICS IA (ai_diagnostics) — check-ups façon "Aquarium Doctor"
-- ============================================================
create table if not exists public.ai_diagnostics (
  id uuid primary key default uuid_generate_v4(),
  tank_id uuid not null references public.tanks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('photo', 'text', 'both')),
  input_description text,
  photo_url text,
  likely_condition text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  severity text not null check (severity in ('low', 'medium', 'high', 'urgent')),
  recommended_actions jsonb not null default '[]'::jsonb,
  vet_referral boolean not null default false,
  raw_ai_response jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_diagnostics enable row level security;

create policy "ai_diagnostics_select_own" on public.ai_diagnostics for select using (auth.uid() = user_id);
create policy "ai_diagnostics_insert_own" on public.ai_diagnostics for insert with check (auth.uid() = user_id);
create policy "ai_diagnostics_delete_own" on public.ai_diagnostics for delete using (auth.uid() = user_id);

create index if not exists ai_diagnostics_tank_id_created_idx on public.ai_diagnostics (tank_id, created_at desc);

-- ============================================================
-- Trigger générique updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tanks_set_updated_at before update on public.tanks
  for each row execute function public.set_updated_at();

create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- ============================================================
-- Storage bucket pour les photos (bandelettes, poissons, bac)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('aquarium-photos', 'aquarium-photos', true)
on conflict (id) do nothing;

create policy "aquarium_photos_read_all" on storage.objects for select using (bucket_id = 'aquarium-photos');
create policy "aquarium_photos_insert_own" on storage.objects for insert with check (
  bucket_id = 'aquarium-photos' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "aquarium_photos_delete_own" on storage.objects for delete using (
  bucket_id = 'aquarium-photos' and auth.uid()::text = (storage.foldername(name))[1]
);
