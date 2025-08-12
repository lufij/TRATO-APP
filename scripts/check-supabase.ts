import { supabase } from '../utils/supabase/client';

async function main() {
  try {
    console.log('🔍 Verificando conexión con Supabase...');
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Conexión exitosa');
  } catch (e: any) {
    console.error('❌ Error:', e.message || e);
    process.exitCode = 1;
  }
}

main();
