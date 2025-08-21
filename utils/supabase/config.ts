// Load from environment when available (Vite), fallback to defaults currently in use
let envUrl: string | undefined;
let envAnon: string | undefined;
try {
  // Vite-style env vars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = (import.meta as any)?.env;
  envUrl = env?.VITE_SUPABASE_URL;
  envAnon = env?.VITE_SUPABASE_ANON_KEY;
} catch (e) {
  envUrl = undefined;
  envAnon = undefined;
}

export const supabaseConfig = {
  // IMPORTANT: Do NOT store real project keys in the repository.
  // Provide these values via environment variables (Vite: VITE_SUPABASE_*).
  // If empty, code that requires a valid client should fail early so misconfigs are obvious.
  url: envUrl ?? '',
  anonKey: envAnon ?? '',
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