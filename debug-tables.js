// Script para verificar tablas existentes en Supabase
import { supabase } from './utils/supabase/client.js';

async function checkExistingTables() {
  console.log('🔍 Verificando tablas existentes en Supabase...\n');
  
  const tablesToCheck = [
    'users',
    'sellers', 
    'drivers',
    'products',
    'daily_products',
    'orders',
    'order_items',
    'notifications',
    'user_addresses',
    'business_profiles'
  ];

  for (const table of tablesToCheck) {
    try {
      console.log(`📋 Verificando tabla: ${table}`);
      
      // Intentar hacer una consulta simple para ver si la tabla existe
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Existe (${count || 0} registros)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error - ${err.message}`);
    }
  }

  console.log('\n🏁 Verificación completada');
}

checkExistingTables().catch(console.error);
