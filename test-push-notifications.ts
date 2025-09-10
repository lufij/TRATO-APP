// 🧪 SISTEMA DE PRUEBAS COMPLETO - PUSH NOTIFICATIONS
// Solo para desarrollo - NO visible en producción

// Solo cargar en desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Iniciando sistema de pruebas Push Notifications...');
} else {
  console.log('🔔 Sistema de notificaciones cargado (modo producción)');
}

// ✅ FUNCIÓN 1: Probar notificación con app abierta
async function testNotificationWithAppOpen() {
  console.log('🧪 Probando notificación con app ABIERTA...');
  
  try {
    // Buscar el botón de test en PushNotificationSetup
    const testButton = document.querySelector('button[data-test="push-notification"]');
    if (testButton) {
      testButton.click();
      console.log('✅ Test button clicked');
    } else {
      // Crear notificación manualmente
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🧪 Test - App Abierta', {
          body: 'Esta es una notificación de prueba con la app abierta',
          icon: '/favicon.ico',
          requireInteraction: true
        });
        
        // Llamar sonido potente si está disponible
        if (typeof (window as any).playVendorNotificationSound === 'function') {
          (window as any).playVendorNotificationSound();
          console.log('🔊 Sonido potente activado');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en test con app abierta:', error);
  }
}

// 🔔 FUNCIÓN 2: Probar Push Real (requiere backend)
async function testRealPushNotification() {
  console.log('🧪 Probando PUSH REAL (app puede estar cerrada)...');
  
  try {
    // Verificar si hay Service Worker y suscripción
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('✅ Suscripción Push encontrada:', {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          keys: !!subscription.getKey
        });
        
        // En producción, esto se haría desde el servidor
        // Por ahora simulamos el push mensaje
        console.log('💡 Para probar push real, necesitas:');
        console.log('1. Configurar servidor con VAPID keys');
        console.log('2. Enviar push desde servidor usando la suscripción');
        console.log('3. O usar herramienta como web-push para testing');
        
        // Simular mensaje al Service Worker
        if (registration.active) {
          registration.active.postMessage({
            type: 'SIMULATE_PUSH',
            data: {
              title: '🧪 Push Simulado',
              body: 'Esta sería una notificación real con app cerrada',
              type: 'new_order',
              urgent: true
            }
          });
        }
        
      } else {
        console.log('❌ No hay suscripción Push activa');
        console.log('💡 Activa las Push Notifications primero');
      }
    }
  } catch (error) {
    console.error('❌ Error en test push real:', error);
  }
}

// 📱 FUNCIÓN 3: Verificar estado del sistema completo
async function checkSystemStatus() {
  console.log('🔍 Verificando estado del sistema...');
  
  const status = {
    // Básicos
    notificationSupport: 'Notification' in window,
    notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
    serviceWorkerSupport: 'serviceWorker' in navigator,
    pushSupport: 'PushManager' in window,
    
    // Service Worker
    serviceWorkerRegistered: false,
    serviceWorkerActive: false,
    pushSubscribed: false,
    
    // Audio
    audioContextSupport: !!(window.AudioContext || (window as any).webkitAudioContext),
    vibrationSupport: 'vibrate' in navigator,
    wakeLockSupport: 'wakeLock' in navigator,
    
    // Funciones personalizadas
    customSoundFunction: typeof (window as any).playVendorNotificationSound === 'function'
  };
  
  // Verificar Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      status.serviceWorkerRegistered = !!registration;
      status.serviceWorkerActive = !!registration?.active;
      
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        status.pushSubscribed = !!subscription;
      }
    } catch (error) {
      console.error('Error checking SW:', error);
    }
  }
  
  console.table(status);
  
  // Diagnóstico
  console.log('📋 DIAGNÓSTICO:');
  
  if (!status.notificationSupport) {
    console.log('❌ Tu navegador no soporta Notifications API');
  } else if (status.notificationPermission === 'denied') {
    console.log('🚫 Permisos de notificación denegados - ve a configuración del navegador');
  } else if (status.notificationPermission === 'default') {
    console.log('⏳ Permisos de notificación pendientes - activa las notificaciones');
  } else {
    console.log('✅ Permisos de notificación concedidos');
  }
  
  if (!status.serviceWorkerRegistered) {
    console.log('❌ Service Worker no registrado - push notifications no funcionarán con app cerrada');
  } else if (!status.serviceWorkerActive) {
    console.log('⏳ Service Worker registrado pero no activo');
  } else {
    console.log('✅ Service Worker activo');
  }
  
  if (!status.pushSubscribed) {
    console.log('❌ No suscrito a Push Notifications - no recibirás notificaciones con app cerrada');
  } else {
    console.log('✅ Suscrito a Push Notifications');
  }
  
  if (!status.customSoundFunction) {
    console.log('❌ Función de sonido potente no disponible');
  } else {
    console.log('✅ Sistema de sonido potente disponible');
  }
  
  return status;
}

// 🎯 FUNCIÓN PRINCIPAL DE TESTING
async function runCompleteTest() {
  console.log('🚀 EJECUTANDO TEST COMPLETO DE PUSH NOTIFICATIONS');
  console.log('=' .repeat(60));
  
  // 1. Verificar estado del sistema
  await checkSystemStatus();
  
  console.log('');
  console.log('⏳ Esperando 3 segundos...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 2. Test con app abierta
  await testNotificationWithAppOpen();
  
  console.log('');
  console.log('⏳ Esperando 5 segundos...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 3. Test push real
  await testRealPushNotification();
  
  console.log('');
  console.log('✅ Test completo finalizado');
  console.log('💡 Para probar con app cerrada:');
  console.log('   1. Cierra esta pestaña');
  console.log('   2. Usa herramienta web-push para enviar push');
  console.log('   3. O configura backend para enviar push notifications');
}

// 🔧 FUNCIONES DE UTILIDAD PARA TESTING MANUAL (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
  (window as any).testPushNotifications = {
    checkStatus: checkSystemStatus,
    testAppOpen: testNotificationWithAppOpen,
    testRealPush: testRealPushNotification,
    runCompleteTest: runCompleteTest,
    
    // Función para probar sonido directamente
    testSound: () => {
      if (typeof (window as any).playVendorNotificationSound === 'function') {
        (window as any).playVendorNotificationSound();
        console.log('🔊 Sonido de prueba activado');
      } else {
        console.log('❌ Función de sonido no disponible');
      }
    },
    
    // Simular mensaje del Service Worker
    simulateServiceWorkerMessage: () => {
      const event = new MessageEvent('message', {
        data: {
          type: 'PLAY_POWERFUL_NOTIFICATION',
          payload: {
            title: '🧪 Test Service Worker',
            body: 'Simulando mensaje del Service Worker'
          },
          soundType: 'new_order'
        }
      });
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.dispatchEvent(event);
        console.log('📨 Mensaje del Service Worker simulado');
      }
    }
  };

  console.log('🎯 Sistema de pruebas cargado (DESARROLLO). Usa en consola:');
  console.log('- testPushNotifications.checkStatus()');
  console.log('- testPushNotifications.testAppOpen()');
  console.log('- testPushNotifications.testSound()');
  console.log('- testPushNotifications.runCompleteTest()');
}

export default {};
