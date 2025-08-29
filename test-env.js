// Test simple para verificar conectividad
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno del .env.local
dotenv.config({ path: '.env.local' });

console.log('🔍 Variables de entorno cargadas:');
console.log('URL:', process.env.VITE_SUPABASE_URL);
console.log('Key definida:', !!process.env.VITE_SUPABASE_ANON_KEY);

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Variables de entorno no definidas');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testQuick() {
  try {
    console.log('🔄 Probando conexión...');
    
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log('✅ Conexión exitosa');
    console.log(`📊 Resultado: ${data?.length || 0} órdenes`);
    
  } catch (err) {
    console.error('💥 Error de conexión:', err.message);
  }
}

testQuick();
