-- Create diagnostics table for storing client-side diagnostic payloads
create table if not exists public.diagnostics (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  origin text,
  user_id uuid,
  payload jsonb
);

-- Grant insert via service role only (anon should not be able to insert)
-- The serverless endpoint will use the service role key to insert into this table.
