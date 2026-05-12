-- סט: רשימת מחרוזות (רולים/מוצרים) — מערך JSON
alter table public.menu_items
  add column if not exists set_contents jsonb not null default '[]'::jsonb;

comment on column public.menu_items.set_contents is
  'רשימת שמות פריטים בכרטיס "סט" (JSON array of strings)';
