-- Renforcement de la base : intégrité des propriétaires, index manquants,
-- bornes de valeurs et limites du bucket photos. Entièrement rejouable et
-- sans effet sur les données existantes (les contraintes sont posées en
-- NOT VALID : elles s'appliquent aux nouvelles lignes uniquement).

-- ============================================================
-- 1. Un utilisateur ne peut rattacher une ligne qu'à SON bac
--    (les politiques RLS d'insertion ne vérifiaient que user_id).
-- ============================================================
create or replace function public.enforce_tank_owner()
returns trigger as $$
begin
  if new.tank_id is not null and not exists (
    select 1 from public.tanks t where t.id = new.tank_id and t.user_id = new.user_id
  ) then
    raise exception 'Le bac % n''appartient pas à cet utilisateur', new.tank_id
      using errcode = '42501';
  end if;
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'water_tests', 'livestock', 'maintenance_logs', 'ai_diagnostics',
    'cycling_doses', 'hardscape_items', 'products', 'tank_equipment',
    'density_scenarios', 'treatment_programs', 'ai_conversations'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_enforce_tank_owner', t);
    execute format(
      'create trigger %I before insert or update of tank_id, user_id on public.%I
         for each row execute function public.enforce_tank_owner()',
      t || '_enforce_tank_owner', t
    );
  end loop;
end $$;

-- Même garde pour les messages : la conversation doit appartenir à l'utilisateur.
create or replace function public.enforce_conversation_owner()
returns trigger as $$
begin
  if not exists (
    select 1 from public.ai_conversations c
    where c.id = new.conversation_id and c.user_id = new.user_id
  ) then
    raise exception 'La conversation % n''appartient pas à cet utilisateur', new.conversation_id
      using errcode = '42501';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists ai_messages_enforce_conversation_owner on public.ai_messages;
create trigger ai_messages_enforce_conversation_owner
  before insert or update of conversation_id, user_id on public.ai_messages
  for each row execute function public.enforce_conversation_owner();

-- ============================================================
-- 2. Index manquants (clés étrangères et tris fréquents)
-- ============================================================
create index if not exists tanks_user_id_idx on public.tanks (user_id);
create index if not exists livestock_tank_id_idx on public.livestock (tank_id);
create index if not exists maintenance_logs_tank_id_performed_at_idx on public.maintenance_logs (tank_id, performed_at desc);
create index if not exists hardscape_items_tank_id_idx on public.hardscape_items (tank_id);
create index if not exists tank_equipment_tank_id_idx on public.tank_equipment (tank_id);
create index if not exists density_scenarios_tank_id_idx on public.density_scenarios (tank_id);
create index if not exists treatment_programs_tank_id_idx on public.treatment_programs (tank_id);
create index if not exists ai_conversations_tank_id_idx on public.ai_conversations (tank_id);
create index if not exists custom_species_user_id_idx on public.custom_species (user_id);

-- ============================================================
-- 3. Bornes de valeurs plausibles (nouvelles lignes uniquement)
-- ============================================================
alter table public.water_tests drop constraint if exists water_tests_ranges_check;
alter table public.water_tests add constraint water_tests_ranges_check check (
  (ph is null or ph between 0 and 14)
  and (ammonia_ppm is null or ammonia_ppm >= 0)
  and (nitrite_ppm is null or nitrite_ppm >= 0)
  and (nitrate_ppm is null or nitrate_ppm >= 0)
  and (gh_dgh is null or gh_dgh >= 0)
  and (kh_dkh is null or kh_dkh >= 0)
  and (phosphate_ppm is null or phosphate_ppm >= 0)
  and (temperature_c is null or temperature_c between 0 and 50)
) not valid;

alter table public.maintenance_logs drop constraint if exists maintenance_logs_percentage_check;
alter table public.maintenance_logs add constraint maintenance_logs_percentage_check
  check (percentage_changed is null or percentage_changed between 0 and 100) not valid;

alter table public.livestock drop constraint if exists livestock_bioload_check;
alter table public.livestock add constraint livestock_bioload_check
  check (bioload_factor >= 0) not valid;

-- ============================================================
-- 4. Bucket photos : images uniquement, 10 Mo maximum par fichier
-- ============================================================
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
where id = 'aquarium-photos';
