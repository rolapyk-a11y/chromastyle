create table if not exists product_cache (
  sub_season text primary key,
  products   jsonb not null default '[]',
  cached_at  timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null
);

-- Allow authenticated users to read cached products
alter table product_cache enable row level security;

create policy "Anyone can read product cache"
  on product_cache for select
  using (true);

create policy "Service role can write product cache"
  on product_cache for all
  using (auth.role() = 'service_role' or auth.role() = 'authenticated');
