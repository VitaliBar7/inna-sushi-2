-- Run this in the Supabase SQL editor (or via migrations) before using the app.

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  category text not null default 'maki',
  image_url text,
  set_contents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_items_category_idx on public.menu_items (category);

alter table public.menu_items enable row level security;

-- Anyone can read the menu (public site).
drop policy if exists "Menu items are viewable by everyone" on public.menu_items;
create policy "Menu items are viewable by everyone"
  on public.menu_items
  for select
  to anon, authenticated
  using (true);

-- Only signed-in users can change the menu (admin).
drop policy if exists "Authenticated users can insert menu items" on public.menu_items;
create policy "Authenticated users can insert menu items"
  on public.menu_items
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update menu items" on public.menu_items;
create policy "Authenticated users can update menu items"
  on public.menu_items
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete menu items" on public.menu_items;
create policy "Authenticated users can delete menu items"
  on public.menu_items
  for delete
  to authenticated
  using (true);

-- Optional: keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row
  execute function public.set_updated_at();

-- הזמנות מהאתר (רישום ב-DB דרך Next API עם service_role; לקוח אדמין קורא/מעדכן עם RLS)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null,
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  customer_name text not null,
  phone text not null,
  fulfillment text not null check (fulfillment in ('maalot', 'other')),
  lines jsonb not null,
  total_shekels numeric(10, 2) not null check (total_shekels >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_code_key unique (order_code),
  constraint orders_order_code_format check (order_code ~ '^[2-9A-HJ-NP-Z]{5,8}$')
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

drop policy if exists "Authenticated users can view orders" on public.orders;
create policy "Authenticated users can view orders"
  on public.orders
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can update orders" on public.orders;
create policy "Authenticated users can update orders"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();
