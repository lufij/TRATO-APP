import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://olidxbacfxrijmmtpcoy.supabase.co';
const anon = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWR4YmFjZnhyaWptbXRwY295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MjI0ODcsImV4cCI6MjA3MDE5ODQ4N30.j0DydNPWRlsvONg6qPcY4w7Wezds7wvsgXrhWeRSVGc';

async function main() {
  console.log('🔍 Verificando conexión con Supabase...');
  const supabase = createClient(url, anon);
  const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  console.log('✅ Conexión exitosa');
}

main();
