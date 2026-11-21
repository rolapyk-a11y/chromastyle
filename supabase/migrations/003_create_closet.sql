-- ============================================================
-- ChromaStyle – "Mit skab" (the user's own clothes)
-- Paste this into the Supabase SQL editor and click Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. User items (clothes the user owns)
-- ------------------------------------------------------------
create table if not exists public.user_items (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  category     text not null check (category in ('top', 'bottom', 'outerwear', 'shoes', 'accessory')),
  subcategory  text,
  brand        text,
  colors       text[] default '{}',      -- hex codes e.g. '#C8B89A'
  pattern      text,                     -- solid, striped, checked, ...
  style_tags   text[] default '{}',
  occasions    text[] default '{}',      -- work, everyday, party, date, outdoor
  image_path   text,                     -- path inside the 'closet' storage bucket
  notes        text,
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now()
);

create index if not exists user_items_user_id_idx
  on public.user_items (user_id, created_at desc);

alter table public.user_items enable row level security;

create policy "Users can read own items"
  on public.user_items for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own items"
  on public.user_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on public.user_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own items"
  on public.user_items for delete
  to authenticated
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 2. Private storage bucket for clothing photos
--    Files live at closet/<user_id>/<file>.jpg
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('closet', 'closet', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users can read own closet photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own closet photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own closet photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);
