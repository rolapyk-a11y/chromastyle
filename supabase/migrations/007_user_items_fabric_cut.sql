-- ============================================================
-- Outfitter – one closet for both "Mit skab" and "My Wardrobe"
-- Adds the fields the outfit engine scores on (fabric weight and
-- cut) and a plain image URL for items added from shop catalogues.
-- ============================================================

alter table public.user_items
  add column if not exists fabric text
    check (fabric in ('linen', 'light-cotton', 'cotton', 'denim', 'knit', 'fleece', 'wool')),
  add column if not exists cut text
    check (cut in ('slim', 'tapered', 'regular', 'relaxed', 'wide', 'oversized')),
  add column if not exists external_image_url text;
