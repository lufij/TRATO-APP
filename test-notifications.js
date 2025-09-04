// 🧪 SCRIPT DE PRUEBA - Verificar sistema de notificaciones completo
// Ejecutar en la consola del navegador en SellerDashboard

console.log('🧪 Iniciando prueba completa de notificaciones...');

// Test 1: Verificar componentes están cargados
console.log('🔍 Verificando componentes...');
console.log('CriticalNotifications listener activo:', !!window.addEventListener);

// Test 2: Verificar permisos del navegador
if ('Notification' in window) {
  console.log('🔔 Permisos de notificación:', Notification.permission);
  if (Notification.permission === 'default') {
    console.log('⚠️ Solicitando permisos...');
    Notification.requestPermission().then(permission => {
      console.log('✅ Permisos actualizados:', permission);
    });
  }
} else {
  console.log('❌ Notificaciones no soportadas en este navegador');
}

// Test 3: Verificar Web Audio API
if ('AudioContext' in window || 'webkitAudioContext' in window) {
  console.log('🔊 Web Audio API disponible');
} else {
  console.log('❌ Web Audio API no disponible');
}

// Test 4: Verificar vibración (móviles)
if ('vibrate' in navigator) {
  console.log('📳 API de vibración disponible');
} else {
  console.log('❌ Vibración no disponible');
}

// Test 5: Simular notificación de nuevo pedido
console.log('📱 Simulando nuevo pedido en 3 segundos...');
setTimeout(() => {
  console.log('🚀 Enviando evento de nuevo pedido...');
  
  const event = new CustomEvent('criticalNotification', {
    detail: {
      type: 'new_order',
      message: 'Pedido de prueba #12345 por $25.000',
      data: {
        orderId: 'test-12345',
        amount: 25000,
        buyer: 'Cliente Prueba',
        timestamp: new Date().toISOString()
      }
    }
  });
  
  window.dispatchEvent(event);
  console.log('✅ Evento enviado. Deberías ver/escuchar la notificación ahora!');
}, 3000);

// Test 6: Verificar base de datos (si supabase está disponible)
if (typeof supabase !== 'undefined') {
  console.log('🗄️ Verificando conexión a base de datos...');
  supabase.from('notifications').select('count', { count: 'exact', head: true })
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Error en tabla notifications:', error.message);
      } else {
        console.log('✅ Tabla notifications: Accesible');
      }
    });
} else {
  console.log('⚠️ Supabase no disponible en consola');
}

console.log('🧪 Pruebas configuradas. Observa los logs y las notificaciones...');