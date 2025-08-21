// Load from environment when available (Vite)
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !envAnon) {
  console.error('[ERROR] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set.');
  throw new Error('Supabase configuration is required.');
}

export const supabaseConfig = {
  url: envUrl,
  anonKey: envAnon,
};

// Service Role Key for admin operations (if needed)
// Get this from Supabase Dashboard > Settings > API > service_role key
export const supabaseServiceConfig = {
  serviceRoleKey: '', // Add this if you need admin operations
};

// Project information
export const projectInfo = {
  // Replace with your Supabase project ID when configuring locally/CI.
  projectId: 'REPLACE_WITH_YOUR_PROJECT_ID',
  region: 'us-east-1', // Update if your project is in a different region
};

// Environment-specific configuration
export const environment = {
  isDevelopment: window.location.hostname === 'localhost',
  isProduction: window.location.hostname !== 'localhost',
};

// Diagnostics to detect when production is using repository fallback keys (misconfiguration on Vercel)
export const supabaseEnvDiagnostics = (() => {
      const isProd = environment.isProduction;
      const hasEnv = Boolean(envUrl && envAnon);

      if (isProd && !hasEnv) {
        // eslint-disable-next-line no-console
        console.error(
          '[Supabase] ERROR: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not set in production.\n' +
            'Configure these variables in your hosting provider (e.g., Vercel) and redeploy.\n' +
            'Do NOT use hard-coded keys in the repository.'
        );
      }

      return {
        isProd,
        usedFallback: !hasEnv,
        urlInUse: supabaseConfig.url,
        hasEnv,
      };
    })();