import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://olidxbacfxrijmmtpcoy.supabase.co';
const anon = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWR4YmFjZnhyaWptbXRwY295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MjI0ODcsImV4cCI6MjA3MDE5ODQ4N30.j0DydNPWRlsvONg6qPcY4w7Wezds7wvsgXrhWeRSVGc';

const email = process.env.TEST_EMAIL || 'fake@example.com';
const password = process.env.TEST_PASSWORD || 'incorrect-password';

const supabase = createClient(url, anon);

console.log('[test-signin] Using project:', url);

try {
  const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log('[test-signin] Sign-in response error:', error.message);
    process.exit(0);
  }
  console.log('[test-signin] Signed in. Session:', !!session);
  process.exit(0);
} catch (e) {
  console.error('[test-signin] Unexpected error:', e?.message || e);
  process.exit(1);
}
