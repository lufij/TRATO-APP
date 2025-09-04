// 🔍 VERIFICACIÓN COMPLETA: ESTRUCTURA + PRUEBAS
// Ejecutar en la consola del navegador

console.log('🔍 === VERIFICACIÓN COMPLETA DE DRIVERS ===');

async function completeDriversCheck() {
  if (typeof supabase === 'undefined') {
    console.log('❌ Supabase no disponible');
    return;
  }

  // Paso 1: Verificar estructura de la tabla
  console.log('📋 PASO 1: Verificando estructura de tabla drivers...');
  
  try {
    const { data: sampleData, error: sampleError } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.log('❌ Error obteniendo muestra:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      console.log('✅ Columnas disponibles:', columns);
      
      // Verificar columnas críticas
      const hasIsOnline = columns.includes('is_online');
      const hasIsActive = columns.includes('is_active');
      const hasIsVerified = columns.includes('is_verified');
      
      console.log('📊 Estado de columnas:');
      console.log('  - is_online:', hasIsOnline ? '✅' : '❌');
      console.log('  - is_active:', hasIsActive ? '✅' : '❌');
      console.log('  - is_verified:', hasIsVerified ? '✅' : '❌');
      
      console.log('\\n📋 Datos de muestra:', sampleData[0]);
      
    } else {
      console.log('⚠️ Tabla drivers está vacía');
    }
  } catch (err) {
    console.log('❌ Error verificando estructura:', err.message);
  }

  // Paso 2: Probar función RPC (si existe)
  console.log('\\n🔧 PASO 2: Probando función RPC...');
  try {
    const { data, error } = await supabase.rpc('get_online_drivers_count');
    if (error) {
      console.log('❌ Función RPC no disponible:', error.message);
    } else {
      console.log('✅ Función RPC funcionando - Count:', data);
    }
  } catch (err) {
    console.log('❌ Error en RPC:', err.message);
  }

  // Paso 3: Probar consulta básica
  console.log('\\n📊 PASO 3: Probando consulta básica...');
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('is_online')
      .limit(5);
    
    if (error) {
      console.log('❌ Error consulta básica:', error.message);
    } else {
      console.log('✅ Consulta básica exitosa - Registros:', data?.length);
      if (data && data.length > 0) {
        const onlineCount = data.filter(d => d.is_online === true).length;
        console.log('✅ Drivers online encontrados:', onlineCount);
      }
    }
  } catch (err) {
    console.log('❌ Error en consulta básica:', err.message);
  }

  // Paso 4: Probar consulta con count
  console.log('\\n🔢 PASO 4: Probando consulta con count...');
  try {
    const { count, error } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);
    
    if (error) {
      console.log('❌ Error count:', error.message);
    } else {
      console.log('✅ Count exitoso - Drivers online:', count);
    }
  } catch (err) {
    console.log('❌ Error en count:', err.message);
  }

  // Paso 5: Verificar estructura con función RPC (si está disponible)
  console.log('\\n🔍 PASO 5: Verificando estructura con RPC...');
  try {
    const { data, error } = await supabase.rpc('get_drivers_structure');
    if (error) {
      console.log('❌ Función de estructura no disponible:', error.message);
    } else {
      console.log('✅ Estructura obtenida via RPC:', data);
    }
  } catch (err) {
    console.log('❌ Error en estructura RPC:', err.message);
  }

  console.log('\\n🎯 === RESUMEN ===');
  console.log('Si todos los pasos muestran ✅, la tabla está lista para usar.');
  console.log('Si hay ❌, usa el script SQL correspondiente para arreglar.');
}

// Ejecutar verificación
completeDriversCheck();

// Hacer función disponible globalmente
window.checkDriversComplete = completeDriversCheck;
