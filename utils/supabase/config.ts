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
  // Replace the fallback values with your own project if different
  url: envUrl ?? 'https://olidxbacfxrijmmtpcoy.supabase.co',
  anonKey:
    envAnon ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWR4YmFjZnhyaWptbXRwY295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MjI0ODcsImV4cCI6MjA3MDE5ODQ4N30.j0DydNPWRlsvONg6qPcY4w7Wezds7wvsgXrhWeRSVGc',
};

// Service Role Key for admin operations (if needed)
// Get this from Supabase Dashboard > Settings > API > service_role key
export const supabaseServiceConfig = {
  serviceRoleKey: '', // Add this if you need admin operations
};

// Project information
export const projectInfo = {
  projectId: 'olidxbacfxrijmmtpcoy',
  region: 'us-east-1', // Update if your project is in a different region
};

// Environment-specific configuration
export const environment = {
  isDevelopment: window.location.hostname === 'localhost',
  isProduction: window.location.hostname !== 'localhost',
};

// Diagnostics to detect when production is using repository fallback keys (misconfiguration on Vercel)
export const supabaseEnvDiagnostics = (() => {
  const usedFallbackUrl = !envUrl;
  const usedFallbackAnon = !envAnon;
  const usedFallback = usedFallbackUrl || usedFallbackAnon;
  const isProd = environment.isProduction;

  // Surface a clear console error in production to help troubleshooting
  if (isProd && usedFallback) {
    // eslint-disable-next-line no-console
    console.error(
      '[Supabase] Variables de entorno faltantes en producción. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel. Se está usando el proyecto de fallback del repositorio (no recomendado).'
    );
    // Mark a global flag so UI can show a warning toast if desired
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__SUPABASE_MISCONFIGURED__ = true;
  }

  return {
    isProd,
    usedFallback,
    urlInUse: supabaseConfig.url,
    hasEnv: Boolean(envUrl && envAnon),
  };
})();