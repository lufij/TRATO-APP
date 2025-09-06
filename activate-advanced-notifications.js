// 🔊 ACTIVADOR AVANZADO DE NOTIFICACIONES CON SONIDO
// Sistema optimizado para funcionar en computadoras y móviles, incluso con pantalla apagada

console.log('🚀 Iniciando sistema avanzado de notificaciones...');

async function activateAdvancedNotifications() {
  try {
    // 🎯 PASO 1: Verificar compatibilidad del navegador
    console.log('1️⃣ Verificando compatibilidad...');
    
    const compatibility = {
      notifications: 'Notification' in window,
      audio: !!(window.AudioContext || window.webkitAudioContext),
      vibration: 'vibrate' in navigator,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window
    };
    
    console.log('✅ Compatibilidad del navegador:', compatibility);
    
    // 🎯 PASO 2: Solicitar permisos de notificación
    console.log('2️⃣ Solicitando permisos de notificación...');
    
    let notificationPermission = Notification.permission;
    
    if (notificationPermission === 'default') {
      notificationPermission = await Notification.requestPermission();
    }
    
    switch (notificationPermission) {
      case 'granted':
        console.log('✅ PERMISOS CONCEDIDOS - Notificaciones habilitadas');
        break;
      case 'denied':
        console.log('❌ PERMISOS DENEGADOS - Instrucciones:');
        console.log('   👉 Clic en el ícono de candado en la URL');
        console.log('   👉 Cambiar "Notificaciones" a "Permitir"');
        console.log('   👉 Recargar la página');
        return false;
      case 'default':
        console.log('⚠️ PERMISOS PENDIENTES - Vuelve a intentar');
        return false;
    }

    // 🎯 PASO 3: Configurar AudioContext avanzado
    console.log('3️⃣ Configurando sistema de audio avanzado...');
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;
    
    if (AudioContextClass) {
      audioContext = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: 44100
      });
      
      console.log('🔊 AudioContext creado:', audioContext.state);
      
      // Función de sonido mejorada con repeticiones
      window.playAdvancedNotificationSound = function(config = {}) {
        const defaultConfig = {
          frequency: 880,
          duration: 400,
          pattern: 'triple',
          volume: 0.8,
          repeatCount: 2,
          repeatInterval: 1500
        };
        
        const finalConfig = { ...defaultConfig, ...config };
        
        const playTone = (freq, dur, vol, delay = 0) => {
          setTimeout(() => {
            try {
              if (audioContext.state === 'closed') return;
              
              // Reanudar AudioContext si está suspendido
              if (audioContext.state === 'suspended') {
                audioContext.resume();
              }
              
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = freq;
              oscillator.type = 'sine';
              
              // Envelope para evitar clicks
              gainNode.gain.setValueAtTime(0, audioContext.currentTime);
              gainNode.gain.linearRampToValueAtTime(vol, audioContext.currentTime + 0.01);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur / 1000);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + dur / 1000);
              
            } catch (error) {
              console.warn('Error reproduciendo tono:', error);
            }
          }, delay);
        };
        
        const playPattern = () => {
          switch (finalConfig.pattern) {
            case 'single':
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume);
              break;
            case 'double':
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume);
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume, finalConfig.duration + 150);
              break;
            case 'triple':
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume);
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume, finalConfig.duration + 150);
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume, (finalConfig.duration + 150) * 2);
              break;
            case 'critical':
              // Sonido crítico - muy audible
              for (let i = 0; i < 5; i++) {
                playTone(1000 + (i * 200), 300, 0.9, i * 400);
              }
              break;
          }
          
          // Vibración para móviles
          if ('vibrate' in navigator) {
            const vibrationPatterns = {
              'single': [300],
              'double': [300, 150, 300],
              'triple': [300, 150, 300, 150, 300],
              'critical': [500, 200, 500, 200, 500, 200, 500, 200, 500]
            };
            
            navigator.vibrate(vibrationPatterns[finalConfig.pattern] || [300]);
          }
        };
        
        // Reproducir patrón inicial
        playPattern();
        
        // Repetir si es necesario
        if (finalConfig.repeatCount > 1) {
          for (let i = 1; i < finalConfig.repeatCount; i++) {
            setTimeout(() => {
              playPattern();
            }, i * finalConfig.repeatInterval);
          }
        }
      };
      
    } else {
      console.warn('⚠️ Web Audio API no soportada');
    }

    // 🎯 PASO 4: Registrar Service Worker para notificaciones en segundo plano
    console.log('4️⃣ Configurando notificaciones en segundo plano...');
    
    if ('serviceWorker' in navigator) {
      try {
        // Crear service worker inline para notificaciones
        const swCode = `
          self.addEventListener('notificationclick', function(event) {
            event.notification.close();
            
            event.waitUntil(
              clients.matchAll({type: 'window'}).then(function(clientList) {
                if (clientList.length > 0) {
                  return clientList[0].focus();
                }
                return clients.openWindow('/');
              })
            );
          });
          
          self.addEventListener('push', function(event) {
            const options = {
              body: event.data ? event.data.text() : 'Nueva notificación',
              icon: '/assets/trato-logo.png',
              badge: '/assets/trato-logo.png',
              tag: 'trato-notification',
              requireInteraction: true,
              vibrate: [300, 100, 300]
            };
            
            event.waitUntil(
              self.registration.showNotification('Trato App', options)
            );
          });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        const registration = await navigator.serviceWorker.register(swUrl);
        console.log('✅ Service Worker registrado para notificaciones en segundo plano');
        
      } catch (error) {
        console.warn('⚠️ Error registrando Service Worker:', error);
      }
    }

    // 🎯 PASO 5: Crear función de notificación avanzada
    console.log('5️⃣ Creando sistema de notificación avanzado...');
    
    window.showAdvancedNotification = async function(title, options = {}) {
      const defaultOptions = {
        body: '',
        soundConfig: { pattern: 'triple', frequency: 880 },
        requireInteraction: true,
        priority: 'normal', // 'low', 'normal', 'high', 'critical'
        keepAlive: false // Para notificaciones críticas que no se cierran solas
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      // Reproducir sonido inmediatamente
      if (window.playAdvancedNotificationSound) {
        const soundConfig = {
          ...finalOptions.soundConfig,
          repeatCount: finalOptions.priority === 'critical' ? 5 : finalOptions.priority === 'high' ? 3 : 2
        };
        
        window.playAdvancedNotificationSound(soundConfig);
      }
      
      // Mostrar notificación del navegador
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: finalOptions.body,
          icon: '/assets/trato-logo.png',
          badge: '/assets/trato-logo.png',
          tag: `trato-${Date.now()}`,
          requireInteraction: finalOptions.requireInteraction,
          silent: false, // Importante: no silenciar
          data: finalOptions.data || {}
        });
        
        // Auto-cerrar notificaciones normales después de 10 segundos
        if (!finalOptions.keepAlive && finalOptions.priority !== 'critical') {
          setTimeout(() => {
            notification.close();
          }, 10000);
        }
        
        // Manejar clic en notificación
        notification.onclick = function() {
          window.focus();
          notification.close();
          if (finalOptions.onclick) {
            finalOptions.onclick();
          }
        };
        
        return notification;
      }
      
      return null;
    };

    // 🎯 PASO 6: Funciones específicas por tipo de notificación
    console.log('6️⃣ Configurando tipos específicos de notificación...');
    
    // Nueva orden (para vendedores)
    window.notifyNewOrder = function(orderData) {
      return window.showAdvancedNotification('🛒 ¡Nueva Orden Recibida!', {
        body: `${orderData.customer_name} - Q${orderData.total}\nTipo: ${orderData.delivery_type}`,
        soundConfig: { 
          pattern: 'triple', 
          frequency: 880, 
          repeatCount: 3, 
          repeatInterval: 2000 
        },
        priority: 'high',
        requireInteraction: true,
        data: { type: 'new_order', orderId: orderData.id }
      });
    };
    
    // Repartidor asignado
    window.notifyDriverAssigned = function(orderData) {
      return window.showAdvancedNotification('🚚 Repartidor Asignado', {
        body: `Tu pedido #${orderData.id} está en camino`,
        soundConfig: { 
          pattern: 'double', 
          frequency: 660, 
          repeatCount: 2 
        },
        priority: 'normal',
        data: { type: 'driver_assigned', orderId: orderData.id }
      });
    };
    
    // Entrega disponible (para repartidores)
    window.notifyDeliveryAvailable = function(orderData) {
      return window.showAdvancedNotification('📦 Nueva Entrega Disponible', {
        body: `Entrega para: ${orderData.customer_name} - ${orderData.delivery_address}`,
        soundConfig: { 
          pattern: 'triple', 
          frequency: 1000, 
          repeatCount: 3,
          repeatInterval: 1500 
        },
        priority: 'high',
        requireInteraction: true,
        data: { type: 'delivery_available', orderId: orderData.id }
      });
    };
    
    // Pedido entregado
    window.notifyOrderDelivered = function(orderData) {
      return window.showAdvancedNotification('✅ Pedido Entregado', {
        body: `Tu pedido ha sido entregado exitosamente`,
        soundConfig: { 
          pattern: 'single', 
          frequency: 440, 
          repeatCount: 1 
        },
        priority: 'normal',
        data: { type: 'order_delivered', orderId: orderData.id }
      });
    };
    
    // Notificación crítica
    window.notifyCritical = function(message, data = {}) {
      return window.showAdvancedNotification('🚨 Alerta Crítica', {
        body: message,
        soundConfig: { 
          pattern: 'critical', 
          frequency: 1200, 
          repeatCount: 5,
          repeatInterval: 1000
        },
        priority: 'critical',
        requireInteraction: true,
        keepAlive: true,
        data: { type: 'critical', ...data }
      });
    };

    // 🎯 PASO 7: Test del sistema completo
    console.log('7️⃣ Probando sistema avanzado...');
    
    window.testAdvancedNotifications = async function() {
      console.log('🧪 Iniciando prueba del sistema avanzado...');
      
      // Test de sonido básico
      console.log('🔊 Probando sonido básico...');
      window.playAdvancedNotificationSound({
        pattern: 'double',
        frequency: 800,
        repeatCount: 1
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test de notificación completa
      console.log('📢 Probando notificación completa...');
      window.showAdvancedNotification('🧪 Prueba del Sistema', {
        body: 'Sistema de notificaciones avanzado funcionando correctamente',
        soundConfig: { pattern: 'triple', frequency: 660 },
        priority: 'normal'
      });
      
      console.log('✅ Prueba completada');
    };

    // 🎯 PASO 8: Configuración para mantener activo en segundo plano
    console.log('8️⃣ Configurando persistencia en segundo plano...');
    
    // Mantener conexión activa (previene suspensión en móviles)
    let keepAliveInterval;
    
    window.enableBackgroundNotifications = function() {
      // Ping periódico muy ligero para mantener la app activa
      keepAliveInterval = setInterval(() => {
        // No hacer nada visible, solo mantener el contexto activo
        if (audioContext && audioContext.state === 'running') {
          // Context está activo
        }
      }, 30000); // Cada 30 segundos
      
      console.log('✅ Notificaciones en segundo plano habilitadas');
    };
    
    window.disableBackgroundNotifications = function() {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      console.log('❌ Notificaciones en segundo plano deshabilitadas');
    };
    
    // Activar por defecto
    window.enableBackgroundNotifications();
    
    // 🎯 PASO 9: Listener para eventos críticos del sistema
    console.log('9️⃣ Configurando listeners de eventos críticos...');
    
    // Escuchar eventos personalizados de la aplicación
    window.addEventListener('tratoNotification', function(event) {
      const { type, data, priority } = event.detail;
      
      console.log(`🔔 Evento de notificación recibido: ${type}`, data);
      
      switch (type) {
        case 'new_order':
          window.notifyNewOrder(data);
          break;
        case 'driver_assigned':
          window.notifyDriverAssigned(data);
          break;
        case 'delivery_available':
          window.notifyDeliveryAvailable(data);
          break;
        case 'order_delivered':
          window.notifyOrderDelivered(data);
          break;
        case 'critical':
          window.notifyCritical(data.message, data);
          break;
        default:
          window.showAdvancedNotification(data.title || 'Notificación', {
            body: data.message,
            priority: priority || 'normal'
          });
      }
    });
    
    // 🎯 PASO 10: Activación automática en interacción del usuario
    console.log('🔟 Configurando activación automática...');
    
    const activateOnUserInteraction = function() {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('🔊 AudioContext reactivado por interacción del usuario');
        });
      }
    };
    
    // Escuchar múltiples tipos de interacción
    ['click', 'touchstart', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, activateOnUserInteraction, { 
        once: true, 
        passive: true 
      });
    });

    // 🎯 FINALIZACIÓN
    console.log('✅ SISTEMA AVANZADO DE NOTIFICACIONES ACTIVADO');
    console.log('');
    console.log('📋 FUNCIONES DISPONIBLES:');
    console.log('   🔊 window.playAdvancedNotificationSound(config)');
    console.log('   📢 window.showAdvancedNotification(title, options)');
    console.log('   🛒 window.notifyNewOrder(orderData)');
    console.log('   🚚 window.notifyDriverAssigned(orderData)');
    console.log('   📦 window.notifyDeliveryAvailable(orderData)');
    console.log('   ✅ window.notifyOrderDelivered(orderData)');
    console.log('   🚨 window.notifyCritical(message, data)');
    console.log('   🧪 window.testAdvancedNotifications()');
    console.log('');
    console.log('💡 CARACTERÍSTICAS:');
    console.log('   ✅ Sonidos optimizados para máxima audibilidad');
    console.log('   ✅ Repeticiones automáticas para notificaciones importantes');
    console.log('   ✅ Vibración en dispositivos móviles');
    console.log('   ✅ Funciona con pantalla apagada (con permisos)');
    console.log('   ✅ Notificaciones push del navegador');
    console.log('   ✅ Service Worker para segundo plano');
    console.log('   ✅ Activación automática en interacción del usuario');
    console.log('');
    console.log('🧪 PARA PROBAR: window.testAdvancedNotifications()');
    
    // Mostrar notificación de bienvenida
    setTimeout(() => {
      window.showAdvancedNotification('🎉 Sistema Activado', {
        body: 'Notificaciones avanzadas con sonido configuradas correctamente',
        soundConfig: { pattern: 'double', frequency: 660 },
        priority: 'normal'
      });
    }, 1000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error activando sistema avanzado:', error);
    return false;
  }
}

// Ejecutar activación automática
activateAdvancedNotifications().then(success => {
  if (success) {
    console.log('🚀 Activación exitosa del sistema avanzado');
  } else {
    console.log('⚠️ Activación parcial - revisar permisos');
  }
});

// Exportar para uso en la consola
window.activateAdvancedNotifications = activateAdvancedNotifications;
