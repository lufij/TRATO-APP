// 🔍 SCRIPT DE VERIFICACIÓN COMPLETA
// Ejecutar en la consola del navegador para diagnosticar todos los problemas

console.log('🔍 === DIAGNÓSTICO COMPLETO DEL SISTEMA ===');

// 1. Verificar variables de entorno
console.log('\n🔧 VARIABLES DE ENTORNO:');
console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'NO DEFINIDA');
console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NO DEFINIDA');

// 2. Verificar configuración de Supabase
console.log('\n📡 CONFIGURACIÓN SUPABASE:');
if (typeof supabase !== 'undefined') {
  console.log('✅ Cliente Supabase disponible');
  console.log('- URL en uso:', supabase.supabaseUrl);
  console.log('- Key en uso:', supabase.supabaseKey ? 'PRESENTE' : 'AUSENTE');
} else {
  console.log('❌ Cliente Supabase NO disponible');
}

// 3. Test de conectividad
console.log('\n🔗 PROBANDO CONECTIVIDAD...');

// Test drivers
if (typeof supabase !== 'undefined') {
  supabase.from('drivers').select('id, is_online, is_active').limit(3)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Error consultando drivers:', error.message);
        console.log('   Detalles:', error);
      } else {
        console.log('✅ Drivers consultados exitosamente:', data?.length || 0);
        data?.forEach((driver, i) => {
          console.log(`   ${i+1}. Online: ${driver.is_online}, Active: ${driver.is_active}`);
        });
      }
    });

  // Test count online drivers
  setTimeout(() => {
    supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('is_online', true)
      .then(({ count, error }) => {
        if (error) {
          console.log('❌ Error contando drivers online:', error.message);
        } else {
          console.log('✅ Drivers online encontrados:', count);
        }
      });
  }, 1000);

  // Test users table
  setTimeout(() => {
    supabase.from('users').select('id, role', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) {
          console.log('❌ Error consultando users:', error.message);
        } else {
          console.log('✅ Usuarios en sistema:', count);
        }
      });
  }, 1500);
}

// 4. Verificar permisos de notificación
console.log('\n🔔 PERMISOS DE NOTIFICACIÓN:');
if ('Notification' in window) {
  console.log('- Estado actual:', Notification.permission);
  console.log('- Soporte disponible: ✅');
  
  switch (Notification.permission) {
    case 'granted':
      console.log('✅ PERMISOS CONCEDIDOS - Notificaciones funcionarán');
      break;
    case 'denied':
      console.log('❌ PERMISOS BLOQUEADOS - Necesita reactivar manualmente');
      break;
    case 'default':
      console.log('⚠️ PERMISOS PENDIENTES - Clic en "Activar Notificaciones"');
      break;
  }
} else {
  console.log('❌ Notificaciones NO soportadas en este navegador');
}

// 5. Verificar contexto de audio
console.log('\n🔊 CAPACIDADES DE AUDIO:');
console.log('- Web Audio API:', 'AudioContext' in window || 'webkitAudioContext' in window ? '✅' : '❌');
console.log('- Vibración:', 'vibrate' in navigator ? '✅' : '❌');

// 6. Test de componentes React
console.log('\n⚛️ COMPONENTES REACT:');
console.log('- CriticalNotifications montado:', document.querySelector('[data-component="critical-notifications"]') ? '✅' : '❓');
console.log('- Event listeners activos:', typeof window.addEventListener === 'function' ? '✅' : '❌');

// 7. Test de red
console.log('\n🌐 CONECTIVIDAD:');
console.log('- Online:', navigator.onLine ? '✅' : '❌');
console.log('- Protocolo:', window.location.protocol);
console.log('- Host:', window.location.host);

// 8. Funciones de test disponibles
console.log('\n🧪 FUNCIONES DE PRUEBA DISPONIBLES:');
console.log('Ejecuta estas funciones para probar:');

// Función para probar notificación
window.testNotificationFlow = function() {
  console.log('🧪 Probando flujo completo de notificación...');
  
  // Simular evento crítico
  const event = new CustomEvent('criticalNotification', {
    detail: {
      type: 'new_order',
      message: 'PRUEBA: Nuevo pedido #12345 por $25.000',
      data: {
        orderId: 'test-12345',
        amount: 25000,
        buyer: 'Cliente de Prueba'
      }
    }
  });
  
  window.dispatchEvent(event);
  console.log('✅ Evento enviado - Deberías escuchar sonido y ver notificación');
};

// Función para solicitar permisos
window.requestNotificationPermission = function() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      console.log('🔔 Permisos actualizados a:', permission);
      if (permission === 'granted') {
        new Notification('¡Permisos Activados!', {
          body: 'Las notificaciones ahora funcionarán correctamente'
        });
      }
    });
  }
};

// Función para probar drivers directamente
window.testDriversQuery = function() {
  if (typeof supabase !== 'undefined') {
    console.log('🔍 Probando consulta directa de drivers...');
    supabase.from('drivers').select('*')
      .then(({ data, error }) => {
        if (error) {
          console.log('❌ Error:', error);
        } else {
          console.log('✅ Drivers encontrados:', data);
        }
      });
  }
};

console.log('\n🎯 COMANDOS DISPONIBLES:');
console.log('- testNotificationFlow() - Probar notificación completa');
console.log('- requestNotificationPermission() - Solicitar permisos');
console.log('- testDriversQuery() - Probar consulta de drivers');

console.log('\n📋 RESUMEN:');
console.log('Si ves errores 400, el problema probablemente es:');
console.log('1. Variables de entorno no cargadas correctamente');
console.log('2. Configuración RLS de Supabase');
console.log('3. Problemas de autenticación');
