// 🔍 DIAGNÓSTICO DE PERMISOS DE NOTIFICACIÓN
// Ejecutar en la consola del navegador para verificar estado completo

console.log('🔍 === DIAGNÓSTICO DE PERMISOS DE NOTIFICACIÓN ===');

// 1. Verificar soporte del navegador
console.log('\n📱 SOPORTE DEL NAVEGADOR:');
console.log('- Notificaciones disponibles:', 'Notification' in window);
console.log('- Web Audio API:', 'AudioContext' in window || 'webkitAudioContext' in window);
console.log('- API de Vibración:', 'vibrate' in navigator);
console.log('- Service Workers:', 'serviceWorker' in navigator);

// 2. Estado actual de permisos
if ('Notification' in window) {
  console.log('\n🔔 ESTADO DE PERMISOS:');
  console.log('- Permiso actual:', Notification.permission);
  
  switch (Notification.permission) {
    case 'granted':
      console.log('✅ PERMISOS CONCEDIDOS - Las notificaciones funcionarán');
      break;
    case 'denied':
      console.log('❌ PERMISOS BLOQUEADOS - Necesita reactivar manualmente');
      console.log('   👉 Solución: Clic en candado URL → Notificaciones → Permitir → Recargar');
      break;
    case 'default':
      console.log('⚠️ PERMISOS PENDIENTES - Necesita solicitar permisos');
      console.log('   👉 Solución: Clic en "Activar Notificaciones" en la app');
      break;
  }
} else {
  console.log('\n❌ NOTIFICACIONES NO SOPORTADAS en este navegador');
}

// 3. Verificar contexto de audio
console.log('\n🔊 ESTADO DE AUDIO:');
try {
  if ('AudioContext' in window || 'webkitAudioContext' in window) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    console.log('✅ Web Audio API disponible');
    console.log('- Clase AudioContext:', AudioContextClass.name);
  } else {
    console.log('❌ Web Audio API no disponible');
  }
} catch (error) {
  console.log('❌ Error verificando Audio Context:', error.message);
}

// 4. Verificar vibración
console.log('\n📳 VIBRACIÓN:');
if ('vibrate' in navigator) {
  console.log('✅ API de vibración disponible (móvil)');
} else {
  console.log('❌ API de vibración no disponible (probable desktop)');
}

// 5. Verificar listeners de eventos
console.log('\n👂 LISTENERS DE EVENTOS:');
const hasEventListeners = window.addEventListener && typeof window.addEventListener === 'function';
console.log('- addEventListener disponible:', hasEventListeners);

// 6. Información del navegador
console.log('\n🌐 INFORMACIÓN DEL NAVEGADOR:');
console.log('- User Agent:', navigator.userAgent);
console.log('- Plataforma:', navigator.platform);
console.log('- Online:', navigator.onLine);

// 7. Test de notificación (solo si hay permisos)
if ('Notification' in window && Notification.permission === 'granted') {
  console.log('\n🧪 EJECUTANDO TEST DE NOTIFICACIÓN...');
  try {
    const testNotification = new Notification('🧪 Test de Notificación', {
      body: 'Si ves esta notificación, el sistema está funcionando correctamente',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'diagnostic-test'
    });
    
    testNotification.onclick = () => {
      console.log('✅ Notificación clickeada - Interacción funcionando');
      testNotification.close();
    };
    
    setTimeout(() => {
      testNotification.close();
    }, 5000);
    
    console.log('✅ Notificación de prueba enviada');
  } catch (error) {
    console.log('❌ Error enviando notificación de prueba:', error.message);
  }
}

// 8. Test de sonido (requiere interacción del usuario)
console.log('\n🔊 PARA PROBAR SONIDO:');
console.log('Ejecuta: testNotificationSound()');

window.testNotificationSound = function() {
  console.log('🔊 Probando sonido de notificación...');
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Crear secuencia de tonos como en la app
    const playTone = (frequency, duration, delay = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };
    
    // Secuencia de notificación: tres tonos ascendentes
    playTone(800, 0.2, 0);
    playTone(1000, 0.2, 300);
    playTone(1200, 0.3, 600);
    
    console.log('✅ Sonido de prueba reproducido');
    
    // Test de vibración también
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
      console.log('✅ Vibración de prueba activada');
    }
    
  } catch (error) {
    console.log('❌ Error reproduciendo sonido:', error.message);
  }
};

// 9. Test de evento personalizado
console.log('\n📡 PARA PROBAR EVENTO PERSONALIZADO:');
console.log('Ejecuta: testCriticalNotificationEvent()');

window.testCriticalNotificationEvent = function() {
  console.log('📡 Probando evento crítico...');
  
  const event = new CustomEvent('criticalNotification', {
    detail: {
      type: 'new_order',
      message: 'Pedido de prueba #TEST-12345 por $25.000',
      data: {
        orderId: 'test-12345',
        amount: 25000,
        buyer: 'Cliente de Prueba',
        timestamp: new Date().toISOString()
      }
    }
  });
  
  window.dispatchEvent(event);
  console.log('✅ Evento de prueba enviado');
  console.log('   Si no escuchas sonido o ves notificación, verifica que:');
  console.log('   1. El componente CriticalNotifications esté montado');
  console.log('   2. Los event listeners estén activos');
  console.log('   3. Los permisos estén concedidos');
};

console.log('\n🎯 === RESUMEN ===');
console.log('Para que las notificaciones funcionen completamente necesitas:');
console.log('1. ✅ Permisos de notificación: "granted"');
console.log('2. ✅ Interacción del usuario (para activar audio)');
console.log('3. ✅ Componente CriticalNotifications montado');
console.log('4. ✅ Event listeners activos');
console.log('\n🧪 COMANDOS DE PRUEBA DISPONIBLES:');
console.log('- testNotificationSound() - Probar sonido');
console.log('- testCriticalNotificationEvent() - Probar evento completo');
console.log('\n🔔 Si ves errores, revisa la configuración del navegador y permisos.');
