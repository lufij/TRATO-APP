import React, { useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

interface EnhancedPushNotificationsProps {
  onNotification?: (type: string, message: string, data?: any) => void;
}

export function EnhancedPushNotifications({ onNotification }: EnhancedPushNotificationsProps) {
  const { user } = useAuth();

  // 🔊 Reproducir sonido crítico usando múltiples métodos
  const playCriticalSound = useCallback(() => {
    // Método 1: Web Audio API (funciona con pantalla encendida)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, delay);
      };
      
      // Secuencia crítica: Triple beep ascendente MUY AUDIBLE
      playTone(880, 0.3, 0);     // La agudo
      playTone(1100, 0.3, 400);  // Más agudo
      playTone(1320, 0.4, 800);  // Muy agudo
      
      // Repetir 3 veces para máxima audibilidad
      setTimeout(() => {
        playTone(880, 0.3, 0);
        playTone(1100, 0.3, 400);
        playTone(1320, 0.4, 800);
      }, 1500);
      
      setTimeout(() => {
        playTone(880, 0.3, 0);
        playTone(1100, 0.3, 400);  
        playTone(1320, 0.4, 800);
      }, 3000);
      
    } catch (error) {
      console.warn('Web Audio API no disponible:', error);
    }

    // Método 2: Vibración en móviles
    if (navigator.vibrate) {
      // Patrón distintivo: largo-corto-largo-corto-largo
      navigator.vibrate([500, 200, 300, 200, 500, 200, 300, 200, 500]);
    }

    // Método 3: Notification API con sonido del sistema
    if ('Notification' in window && Notification.permission === 'granted') {
      // Usar sonido predeterminado del sistema operativo
      const notification = new Notification('🛒 Nueva Orden - TRATO', {
        body: 'Tienes un nuevo pedido esperando confirmación',
        icon: '/assets/trato-logo.png',
        badge: '/assets/trato-logo.png',
        tag: 'critical-order',
        requireInteraction: true,
        silent: false, // IMPORTANTE: permite sonido del sistema
        data: {
          type: 'new_order',
          timestamp: Date.now(),
          sound: 'critical'
        }
      } as any);

      // Mantener notificación activa por más tiempo
      setTimeout(() => {
        if (notification && typeof notification.close === 'function') {
          notification.close();
        }
      }, 30000); // 30 segundos
    }

  }, []);

  // 🔔 Configurar notificaciones push avanzadas
  const setupAdvancedPushNotifications = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Verificar y solicitar permisos completos
      if ('Notification' in window) {
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission !== 'granted') {
          console.warn('❌ Permisos de notificación denegados');
          return;
        }
        
        console.log('✅ Permisos de notificación concedidos');
      }

      // 2. Registrar Service Worker si no está activo
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker activo:', registration.scope);
        
        // Configurar mensajes desde SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('📨 Mensaje desde Service Worker:', event.data);
          
          if (event.data.type === 'PLAY_NOTIFICATION_SOUND') {
            playCriticalSound();
          } else if (event.data.type === 'NOTIFICATION_CLICK') {
            // Manejar click en notificación
            window.focus();
            if (event.data.url && event.data.url !== window.location.pathname) {
              window.location.href = event.data.url;
            }
          }
        });
      }

      // 3. Suscribirse a notificaciones de cola en tiempo real
      const pushSubscription = supabase
        .channel(`push-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'push_notifications_queue',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('🔥 Nueva notificación push:', payload);
            
            const notification = payload.new;
            
            // Reproducir sonido crítico INMEDIATAMENTE
            if (notification.type === 'new_order' || notification.priority >= 3) {
              playCriticalSound();
            }
            
            // Mostrar notificación del navegador
            if ('Notification' in window && Notification.permission === 'granted') {
              const browserNotification = new Notification(notification.title, {
                body: notification.body,
                icon: '/assets/trato-logo.png',
                badge: '/assets/trato-logo.png',
                tag: `push-${notification.id}`,
                requireInteraction: notification.priority >= 3, // Críticas requieren interacción
                silent: false,
                data: notification.data
              } as any);

              // Auto-cerrar notificaciones no críticas
              if (notification.priority < 3) {
                setTimeout(() => {
                  browserNotification.close();
                }, 15000);
              }
            }
            
            // Callback opcional
            onNotification?.(
              notification.type, 
              notification.body, 
              notification.data
            );
            
            // Marcar como vista/recibida
            await supabase
              .from('push_notifications_queue')
              .update({ sent: true, sent_at: new Date().toISOString() })
              .eq('id', notification.id);
          }
        )
        .subscribe();

      console.log('✅ Suscripción a notificaciones push configurada');
      
      return () => {
        pushSubscription.unsubscribe();
      };

    } catch (error) {
      console.error('❌ Error configurando notificaciones push:', error);
    }
  }, [user, playCriticalSound, onNotification]);

  // 🧪 Función de prueba para verificar sonidos
  const testCriticalNotification = useCallback(() => {
    console.log('🧪 Probando notificación crítica...');
    playCriticalSound();
    
    // Simular notificación de nueva orden
    onNotification?.('test', 'Notificación de prueba - Nuevo pedido simulado');
    
    // Crear notificación del navegador de prueba
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🧪 Prueba de Sonido - TRATO', {
        body: 'Si escuchas esto, las notificaciones funcionan correctamente',
        icon: '/assets/trato-logo.png',
        requireInteraction: true,
        silent: false
      } as any);
    }
  }, [playCriticalSound, onNotification]);

  // 📱 Detectar si la app está en background
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      console.log('📱 App en background - notificaciones críticas activadas');
    } else {
      console.log('📱 App en foreground - notificaciones normales');
    }
  }, []);

  // ⚡ Configuración inicial
  useEffect(() => {
    if (!user) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      cleanup = await setupAdvancedPushNotifications();
    };

    setup();

    // Escuchar cambios de visibilidad para optimizar notificaciones
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Exponer función de prueba globalmente para debug
    (window as any).testTratoNotifications = testCriticalNotification;
    
    console.log('🎯 Sistema de notificaciones críticas inicializado');
    console.log('Para probar: window.testTratoNotifications()');

    return () => {
      cleanup?.();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      delete (window as any).testTratoNotifications;
    };
  }, [user, setupAdvancedPushNotifications, handleVisibilityChange, testCriticalNotification]);

  // Este componente no renderiza nada visible
  return null;
}

export default EnhancedPushNotifications;
