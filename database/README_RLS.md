Steps to enable RLS policies and verify deployment

1) Open Supabase Dashboard → SQL Editor.
2) Open `database/policies_marketplace_public_read.sql` from this repo and paste its contents in the SQL editor.
3) Run the query as the project Owner. The script is idempotent and safe to re-run.

Verify:
- In Supabase → Table Editor → products/sellers: there should be a policy named `public read`.
- In Supabase → Table Editor → users: there should be `read own profile`, `insert own profile`, `update own profile`.

4) Ensure Supabase Auth is configured with your Vercel URL(s):
- Site URL: https://trato-en-gualan.vercel.app/
- Redirect URLs: https://trato-en-gualan.vercel.app/, https://trato-en-gualan.vercel.app/*, http://localhost:3000

5) Ensure Vercel env vars are set (Production & Preview):
- VITE_SUPABASE_URL = https://<your_project>.supabase.co
- VITE_SUPABASE_ANON_KEY = <anon key>

6) Redeploy on Vercel and clear the build cache.

7) Smoke test: open
https://trato-en-gualan.vercel.app/?diag=1

Check the probe output on the page and browser console. If you see `select users error` with PGRST401/PGRST403 or permission denied, your RLS is blocking reads for the anon role.

If Anon role is blocked, re-run the SQL above to add `public read` for products/sellers. If you need the anon role to read only published products, modify the `using` clause to `using (is_public = true)`.

8) Optional: enable remote diagnostics collection via serverless endpoint
- Create table: run `database/create_diagnostics_table.sql` in Supabase SQL editor.
- In Vercel Project Settings > Environment Variables, add (Production & Preview):
	- SUPABASE_URL = https://<your_project>.supabase.co
	- SUPABASE_SERVICE_ROLE_KEY = <service_role_key from Supabase Settings/API>
	- VERCEL_DIAG_SECRET = <a strong secret you choose>

After setting these vars, redeploy. On the Diagnostic page (`?diag=1`) click "Enviar diagnóstico" and enter the secret. The serverless endpoint `/api/diagnostics` will store the logs into `public.diagnostics`.

Security note: service_role key must be kept secret and only set in Vercel env; it should never be shipped to the browser.
