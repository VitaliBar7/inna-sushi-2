-- Optional one-time data (run manually after schema.sql) — from the design menu.
-- Skip if you prefer an empty list.

insert into public.menu_items (name, description, price, category, image_url)
select * from (values
  ('מאקי מלפפון', null::text, 25.00::numeric, 'maki', null::text),
  ('מאקי סלמון', null, 35.00, 'maki', null),
  ('מאקי קרים צ׳יז', null, 30.00, 'maki', null),
  ('קליפורניה איקרה טוביקו', 'אורז, נורי, מלפפון, גבינה, סלמון', 50.00, 'special', null),
  ('פילדלפיה סלמון־איקרה', null, 60.00, 'special', null)
) v(name, description, price, category, image_url)
where not exists (select 1 from public.menu_items limit 1);
