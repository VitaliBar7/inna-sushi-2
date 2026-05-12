-- הרצה חד-פעמית ב-Supabase SQL Editor אם הטבלה כבר קיימת בלי עמודת discount_percent
alter table public.menu_items
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

comment on column public.menu_items.discount_percent is
  'אחוז הנחה ממחיר המחירון (price). 0 = בלי הנחה.';
