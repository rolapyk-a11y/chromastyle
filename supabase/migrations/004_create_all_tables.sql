-- ============================================================
-- ChromaStyle – full schema
-- Paste this into the Supabase SQL editor and click Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. Profiles (extends Supabase auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- 2. Color analyses
-- ------------------------------------------------------------
create table if not exists public.color_analyses (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  photo_url           text,
  season              text not null,
  sub_season          text not null,
  skin_undertone      text not null,
  eye_color           text,
  hair_color          text,
  best_colors         text[]   default '{}',
  avoid_colors        text[]   default '{}',
  eye_enhancing_colors text[]  default '{}',
  analysis_details    jsonb,
  created_at          timestamp with time zone default now()
);

create index if not exists color_analyses_user_id_idx
  on public.color_analyses (user_id, created_at desc);

alter table public.color_analyses enable row level security;

create policy "Users can read own analyses"
  on public.color_analyses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on public.color_analyses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own analyses"
  on public.color_analyses for delete
  to authenticated
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 3. Clothing items (shared catalogue, not user-specific)
-- ------------------------------------------------------------
create table if not exists public.clothing_items (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  brand       text not null,
  category    text not null,
  subcategory text,
  price       numeric(10, 2) not null default 0,
  currency    text not null default 'DKK',
  image_url   text,
  product_url text,
  colors      text[]   default '{}',
  seasons     text[]   default '{}',
  style_tags  text[]   default '{}',
  is_trending boolean  default false,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now()
);

create index if not exists clothing_items_season_idx
  on public.clothing_items using gin (seasons);

create index if not exists clothing_items_category_idx
  on public.clothing_items (category);

alter table public.clothing_items enable row level security;

-- Anyone authenticated can browse items
create policy "Authenticated users can read clothing items"
  on public.clothing_items for select
  to authenticated
  using (true);

-- Service role / anon can insert (needed for seeding from API routes)
create policy "Service role can manage clothing items"
  on public.clothing_items for all
  to service_role
  using (true)
  with check (true);

-- Allow anon inserts so the seed route works without service-role key
create policy "Anon can insert clothing items"
  on public.clothing_items for insert
  to anon
  with check (true);


-- ------------------------------------------------------------
-- 4. Saved items (user bookmarks)
-- ------------------------------------------------------------
create table if not exists public.saved_items (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  clothing_item_id uuid not null references public.clothing_items (id) on delete cascade,
  created_at       timestamp with time zone default now(),
  unique (user_id, clothing_item_id)
);

create index if not exists saved_items_user_id_idx
  on public.saved_items (user_id);

alter table public.saved_items enable row level security;

create policy "Users can read own saved items"
  on public.saved_items for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can save items"
  on public.saved_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unsave items"
  on public.saved_items for delete
  to authenticated
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 5. Try-on results
-- ------------------------------------------------------------
create table if not exists public.try_on_results (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  clothing_item_id   uuid references public.clothing_items (id) on delete set null,
  original_photo_url text,
  result_photo_url   text,
  created_at         timestamp with time zone default now()
);

create index if not exists try_on_results_user_id_idx
  on public.try_on_results (user_id, created_at desc);

alter table public.try_on_results enable row level security;

create policy "Users can read own try-on results"
  on public.try_on_results for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own try-on results"
  on public.try_on_results for insert
  to authenticated
  with check (auth.uid() = user_id);
