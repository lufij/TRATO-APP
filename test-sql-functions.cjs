// 🧪 TEST DE FUNCIONES SQL POST-REPARACIÓN
// Verificar que las funciones RPC funcionan correctamente

const { createClient } = require('@supabase/supabase-js');

const url = 'https://deaddzylotqdckublfed.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

console.log('🧪 Verificando funciones SQL post-reparación...\n');

const supabase = createClient(url, key);

async function testSQLFunctions() {
  console.log('1️⃣ Test de función get_online_drivers_count()');
  try {
    const { data, error } = await supabase.rpc('get_online_drivers_count');
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Resultado:', data, 'drivers online');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n2️⃣ Test de función get_online_drivers_ids()');
  try {
    const { data, error } = await supabase.rpc('get_online_drivers_ids');
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Resultado:', data || '(sin IDs)');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n3️⃣ Test de función get_drivers_basic_info()');
  try {
    const { data, error } = await supabase.rpc('get_drivers_basic_info');
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Resultado JSON:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n4️⃣ Test de consulta directa a drivers');
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, is_online')
      .eq('is_online', true);
    
    if (error) {
      console.log('❌ Error consulta directa:', error.message);
    } else {
      console.log('✅ Drivers online (directo):', data?.length || 0);
      console.log('   Datos:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Exception consulta directa:', err.message);
  }

  console.log('\n5️⃣ Test de conteo con count');
  try {
    const { count, error } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);
    
    if (error) {
      console.log('❌ Error count:', error.message);
    } else {
      console.log('✅ Count directo:', count);
    }
  } catch (err) {
    console.log('❌ Exception count:', err.message);
  }

  console.log('\n🎯 Test completado. Las funciones deben estar funcionando ahora.');
}

testSQLFunctions().catch(console.error);
