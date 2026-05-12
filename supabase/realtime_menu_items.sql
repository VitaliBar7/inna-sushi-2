-- הפעלת Realtime לטבלת menu_items (שינויים בלי רענון בדפדפן)
-- Supabase: SQL Editor — ניתן להריץ שוב בלי שגיאה

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;
END
$do$;
