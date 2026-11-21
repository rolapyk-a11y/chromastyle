-- Ensure color_analyses table exists with correct schema
create table if not exists public.color_analyses (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  photo_url          text,
  season             text not null,
  sub_season         text not null,
  skin_undertone     text not null,
  eye_color          text,
  hair_color         text,
  best_colors        text[] default '{}',
  avoid_colors       text[] default '{}',
  eye_enhancing_colors text[] default '{}',
  analysis_details   jsonb,
  created_at         timestamp with time zone default now()
);

-- Enable RLS
alter table public.color_analyses enable row level security;

-- Users can read their own analyses
do $$ begin
  create policy "Users can read own analyses"
    on public.color_analyses for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Users can insert their own analyses
do $$ begin
  create policy "Users can insert own analyses"
    on public.color_analyses for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Users can delete their own analyses
do $$ begin
  create policy "Users can delete own analyses"
    on public.color_analyses for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
