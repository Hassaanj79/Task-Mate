-- Daily job that purges rows archived more than 30 days ago.
-- Requires the pg_cron extension (available on Supabase).
create extension if not exists pg_cron;

select cron.schedule(
  'purge-archived-daily',
  '17 3 * * *',
  $$select public.purge_archived()$$
);
