// 🧪 TEST POST-ARREGLO - Verificar que los errores 400 se solucionaron
// Ejecutar en la consola del navegador después de aplicar el SQL fix

console.log('🧪 === VERIFICACIÓN POST-ARREGLO ===');

async function testFixedQueries() {
  console.log('🔍 Probando consultas que antes daban error 400...');
  
  if (typeof supabase === 'undefined') {
    console.log('❌ Supabase no disponible en consola');
    return;
  }

  // Test 1: Función RPC para conteo
  console.log('\n1️⃣ Probando función RPC get_online_drivers_count()...');
  try {
    const { data, error } = await supabase.rpc('get_online_drivers_count');
    if (error) {
      console.log('❌ Error RPC:', error.message);
    } else {
      console.log('✅ RPC exitosa - Drivers online:', data);
    }
  } catch (err) {
    console.log('❌ Excepción RPC:', err.message);
  }

  // Test 2: Consulta directa de drivers (solo is_online)
  console.log('\n2️⃣ Probando consulta directa de drivers...');
  try {
    const { count, error } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);
    
    if (error) {
      console.log('❌ Error consulta directa:', error.message);
    } else {
      console.log('✅ Consulta directa exitosa - Count:', count);
    }
  } catch (err) {
    console.log('❌ Excepción consulta directa:', err.message);
  }

  // Test 3: Consulta básica de drivers (solo is_online)
  console.log('\n3️⃣ Probando consulta básica de drivers...');
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('is_online')
      .limit(5);
    
    if (error) {
      console.log('❌ Error consulta básica:', error.message);
    } else {
      console.log('✅ Consulta básica exitosa - Registros:', data?.length);
      const onlineCount = data?.filter(d => d.is_online).length || 0;
      console.log('✅ Drivers online encontrados:', onlineCount);
    }
  } catch (err) {
    console.log('❌ Excepción consulta básica:', err.message);
  }

  // Test 4: Función de información detallada
  console.log('\n4️⃣ Probando función de información detallada...');
  try {
    const { data, error } = await supabase.rpc('get_available_drivers_info');
    if (error) {
      console.log('❌ Error función info:', error.message);
    } else {
      console.log('✅ Función info exitosa:', data);
    }
  } catch (err) {
    console.log('❌ Excepción función info:', err.message);
  }

  // Test 5: Consulta de usuarios (para verificar joins)
  console.log('\n5️⃣ Probando consulta de usuarios...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'repartidor')
      .limit(3);
    
    if (error) {
      console.log('❌ Error consulta usuarios:', error.message);
    } else {
      console.log('✅ Consulta usuarios exitosa - Repartidores:', data?.length);
    }
  } catch (err) {
    console.log('❌ Excepción consulta usuarios:', err.message);
  }

  // Test 6: Daily products
  console.log('\n6️⃣ Probando consulta de daily_products...');
  try {
    const { data, error } = await supabase
      .from('daily_products')
      .select('id, is_active')
      .eq('is_active', true)
      .limit(3);
    
    if (error) {
      console.log('❌ Error daily_products:', error.message);
    } else {
      console.log('✅ Daily products exitosa - Productos activos:', data?.length);
    }
  } catch (err) {
    console.log('❌ Excepción daily_products:', err.message);
  }

  console.log('\n🎯 === RESUMEN ===');
  console.log('Si ves ✅ en todas las pruebas, los errores 400 están solucionados.');
  console.log('Si ves ❌, revisa que el script SQL se haya ejecutado completamente.');
}

// Ejecutar automáticamente
testFixedQueries();

// También crear función disponible globalmente
window.testDatabaseFix = testFixedQueries;
