-- ============================================================
-- ChromaStyle – Outfits (combinations of the user's clothes)
-- An outfit item points to either one of the user's own clothes
-- (user_items) or a shop item from the catalogue (clothing_items).
-- ============================================================

create table if not exists public.outfits (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  occasion    text,                    -- everyday, work, party, date, outdoor
  notes       text,
  approved    boolean default false,   -- the user has confirmed this works on them
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

create index if not exists outfits_user_id_idx
  on public.outfits (user_id, created_at desc);

create table if not exists public.outfit_items (
  id               uuid default gen_random_uuid() primary key,
  outfit_id        uuid not null references public.outfits (id) on delete cascade,
  user_item_id     uuid references public.user_items (id) on delete cascade,
  clothing_item_id uuid references public.clothing_items (id) on delete cascade,
  position         integer not null default 0,
  check ((user_item_id is null) <> (clothing_item_id is null))
);

create index if not exists outfit_items_outfit_id_idx
  on public.outfit_items (outfit_id, position);

alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;

create policy "Users can read own outfits"
  on public.outfits for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own outfits"
  on public.outfits for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own outfits"
  on public.outfits for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own outfits"
  on public.outfits for delete to authenticated
  using (auth.uid() = user_id);

-- Outfit items follow their outfit's owner
create policy "Users can read own outfit items"
  on public.outfit_items for select to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));

create policy "Users can insert own outfit items"
  on public.outfit_items for insert to authenticated
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid())
    and (user_item_id is null or exists (select 1 from public.user_items u where u.id = user_item_id and u.user_id = auth.uid()))
  );

create policy "Users can delete own outfit items"
  on public.outfit_items for delete to authenticated
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
