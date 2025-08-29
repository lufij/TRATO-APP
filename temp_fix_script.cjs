const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Leer las variables de entorno del archivo .env
let envContent;
try {
  envContent = fs.readFileSync('.env', 'utf8');
} catch (e) {
    console.error("Error: No se pudo leer el archivo .env. Asegúrate de que exista y contenga las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
});

if (!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_ANON_KEY) {
    console.error("Error: Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas en el archivo .env.");
    process.exit(1);
}


const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

console.log('🔧 Ejecutando fix para Calcomanías para carros...');

async function fixCalcomanias() {
  try {
    // Ejecutar el UPDATE
    const { data: updateData, error: updateError } = await supabase.rpc('exec_sql', {
      query: 'UPDATE public.products ' +
             'SET is_available = true, updated_at = NOW() ' +
             "WHERE id = '1320b463-1db1-4f58-aa65-78b2cbb78a4d' " +
             "AND name = 'Calcomanías para carros';"
    });
    
    if (updateError) {
      console.log('ℹ️ La función RPC exec_sql no está disponible o falló. Intentando actualización directa...');
      // Si no existe la función, usar UPDATE directo
      const { data, error } = await supabase
        .from('products')
        .update({
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', '1320b463-1db1-4f58-aa65-78b2cbb78a4d');
        
      if (error) throw error;
      console.log('✅ Producto actualizado directamente');
    } else {
      console.log('✅ Producto actualizado via RPC');
    }

    // Verificar el cambio
    const { data: verification, error: verifyError } = await supabase
      .from('products')
      .select('name, stock_quantity, is_public, is_available, updated_at')
      .eq('id', '1320b463-1db1-4f58-aa65-78b2cbb78a4d')
      .single();

    if (verifyError) throw verifyError;

    console.log('\n📊 Estado actual del producto:');
    console.log(verification);
    
    if (verification.is_available) {
      console.log('\n🎉 ¡ÉXITO! Calcomanías para carros ya está disponible');
    } else {
      console.log('\n❌ ERROR: El producto sigue sin estar disponible');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixCalcomanias();
