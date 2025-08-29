/**
 * Script para ejecutar el SQL que agrega la columna is_available
 * 
 * Uso:
 * 1. Configura las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
 * 2. Ejecuta: node execute-add-is-available.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function executeSQL() {
  // Verificar que existan las credenciales
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: No se encontraron las credenciales de Supabase');
    console.error('   Configura las variables de entorno:');
    console.error('   VITE_SUPABASE_URL=tu_url');
    console.error('   VITE_SUPABASE_ANON_KEY=tu_key');
    console.error('\n   O puedes editarlas directamente en este script para desarrollo local');
    
    // Para desarrollo local, puedes descomentar estas líneas y agregar tus credenciales:
    // const supabaseUrl = 'https://tu-proyecto.supabase.co';
    // const supabaseAnonKey = 'tu-anon-key';
    
    process.exit(1);
  }

  // Crear cliente de Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔗 Conectando a Supabase...');
  console.log(`   URL: ${supabaseUrl}`);

  try {
    // En lugar de ejecutar el SQL complejo, hagamos los cambios paso a paso
    console.log('📄 Verificando si la columna is_available ya existe...');

    // Intentar hacer una consulta simple para verificar la columna
    const { data: testProducts, error: testError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, is_available')
      .limit(1);

    if (testError && testError.message.includes('is_available')) {
      console.log('✅ La columna is_available no existe, procediendo a crearla...');
      
      // La columna no existe, la necesitamos crear de manera manual
      console.log('⚠️ La columna is_available necesita ser agregada desde el panel de Supabase');
      console.log('   Por favor, ve al panel de Supabase y ejecuta este SQL:');
      console.log('\n   ALTER TABLE public.products ADD COLUMN is_available BOOLEAN DEFAULT true;');
      console.log('   UPDATE public.products SET is_available = CASE WHEN stock_quantity > 0 THEN true ELSE false END;');
      console.log('\n   Luego ejecuta este script nuevamente.');
      
    } else if (testError) {
      console.error('❌ Error inesperado:', testError.message);
    } else {
      console.log('✅ La columna is_available ya existe!');
      
      if (testProducts && testProducts.length > 0) {
        console.log('\n📦 Productos encontrados:');
        testProducts.forEach(p => {
          console.log(`   - ${p.name}: stock=${p.stock_quantity}, disponible=${p.is_available}`);
        });
      }

      // Verificar cuántos productos hay en total
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`\n📊 Total de productos: ${count}`);
      }

      // Verificar cuántos están disponibles
      const { count: availableCount, error: availableError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      if (!availableError) {
        console.log(`   Productos disponibles: ${availableCount}`);
      }

      // Verificar cuántos tienen stock
      const { count: stockCount, error: stockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('stock_quantity', 0);

      if (!stockError) {
        console.log(`   Productos con stock: ${stockCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }

  console.log('\n🎉 Verificación completada');
}

// Ejecutar el script
executeSQL().catch(console.error);
