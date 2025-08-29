import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://deadlytelokolahufed.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRseXRlbG9rb2xhaHVmZWQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU0MDk3NSwiZXhwIjoyMDUwMTE2OTc1fQ.YgKw3kx1gLtInxRdRjPfnXsNPWOV9S0hUWYjd-PY8O4'
);

async function setupStockTrigger() {
  console.log('🔧 Configurando trigger para actualización automática de stock...\n');
  
  try {
    // Leer el archivo SQL
    const sqlContent = readFileSync('setup-stock-trigger.sql', 'utf8');
    
    // Ejecutar en Supabase
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Si la función exec_sql no existe, intentar con query directo
      console.log('🔄 Intentando ejecutar SQL de forma directa...\n');
      
      // Dividir el SQL en statements individuales
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('RAISE NOTICE') || statement.includes('SELECT')) {
          continue; // Skip NOTICE statements and verification queries
        }
        
        console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
        
        const { error: stmtError } = await supabase
          .from('_dummy_table_that_doesnt_exist')
          .select('*'); // This will fail, but we can try RPC instead
          
        // Try with direct SQL execution using edge functions or admin
        // For now, we'll just log the statements that need to be run manually
        console.log('⚠️ Necesitas ejecutar este SQL manualmente en Supabase SQL Editor:');
        console.log(statement);
        console.log('---');
      }
      
    } else {
      console.log('✅ Trigger configurado exitosamente');
      console.log('Data:', data);
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('1. Abre Supabase Dashboard → SQL Editor');
    console.log('2. Copia y pega el contenido de setup-stock-trigger.sql');
    console.log('3. Ejecuta el script');
    console.log('4. Verifica que el trigger fue creado correctamente');
  }
}

setupStockTrigger().catch(console.error);
