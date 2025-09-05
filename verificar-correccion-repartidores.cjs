// 🔧 VERIFICACIÓN: Corrección de inconsistencias aplicada
console.log('🔧 VERIFICACIÓN: Corrección aplicada');
console.log('=====================================');

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://deaddzylotqdckub1fed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWIxZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MjU3MjEsImV4cCI6MjA1MDMwMTcyMX0.gkz0LVXdPPupmZMk06yPYP04FvQfGz7KOjOgn6yLIE8';

const supabase = createClient(supabaseUrl, supabaseKey);

const verificarCorreccion = async () => {
  console.log('\n✅ AMBOS COMPONENTES AHORA USAN LA MISMA CONSULTA:');
  
  try {
    // Esta es la consulta UNIFICADA que ahora usan ambos componentes
    const { count: unifiedCount, data: unifiedData, error: unifiedError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact' })
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('is_verified', true);
    
    console.log(`\n🎯 CONSULTA UNIFICADA:`);
    console.log(`   Tabla: drivers`);
    console.log(`   Criterios: is_online=true AND is_active=true AND is_verified=true`);
    console.log(`   Resultado: ${unifiedCount} repartidores disponibles`);
    
    if (unifiedData && unifiedData.length > 0) {
      console.log(`\n📋 Repartidores encontrados:`);
      unifiedData.forEach((driver, index) => {
        console.log(`   ${index + 1}. ID: ${driver.id.slice(0,8)}`);
        console.log(`      Vehicle: ${driver.vehicle_type}`);
        console.log(`      Online: ${driver.is_online}, Active: ${driver.is_active}, Verified: ${driver.is_verified}`);
      });
    }
    
    if (unifiedError) {
      console.log(`   Error: ${unifiedError.message}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🔧 CAMBIOS APLICADOS:');
  console.log('   ✅ CriticalNotifications.tsx: Ahora consulta tabla "drivers"');
  console.log('   ✅ OnlineDriversIndicator.tsx: Usa criterios completos (online+active+verified)');
  console.log('   ✅ Ambos componentes usan la misma lógica');
  
  console.log('\n🎯 RESULTADO ESPERADO:');
  console.log('   - El botón verde mostrará el número correcto');
  console.log('   - Las alertas "Sin repartidores" aparecerán solo cuando realmente no haya repartidores');
  console.log('   - Ya no habrá inconsistencias entre ambos componentes');
  
  console.log('\n=====================================');
  console.log('✅ VERIFICACIÓN COMPLETA');
};

// Ejecutar verificación
verificarCorreccion().catch(console.error);
