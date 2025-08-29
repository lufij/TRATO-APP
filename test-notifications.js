// Test rápido para verificar que las notificaciones funcionen
console.log('🔍 Verificando sistema de notificaciones...');

// Test de estructura de tabla
async function testNotifications() {
  try {
    // Test 1: Verificar que la tabla responda correctamente
    const { data, error } = await supabase
      .from('notifications')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Error en tabla notifications:', error.message);
      return false;
    }

    console.log('✅ Tabla notifications: Accesible');

    // Test 2: Verificar estructura de columnas (intentar una consulta)
    const { data: testData, error: testError } = await supabase
      .from('notifications')
      .select('id, recipient_id, type, title, message, read, created_at')
      .limit(1);

    if (testError) {
      console.log('❌ Error en estructura:', testError.message);
      return false;
    }

    console.log('✅ Estructura notifications: Correcta');
    return true;

  } catch (err) {
    console.log('❌ Error general:', err.message);
    return false;
  }
}

// Ejecutar test
testNotifications().then(success => {
  if (success) {
    console.log('🎉 Sistema de notificaciones: FUNCIONANDO');
  } else {
    console.log('🚨 Sistema de notificaciones: NECESITA ARREGLOS');
  }
});
