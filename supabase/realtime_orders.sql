-- הפעלת Realtime לטבלת orders (באדג' הזמנות חדשות בלי רענון)
-- ניתן להריץ שוב: אם הטבלה כבר בפרסום, לא קורה כלום

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END
$do$;
