// 🔔 ACTIVADOR DE NOTIFICACIONES - SOLUCIÓN COMPLETA
// Ejecutar en la consola del navegador del dashboard de vendedor

console.log('🔔 === ACTIVADOR DE NOTIFICACIONES COMPLETO ===');

async function activateNotifications() {
  console.log('🚀 Iniciando activación de notificaciones...');
  
  // Paso 1: Verificar soporte
  if (!('Notification' in window)) {
    console.log('❌ Este navegador no soporta notificaciones');
    return false;
  }
  
  // Paso 2: Verificar estado actual
  console.log('📋 Estado actual:', Notification.permission);
  
  // Paso 3: Solicitar permisos si es necesario
  if (Notification.permission === 'default') {
    console.log('📝 Solicitando permisos...');
    try {
      const permission = await Notification.requestPermission();
      console.log('✅ Permisos actualizados a:', permission);
      
      if (permission !== 'granted') {
        console.log('❌ Permisos no concedidos. Instrucciones:');
        console.log('1. Busca el ícono de candado en la barra de direcciones');
        console.log('2. Clic en Notificaciones → Permitir');
        console.log('3. Recarga la página');
        return false;
      }
    } catch (error) {
      console.log('❌ Error solicitando permisos:', error.message);
      return false;
    }
  }
  
  if (Notification.permission === 'denied') {
    console.log('🚫 Notificaciones bloqueadas. Para activar:');
    console.log('Chrome: Candado URL → Notificaciones → Permitir → Recargar');
    console.log('Firefox: Escudo URL → Permisos → Notificaciones → Permitir → Recargar');
    return false;
  }
  
  // Paso 4: Test de notificación
  if (Notification.permission === 'granted') {
    console.log('✅ Permisos concedidos. Probando notificación...');
    
    const testNotification = new Notification('🎉 ¡Notificaciones Activas!', {
      body: 'Ahora recibirás alertas de nuevos pedidos',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'activation-test'
    });
    
    testNotification.onclick = () => {
      console.log('👆 Notificación clickeada');
      testNotification.close();
    };
    
    setTimeout(() => testNotification.close(), 5000);
  }
  
  // Paso 5: Activar sistema de sonido
  console.log('🔊 Configurando sistema de sonido...');
  
  window.playNotificationSound = function() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      
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
      
      // Secuencia de alerta: tres tonos ascendentes
      playTone(800, 0.2, 0);
      playTone(1000, 0.2, 300);
      playTone(1200, 0.3, 600);
      
      console.log('🔊 Sonido de prueba reproducido');
      
      // Vibración si está disponible
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]);
        console.log('📳 Vibración activada');
      }
      
    } catch (error) {
      console.log('❌ Error reproduciendo sonido:', error.message);
    }
  };
  
  // Paso 6: Test de sonido inmediato
  console.log('🧪 Probando sonido...');
  window.playNotificationSound();
  
  // Paso 7: Configurar listener de eventos críticos
  console.log('👂 Configurando listener de eventos...');
  
  function handleCriticalNotification(event) {
    const { type, message, data } = event.detail;
    console.log('🔥 Notificación crítica recibida:', type, message);
    
    // Sonido inmediato
    if (window.playNotificationSound) {
      window.playNotificationSound();
    }
    
    // Notificación del navegador
    if (Notification.permission === 'granted') {
      const notification = new Notification('🔥 ¡Nuevo Pedido!', {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'new-order'
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      setTimeout(() => notification.close(), 10000);
    }
  }
  
  // Remover listener anterior si existe
  window.removeEventListener('criticalNotification', window.currentCriticalListener);
  
  // Agregar nuevo listener
  window.addEventListener('criticalNotification', handleCriticalNotification);
  window.currentCriticalListener = handleCriticalNotification;
  
  console.log('✅ Listener de eventos configurado');
  
  // Paso 8: Función de test completo
  window.testCompleteNotification = function() {
    console.log('🧪 Probando notificación completa...');
    
    const event = new CustomEvent('criticalNotification', {
      detail: {
        type: 'new_order',
        message: 'Pedido de prueba #TEST-789 por $30.000',
        data: {
          orderId: 'test-789',
          amount: 30000,
          buyer: 'Cliente de Prueba',
          timestamp: new Date().toISOString()
        }
      }
    });
    
    window.dispatchEvent(event);
    console.log('✅ Evento de prueba enviado');
  };
  
  console.log('🎯 === ACTIVACIÓN COMPLETA ===');
  console.log('✅ Notificaciones del navegador: ACTIVAS');
  console.log('✅ Sistema de sonido: CONFIGURADO');
  console.log('✅ Listener de eventos: ACTIVO');
  console.log('✅ Vibración: ' + ('vibrate' in navigator ? 'DISPONIBLE' : 'NO DISPONIBLE'));
  
  console.log('\\n🧪 COMANDOS DE PRUEBA:');
  console.log('- playNotificationSound() - Probar solo sonido');
  console.log('- testCompleteNotification() - Probar notificación completa');
  
  return true;
}

// Ejecutar activación automáticamente
activateNotifications().then(success => {
  if (success) {
    console.log('\\n🎉 ¡SISTEMA DE NOTIFICACIONES COMPLETAMENTE ACTIVO!');
    console.log('Ahora recibirás alertas inmediatas de nuevos pedidos.');
  } else {
    console.log('\\n⚠️ Revisa los pasos indicados para activar manualmente.');
  }
});
