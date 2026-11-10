-- Supabase's Data API (PostgREST) exposes the public schema to anyone holding the
-- project's publishable key, and tables created by Prisma have RLS off. This app
-- only reaches the database through Prisma, as the table owner, which RLS does not
-- restrict. Enabling RLS with no policies therefore denies the Data API roles
-- (anon, authenticated) and leaves the app unaffected.
--
-- This covers the tables that exist now. A migration adding a table must enable RLS
-- on it too, unless the Data API has been disabled for the project.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
