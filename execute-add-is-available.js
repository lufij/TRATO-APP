/**
 * Script para ejecutar el SQL que agrega la columna is_available
 * 
 * Uso:
 * 1. Asegúrate de tener un archivo .env.local con tus credenciales de Supabase
 * 2. Ejecuta: node execute-add-is-available.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function executeSQL() {
  // Verificar que existan las credenciales
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: No se encontraron las credenciales de Supabase');
    console.error('   Asegúrate de tener un archivo .env.local con:');
    console.error('   VITE_SUPABASE_URL=tu_url');
    console.error('   VITE_SUPABASE_ANON_KEY=tu_key');
    process.exit(1);
  }

  // Crear cliente de Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔗 Conectando a Supabase...');
  console.log(`   URL: ${supabaseUrl}`);

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'database', 'add_is_available_column.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando script SQL...');

    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Si no existe la función exec_sql, intentamos con una consulta directa
      console.log('🔄 Intentando método alternativo...');
      
      // Dividir el SQL en statements individuales
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('UPDATE') || statement.includes('CREATE INDEX')) {
          console.log(`   Ejecutando: ${statement.substring(0, 50)}...`);
          
          try {
            const result = await supabase.rpc('exec_sql_statement', { statement });
            if (result.error) {
              console.log(`   ⚠️ Statement falló: ${result.error.message}`);
            } else {
              console.log(`   ✅ Statement ejecutado correctamente`);
            }
          } catch (e) {
            console.log(`   ⚠️ Statement falló: ${e.message}`);
          }
        }
      }
    } else {
      console.log('✅ SQL ejecutado correctamente');
      console.log('   Resultado:', data);
    }

    // Verificar que la columna se haya agregado
    console.log('\n🔍 Verificando que la columna se agregó...');
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'products')
      .eq('column_name', 'is_available');

    if (columnsError) {
      console.log('⚠️ No se pudo verificar la columna:', columnsError.message);
    } else if (columns && columns.length > 0) {
      console.log('✅ Columna is_available confirmada:');
      console.log('   Tipo:', columns[0].data_type);
      console.log('   Nullable:', columns[0].is_nullable);
      console.log('   Default:', columns[0].column_default);
    } else {
      console.log('❌ La columna is_available no se encuentra');
    }

    // Verificar algunos productos de ejemplo
    console.log('\n📦 Verificando productos de ejemplo...');
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, is_available')
      .limit(5);

    if (productsError) {
      console.log('⚠️ No se pudieron obtener productos:', productsError.message);
    } else if (products && products.length > 0) {
      console.log('✅ Productos encontrados:');
      products.forEach(p => {
        console.log(`   - ${p.name}: stock=${p.stock_quantity}, disponible=${p.is_available}`);
      });
    } else {
      console.log('ℹ️ No se encontraron productos');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }

  console.log('\n🎉 Proceso completado');
}

// Ejecutar el script
executeSQL().catch(console.error);
