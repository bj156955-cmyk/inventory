-- ============================================================
-- Equipment Maintenance (장비 관리) — Supabase setup
-- Run this in Supabase Dashboard → SQL Editor (once).
-- ============================================================

-- 1. equipment table
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  -- [{ id, period: 'daily'|'weekly'|'monthly', label }]
  maintenance_items jsonb not null default '[]'::jsonb,
  -- [{ id, name, quantity, unit }]
  consumables jsonb not null default '[]'::jsonb,
  -- ids of maintenance_items that are currently checked
  completed_items jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_created_at_idx on public.equipment (created_at);

-- 2. Row Level Security: same model as the other tables in this app
--    ("allow all", auth is handled by the app's allowed-user list).
alter table public.equipment enable row level security;

drop policy if exists "equipment_allow_all" on public.equipment;
create policy "equipment_allow_all"
  on public.equipment
  for all
  using (true)
  with check (true);

-- 3. Storage bucket for equipment photos (public read)
insert into storage.buckets (id, name, public)
values ('equipment-photos', 'equipment-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "equipment_photos_read" on storage.objects;
create policy "equipment_photos_read"
  on storage.objects
  for select
  using (bucket_id = 'equipment-photos');

drop policy if exists "equipment_photos_insert" on storage.objects;
create policy "equipment_photos_insert"
  on storage.objects
  for insert
  with check (bucket_id = 'equipment-photos');

drop policy if exists "equipment_photos_update" on storage.objects;
create policy "equipment_photos_update"
  on storage.objects
  for update
  using (bucket_id = 'equipment-photos');

drop policy if exists "equipment_photos_delete" on storage.objects;
create policy "equipment_photos_delete"
  on storage.objects
  for delete
  using (bucket_id = 'equipment-photos');

-- 4. Realtime (live sync across devices)
do $$
begin
  alter publication supabase_realtime add table public.equipment;
exception
  when duplicate_object then null;
end $$;
