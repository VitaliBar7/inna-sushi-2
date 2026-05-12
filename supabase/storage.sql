-- הרץ ב-Supabase → SQL (אחרי schema.sql).
-- יוצר דלי "menu-images" (ציבורי) + מדיניות RLS — העלאה רק למשתמש מחובר, קריאה לכולם.

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set
  public = true,
  name = excluded.name;

-- (אופציונלי) ב-Dashboard → Storage → menu-images: הגבלת גודל ~10MB וסוגי קבצים — image/* (יישור עם MENU_IMAGE_MAX_BYTES בקוד)

drop policy if exists "menu_images_select" on storage.objects;
create policy "menu_images_select"
  on storage.objects
  for select
  to public
  using (bucket_id = 'menu-images');

drop policy if exists "menu_images_insert" on storage.objects;
create policy "menu_images_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'menu-images');

drop policy if exists "menu_images_update" on storage.objects;
create policy "menu_images_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'menu-images')
  with check (bucket_id = 'menu-images');

drop policy if exists "menu_images_delete" on storage.objects;
create policy "menu_images_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'menu-images');
