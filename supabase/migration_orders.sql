-- הרצה חד־פעמית ב-SQL Editor אם הפרויקט כבר השתמש ב-schema.sql הישן
-- (מי שמתחיל מחדש — הכל כבר ב-supabase/schema.sql)

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
