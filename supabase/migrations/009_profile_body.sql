-- ============================================================
-- Outfitter – body/fit profile stored on the account
-- (it used to live only in the browser's localStorage)
-- ============================================================

alter table public.profiles
  add column if not exists body_profile jsonb;
