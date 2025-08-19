import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://olidxbacfxrijmmtpcoy.supabase.co';
const anon = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWR4YmFjZnhyaWptbXRwY295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MjI0ODcsImV4cCI6MjA3MDE5ODQ4N30.j0DydNPWRlsvONg6qPcY4w7Wezds7wvsgXrhWeRSVGc';

const ts = Date.now();
const email = process.env.TEST_EMAIL || `trato.e2e+buyer.${ts}@example.com`;
const password = process.env.TEST_PASSWORD || `P@ssw0rd${ts}!`;

const supabase = createClient(url, anon);

console.log('[test-signup-buyer] Using project:', url);
console.log('[test-signup-buyer] Email:', email);

try {
  // Sign up
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: undefined },
  });
  if (signUpErr) {
    console.error('[test-signup-buyer] SignUp error:', signUpErr.message);
    process.exit(1);
  }

  // Get or create session via sign-in if needed
  let { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    if (siErr) {
      console.error('[test-signup-buyer] SignIn error:', siErr.message);
      process.exit(1);
    }
    session = si.session;
  }

  if (!session?.user) {
    console.error('[test-signup-buyer] No session after signup/signin');
    process.exit(1);
  }

  console.log('[test-signup-buyer] Auth OK. User ID:', session.user.id);

  // Try to create minimal user profile (like the app does)
  const minimalProfile = {
    id: session.user.id,
    email,
    name: 'E2E Buyer',
    role: 'comprador',
  };
  const { error: insertErr } = await supabase.from('users').insert([minimalProfile]);
  if (insertErr) {
    console.warn('[test-signup-buyer] Profile insert warning:', insertErr.message);
  } else {
    console.log('[test-signup-buyer] Profile inserted');
  }

  // Verify profile exists
  const { data: profile, error: selErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (selErr) {
    console.warn('[test-signup-buyer] Profile select warning:', selErr.message);
  } else {
    console.log('[test-signup-buyer] Profile found. Role:', profile?.role);
  }

  console.log('[test-signup-buyer] DONE');
  process.exit(0);
} catch (e) {
  console.error('[test-signup-buyer] Unexpected error:', e?.message || e);
  process.exit(1);
}
