-- Fashion Trends table
-- Populated by the AI trend agent (lib/agents/trend-agent.ts)
-- Refreshed weekly via /api/trends/refresh

create table if not exists public.fashion_trends (
  id              uuid default gen_random_uuid() primary key,
  title           text not null,
  description     text,
  season          text not null default 'spring',
  sub_seasons     text[] default array['soft-spring', 'light-spring'],
  key_pieces      text[] default '{}',
  color_palette   text[] default '{}',    -- hex codes e.g. '#C8B89A'
  styling_tips    text[] default '{}',
  why_it_works    text,
  aesthetic_tags  text[] default '{}',
  sources         text[] default '{}',
  relevance_score integer default 7,
  searched_at     timestamp with time zone,
  created_at      timestamp with time zone default now(),
  expires_at      timestamp with time zone default (now() + interval '7 days')
);

-- Index for fast queries
create index if not exists fashion_trends_expires_at_idx
  on public.fashion_trends (expires_at desc);

create index if not exists fashion_trends_season_idx
  on public.fashion_trends (season);

-- RLS
alter table public.fashion_trends enable row level security;

-- All authenticated users can read trends (they are not user-specific)
create policy "Authenticated users can read trends"
  on public.fashion_trends
  for select
  to authenticated
  using (true);

-- Only the service role (used by the API route) can write
create policy "Service role can manage trends"
  on public.fashion_trends
  for all
  to service_role
  using (true)
  with check (true);
