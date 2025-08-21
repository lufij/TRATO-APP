import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const anon = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !anon) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in the environment before running this test script.');
  process.exit(1);
}

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
