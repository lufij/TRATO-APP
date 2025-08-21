# Security and Secret Handling

This document explains how to rotate and store Supabase keys and other secrets used by this project.

## Rotate keys found in repository
If any Supabase keys were committed to the repository, rotate them immediately in the Supabase dashboard:
1. Go to Supabase → Settings → API.
2. Rotate the keys (anon and service_role) and copy the new values.
3. Update your hosting provider (Vercel) and CI secrets with the new values.

## Where to store secrets
- Client build values (public keys) should be added as `VITE_` prefixed environment variables in your hosting provider (Vercel), e.g. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Server-only secrets (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_DIAG_SECRET`) must be stored as protected environment variables in Vercel and never exposed to the client.

## Local development
Create a local-only `.env.local` (not committed) and add values there. Example:

```text
VITE_SUPABASE_URL=https://<PROJECT>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_URL=https://<PROJECT>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> # optional for local serverless tests
```

## Commit prevention
- A lightweight pre-commit hook is included in `.githooks/pre-commit`. To enable locally run:

```bash
git config core.hooksPath .githooks
```

- CI scanning is enabled via `.github/workflows/secret-scan.yml` using `gitleaks`.

## Incident response
1. Revoke/rotate compromised keys in Supabase.
2. Remove keys from git history (use `git filter-repo` or `git filter-branch`) if necessary.
3. Update secrets in Vercel and CI.
4. Regenerate any tokens and notify stakeholders.

