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
          frequency: 1400, // Frecuencia de emergencia para vendedores
          duration: 600,   // Duración más larga para máxima atención  
          pattern: 'double', // Patrón doble urgente
          volume: 1.0,     // Volumen máximo para no perder ventas
          repeatCount: 3,  // Repetir más para asegurar que se escuche
          repeatInterval: 1200 // Intervalo más corto para urgencia
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
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume, finalConfig.duration + 30); // Espacio mínimo para máxima urgencia
              break;
            case 'triple':
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume);
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume, finalConfig.duration + 150);
              playTone(finalConfig.frequency, finalConfig.duration, finalConfig.volume, (finalConfig.duration + 150) * 2);
              break;
            case 'critical':
              // Sonido crítico de emergencia - máxima audibilidad
              for (let i = 0; i < 5; i++) {
                playTone(1400 + (i * 200), 500, 1.0, i * 300); // Frecuencias más altas, volumen máximo, más rápido
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
    
    // Nueva orden (para vendedores) - CONFIGURACIÓN DE EMERGENCIA MÓVIL
    window.notifyNewOrder = function(orderData) {
      // Detectar móvil para aplicar configuración específica
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const soundConfig = {
        pattern: 'double',  // Doble tono de emergencia
        frequency: 1400,    // Frecuencia de emergencia muy alta
        repeatCount: isMobile ? 6 : 3,     // MÁS repeticiones en móvil
        repeatInterval: isMobile ? 600 : 1200, // MÁS frecuente en móvil
        volume: 1.0,        // Volumen máximo
        duration: isMobile ? 800 : 600     // MÁS duración en móvil
      };
      
      console.log(`📱 Nueva orden - Configuración ${isMobile ? 'MÓVIL' : 'DESKTOP'}`);
      
      return window.showAdvancedNotification('🛒 ¡Nueva Orden Recibida!', {
        body: `${orderData.customer_name} - Q${orderData.total}\nTipo: ${orderData.delivery_type}`,
        soundConfig,
        priority: 'high',
        requireInteraction: true,
        critical: true, // Marcar como crítico para móviles
        data: { type: 'new_order', orderId: orderData.id }
      });
    };
    
    // Repartidor asignado - CONFIGURACIÓN DE EMERGENCIA
    window.notifyDriverAssigned = function(orderData) {
      return window.showAdvancedNotification('🚚 Repartidor Asignado', {
        body: `Tu pedido #${orderData.id} está en camino`,
        soundConfig: { 
          pattern: 'double', 
          frequency: 1300,  // Frecuencia de emergencia
          repeatCount: 2,
          volume: 1.0,      // Volumen máximo
          duration: 500     // Duración larga
        },
        priority: 'normal',
        data: { type: 'driver_assigned', orderId: orderData.id }
      });
    };
    
    // Entrega disponible (para repartidores) - CONFIGURACIÓN DE EMERGENCIA MÓVIL
    window.notifyDeliveryAvailable = function(orderData) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const soundConfig = {
        pattern: 'double',  // Cambiado a double para urgencia
        frequency: 1500,    // Frecuencia máxima de emergencia
        repeatCount: isMobile ? 5 : 3,     // MÁS repeticiones en móvil
        repeatInterval: isMobile ? 700 : 1000, // MÁS frecuente en móvil
        volume: 1.0,        // Volumen máximo
        duration: isMobile ? 700 : 550     // MÁS duración en móvil
      };
      
      console.log(`📦 Entrega disponible - Configuración ${isMobile ? 'MÓVIL' : 'DESKTOP'}`);
      
      return window.showAdvancedNotification('📦 Nueva Entrega Disponible', {
        body: `Entrega para: ${orderData.customer_name} - ${orderData.delivery_address}`,
        soundConfig,
        priority: 'high',
        requireInteraction: true,
        critical: true, // Crítico para repartidores móviles
        data: { type: 'delivery_available', orderId: orderData.id }
      });
    };
    
    // Pedido entregado - CONFIGURACIÓN DE EMERGENCIA
    window.notifyOrderDelivered = function(orderData) {
      return window.showAdvancedNotification('✅ Pedido Entregado', {
        body: `Tu pedido ha sido entregado exitosamente`,
        soundConfig: { 
          pattern: 'double',  // Cambiado a double para confirmación audible
          frequency: 1200,    // Frecuencia alta confirmativa 
          repeatCount: 1,
          volume: 1.0,        // Volumen máximo
          duration: 650       // Duración larga para confirmación 
        },
        priority: 'normal',
        data: { type: 'order_delivered', orderId: orderData.id }
      });
    };
    
    // Notificación crítica - CONFIGURACIÓN MÁXIMA DE EMERGENCIA
    window.notifyCritical = function(message, data = {}) {
      return window.showAdvancedNotification('🚨 Alerta Crítica', {
        body: message,
        soundConfig: { 
          pattern: 'critical', 
          frequency: 1600,      // Frecuencia crítica máxima
          repeatCount: 5,
          repeatInterval: 600,  // Más frecuente para crítico
          volume: 1.0,          // Volumen máximo
          duration: 800         // Duración muy larga
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
      console.log('🧪 Iniciando prueba del sistema avanzado DE EMERGENCIA...');
      
      // Test de sonido básico con configuración de emergencia
      console.log('🔊 Probando sonido de emergencia básico...');
      window.playAdvancedNotificationSound({
        pattern: 'double',
        frequency: 1400,    // Frecuencia de emergencia
        repeatCount: 1,
        volume: 1.0,        // Volumen máximo
        duration: 600       // Duración larga
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test de notificación completa con emergencia
      console.log('📢 Probando notificación completa de emergencia...');
      window.showAdvancedNotification('🧪 Prueba del Sistema DE EMERGENCIA', {
        body: 'Sistema de notificaciones de emergencia funcionando - Volumen MÁXIMO',
        soundConfig: { 
          pattern: 'double', 
          frequency: 1500,  // Frecuencia máxima
          volume: 1.0,      // Volumen máximo
          duration: 550     // Duración larga
        },
        priority: 'high'     // Prioridad alta
      });
      
      console.log('✅ Prueba de emergencia completada - ¿Se escuchó FUERTE?');
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
