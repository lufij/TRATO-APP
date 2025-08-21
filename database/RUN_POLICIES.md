How to apply marketplace RLS policies

1) Open Supabase Dashboard > SQL.
2) Paste the contents of `database/policies_marketplace_public_read.sql` and run it.
   - It is idempotent: safe to re-run.
3) Verify:
   - Auth > Policies: products and sellers have a policy named "public read".
   - Table `users` has three policies: read/insert/update own profile.
4) If `daily_products` is a VIEW, nothing happens (skipped automatically). If it's a TABLE, a public read policy is added.
