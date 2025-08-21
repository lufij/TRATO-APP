import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const anon = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !anon) {
  console.error('ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in the environment before running this script.');
  process.exit(1);
}

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
