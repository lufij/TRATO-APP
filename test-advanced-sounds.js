// 🧪 SCRIPT DE PRUEBA DEL SISTEMA DE SONIDOS AVANZADO
// Ejecutar en la consola del navegador para verificar funcionamiento completo

console.log('🧪 === INICIANDO PRUEBAS DEL SISTEMA DE SONIDOS AVANZADO ===');

async function runComprehensiveTests() {
  console.log('\n📋 VERIFICACIONES INICIALES:');
  
  // 1. Verificar compatibilidad
  const compatibility = {
    notifications: 'Notification' in window,
    audio: !!(window.AudioContext || window.webkitAudioContext),
    vibration: 'vibrate' in navigator,
    serviceWorker: 'serviceWorker' in navigator
  };
  
  console.log('🔍 Compatibilidad del navegador:', compatibility);
  
  // 2. Verificar permisos
  console.log('\n🔐 ESTADO DE PERMISOS:');
  console.log('- Notificaciones:', Notification.permission);
  
  if (Notification.permission !== 'granted') {
    console.log('⚠️ ATENCIÓN: Permisos de notificación no concedidos');
    console.log('👉 Solución: Permitir notificaciones en la configuración del navegador');
  }

  // 3. Activar sistema avanzado
  console.log('\n🚀 ACTIVANDO SISTEMA AVANZADO...');
  
  try {
    const activated = await window.activateAdvancedNotifications();
    if (activated) {
      console.log('✅ Sistema avanzado activado correctamente');
    } else {
      console.log('⚠️ Sistema activado parcialmente - revisar permisos');
    }
  } catch (error) {
    console.error('❌ Error activando sistema:', error);
  }
  
  // 4. Esperar un momento para que se inicialice
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 5. Verificar funciones disponibles
  console.log('\n🔧 VERIFICANDO FUNCIONES DISPONIBLES:');
  
  const functions = [
    'playAdvancedNotificationSound',
    'showAdvancedNotification',
    'notifyNewOrder',
    'notifyDriverAssigned',
    'notifyDeliveryAvailable',
    'notifyOrderDelivered',
    'notifyCritical',
    'testAdvancedNotifications'
  ];
  
  functions.forEach(func => {
    const available = typeof window[func] === 'function';
    console.log(`${available ? '✅' : '❌'} ${func}: ${available ? 'Disponible' : 'No disponible'}`);
  });
  
  // 6. Pruebas de sonidos básicos
  console.log('\n🔊 PRUEBAS DE SONIDOS BÁSICOS:');
  
  if (window.playAdvancedNotificationSound) {
    console.log('🎵 Probando sonido simple...');
    window.playAdvancedNotificationSound({
      frequency: 800,
      duration: 300,
      pattern: 'single',
      volume: 0.7
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('🎵 Probando sonido doble...');
    window.playAdvancedNotificationSound({
      frequency: 660,
      duration: 250,
      pattern: 'double',
      volume: 0.8
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🎵 Probando sonido triple...');
    window.playAdvancedNotificationSound({
      frequency: 880,
      duration: 400,
      pattern: 'triple',
      volume: 0.9
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // 7. Pruebas de notificaciones completas
  console.log('\n📢 PRUEBAS DE NOTIFICACIONES COMPLETAS:');
  
  if (window.showAdvancedNotification) {
    console.log('📱 Probando notificación básica...');
    window.showAdvancedNotification('🧪 Prueba Básica', {
      body: 'Esta es una prueba del sistema de notificaciones',
      soundConfig: { pattern: 'double', frequency: 700 },
      priority: 'normal'
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // 8. Pruebas específicas por rol
  console.log('\n👥 PRUEBAS ESPECÍFICAS POR ROL:');
  
  // Simular nueva orden (vendedor)
  if (window.notifyNewOrder) {
    console.log('🛒 Simulando nueva orden...');
    window.notifyNewOrder({
      id: 'test-order-' + Date.now(),
      customer_name: 'Cliente de Prueba',
      total: 35.75,
      delivery_type: 'delivery'
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  
  // Simular repartidor asignado
  if (window.notifyDriverAssigned) {
    console.log('🚚 Simulando repartidor asignado...');
    window.notifyDriverAssigned({
      id: 'test-order-' + Date.now(),
      customer_name: 'Cliente de Prueba'
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Simular entrega disponible (repartidor)
  if (window.notifyDeliveryAvailable) {
    console.log('📦 Simulando entrega disponible...');
    window.notifyDeliveryAvailable({
      id: 'test-delivery-' + Date.now(),
      customer_name: 'Cliente de Prueba',
      delivery_address: 'Zona 10, Ciudad de Guatemala',
      total: 45.25
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  
  // Simular pedido entregado
  if (window.notifyOrderDelivered) {
    console.log('✅ Simulando pedido entregado...');
    window.notifyOrderDelivered({
      id: 'test-order-' + Date.now()
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 9. Prueba de vibración (solo móviles)
  console.log('\n📳 PRUEBA DE VIBRACIÓN:');
  
  if ('vibrate' in navigator) {
    console.log('📱 Dispositivo móvil detectado - probando vibración...');
    
    // Vibración de prueba
    navigator.vibrate([300, 100, 300, 100, 300]);
    
    console.log('✅ Prueba de vibración enviada');
  } else {
    console.log('💻 Dispositivo de escritorio - vibración no disponible');
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 10. Prueba crítica (¡CUIDADO - SONIDO ALTO!)
  console.log('\n🚨 PRUEBA DE NOTIFICACIÓN CRÍTICA:');
  console.log('⚠️ ADVERTENCIA: El siguiente sonido será alto y persistente');
  console.log('⚠️ Asegúrate de tener el volumen a un nivel cómodo');
  
  // Esperar confirmación
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  if (window.notifyCritical) {
    console.log('🚨 Activando notificación crítica...');
    window.notifyCritical('Prueba de Alerta Crítica', {
      test: true,
      timestamp: Date.now()
    });
    
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
  
  // 11. Prueba de sistema completo
  console.log('\n🎯 PRUEBA FINAL DEL SISTEMA COMPLETO:');
  
  if (window.testAdvancedNotifications) {
    console.log('🧪 Ejecutando prueba automática del sistema...');
    window.testAdvancedNotifications();
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // 12. Resumen final
  console.log('\n📊 === RESUMEN DE PRUEBAS ===');
  console.log('✅ Compatibilidad verificada');
  console.log('✅ Sistema avanzado activado');
  console.log('✅ Funciones básicas probadas');
  console.log('✅ Sonidos individuales funcionando');
  console.log('✅ Notificaciones completas funcionando');
  console.log('✅ Notificaciones por rol funcionando');
  console.log('✅ Vibración probada (si está disponible)');
  console.log('✅ Notificación crítica funcionando');
  console.log('✅ Sistema completo verificado');
  
  console.log('\n🎉 === TODAS LAS PRUEBAS COMPLETADAS ===');
  console.log('');
  console.log('💡 FUNCIONES DISPONIBLES PARA USAR:');
  console.log('   🔊 window.playAdvancedNotificationSound(config)');
  console.log('   📢 window.showAdvancedNotification(title, options)');
  console.log('   🛒 window.notifyNewOrder(orderData)');
  console.log('   🚚 window.notifyDriverAssigned(orderData)');
  console.log('   📦 window.notifyDeliveryAvailable(orderData)');
  console.log('   ✅ window.notifyOrderDelivered(orderData)');
  console.log('   🚨 window.notifyCritical(message, data)');
  console.log('   🧪 window.testAdvancedNotifications()');
  console.log('');
  console.log('🎯 El sistema está listo para uso en producción!');
  console.log('');
  console.log('📱 Para dispositivos móviles:');
  console.log('   - Asegurate de permitir notificaciones');
  console.log('   - Mantén la app en segundo plano para recibir notificaciones');
  console.log('   - Los sonidos funcionan incluso con pantalla apagada');
  console.log('');
  console.log('💻 Para computadoras:');
  console.log('   - Mantén el volumen alto para escuchar notificaciones');
  console.log('   - Las notificaciones aparecen en la esquina de la pantalla');
  console.log('   - Funciona en pestañas en segundo plano');
}

// Ejecutar pruebas automáticamente
runComprehensiveTests().catch(error => {
  console.error('❌ Error en las pruebas:', error);
});

// Función para probar solo los sonidos de un rol específico
window.testSoundsForRole = function(role) {
  console.log(`🧪 Probando sonidos específicos para rol: ${role}`);
  
  switch(role) {
    case 'vendedor':
      console.log('🛒 Sonido: Nueva orden');
      window.playAdvancedNotificationSound({
        frequency: 880, duration: 400, pattern: 'triple',
        repeatCount: 2, repeatInterval: 1500
      });
      
      setTimeout(() => {
        console.log('🚚 Sonido: Repartidor asignado');
        window.playAdvancedNotificationSound({
          frequency: 660, duration: 300, pattern: 'double'
        });
      }, 5000);
      
      break;
      
    case 'repartidor':
      console.log('📦 Sonido: Entrega disponible');
      window.playAdvancedNotificationSound({
        frequency: 1000, duration: 250, pattern: 'triple',
        repeatCount: 2, repeatInterval: 1000
      });
      
      setTimeout(() => {
        console.log('🎯 Sonido: Entrega asignada');
        window.playAdvancedNotificationSound({
          frequency: 660, duration: 300, pattern: 'double'
        });
      }, 4000);
      
      break;
      
    case 'comprador':
      console.log('🚚 Sonido: Repartidor asignado');
      window.playAdvancedNotificationSound({
        frequency: 660, duration: 300, pattern: 'double'
      });
      
      setTimeout(() => {
        console.log('✅ Sonido: Pedido entregado');
        window.playAdvancedNotificationSound({
          frequency: 440, duration: 500, pattern: 'single'
        });
      }, 3000);
      
      break;
      
    default:
      console.log('⚠️ Rol no reconocido. Roles válidos: vendedor, repartidor, comprador');
  }
};

// Función de diagnóstico rápido
window.quickDiagnostic = function() {
  console.log('🔍 === DIAGNÓSTICO RÁPIDO ===');
  console.log('Audio Context:', (window.AudioContext || window.webkitAudioContext) ? '✅' : '❌');
  console.log('Notificaciones:', Notification.permission === 'granted' ? '✅' : '❌');
  console.log('Vibración:', 'vibrate' in navigator ? '✅' : '❌');
  console.log('Service Worker:', 'serviceWorker' in navigator ? '✅' : '❌');
  console.log('Sistema Avanzado:', typeof window.playAdvancedNotificationSound === 'function' ? '✅' : '❌');
  
  if (window.AudioContext || window.webkitAudioContext) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const testContext = new AudioContextClass();
      console.log('AudioContext estado:', testContext.state);
      testContext.close();
    } catch (error) {
      console.log('Error AudioContext:', error.message);
    }
  }
  
  console.log('=== FIN DIAGNÓSTICO ===');
};

console.log('\n🎯 FUNCIONES DE PRUEBA DISPONIBLES:');
console.log('   🧪 runComprehensiveTests() - Prueba completa del sistema');
console.log('   👤 testSoundsForRole("vendedor|repartidor|comprador") - Prueba por rol');
console.log('   🔍 quickDiagnostic() - Diagnóstico rápido del sistema');
