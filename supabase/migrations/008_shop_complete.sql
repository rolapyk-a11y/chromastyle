-- ============================================================
-- Outfitter – "Fuldend outfittet" (complete the outfit from shops)
-- ============================================================

-- 1. Cache of Google Shopping searches (each search costs Serper credits)
create table if not exists public.shop_search_cache (
  query_key   text primary key,               -- normalised query + country
  results     jsonb not null default '[]',
  cached_at   timestamp with time zone not null default now(),
  expires_at  timestamp with time zone not null
);

alter table public.shop_search_cache enable row level security;

create policy "Authenticated users can read shop search cache"
  on public.shop_search_cache for select to authenticated using (true);
create policy "Authenticated users can write shop search cache"
  on public.shop_search_cache for insert to authenticated with check (true);
create policy "Authenticated users can refresh shop search cache"
  on public.shop_search_cache for update to authenticated using (true) with check (true);

-- 2. Signed-in users may add a found shop product to the shared catalogue,
--    so it can be saved and used in outfits.
create policy "Authenticated users can add clothing items"
  on public.clothing_items for insert to authenticated with check (true);

create index if not exists clothing_items_product_url_idx
  on public.clothing_items (product_url);

-- 3. saved_items: make sure users can manage their own bookmarks
alter table public.saved_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'saved_items' and cmd = 'SELECT') then
    create policy "Users can read own saved items" on public.saved_items
      for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'saved_items' and cmd = 'INSERT') then
    create policy "Users can save items" on public.saved_items
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'saved_items' and cmd = 'DELETE') then
    create policy "Users can remove saved items" on public.saved_items
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;
