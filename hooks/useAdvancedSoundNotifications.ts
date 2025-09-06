import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { usePushNotifications } from './usePushNotifications';

// Tipos de sonidos de notificación con configuraciones específicas
export enum NotificationSound {
  NEW_ORDER = 'new-order',
  ORDER_ASSIGNED = 'order-assigned',
  ORDER_READY = 'order-ready', 
  ORDER_DELIVERED = 'order-delivered',
  NEW_PRODUCT = 'new-product',
  GENERAL = 'general',
  CRITICAL = 'critical'
}

interface AdvancedSoundConfig {
  frequency: number;
  duration: number;
  pattern: 'single' | 'double' | 'triple' | 'continuous';
  volume: number;
  vibration?: number[]; // Patrón de vibración para móviles
  repeatCount?: number; // Cuántas veces repetir el sonido
  repeatInterval?: number; // Intervalo entre repeticiones (ms)
}

interface SoundNotificationConfig {
  enabled: boolean;
  volume: number;
  enableVibration: boolean;
  enableBackgroundNotifications: boolean;
  sounds: {
    [key in NotificationSound]: AdvancedSoundConfig;
  };
}

// Configuraciones optimizadas para máxima audibilidad
const defaultConfig: SoundNotificationConfig = {
  enabled: true,
  volume: 0.8, // Volumen alto por defecto
  enableVibration: true,
  enableBackgroundNotifications: true,
  sounds: {
    [NotificationSound.NEW_ORDER]: {
      frequency: 880, // Nota A5 - muy audible
      duration: 400,
      pattern: 'triple',
      volume: 0.9,
      vibration: [400, 200, 400, 200, 400], // Vibración triple
      repeatCount: 3,
      repeatInterval: 2000
    },
    [NotificationSound.ORDER_ASSIGNED]: {
      frequency: 660, // Nota E5
      duration: 300,
      pattern: 'double',
      volume: 0.8,
      vibration: [300, 150, 300],
      repeatCount: 2,
      repeatInterval: 1500
    },
    [NotificationSound.ORDER_READY]: {
      frequency: 1108, // Nota C#6 - muy aguda
      duration: 250,
      pattern: 'double',
      volume: 0.8,
      vibration: [250, 100, 250],
      repeatCount: 2,
      repeatInterval: 1000
    },
    [NotificationSound.ORDER_DELIVERED]: {
      frequency: 440, // Nota A4 - grave pero audible
      duration: 500,
      pattern: 'single',
      volume: 0.7,
      vibration: [500],
      repeatCount: 1,
      repeatInterval: 0
    },
    [NotificationSound.NEW_PRODUCT]: {
      frequency: 784, // Nota G5
      duration: 200,
      pattern: 'single',
      volume: 0.7,
      vibration: [200],
      repeatCount: 1,
      repeatInterval: 0
    },
    [NotificationSound.GENERAL]: {
      frequency: 523, // Nota C5
      duration: 300,
      pattern: 'single',
      volume: 0.7,
      vibration: [300],
      repeatCount: 1,
      repeatInterval: 0
    },
    [NotificationSound.CRITICAL]: {
      frequency: 1000, // 1kHz - máxima audibilidad
      duration: 600,
      pattern: 'continuous',
      volume: 1.0, // Volumen máximo
      vibration: [600, 200, 600, 200, 600],
      repeatCount: 5, // Repetir 5 veces
      repeatInterval: 1000
    }
  }
};

export function useAdvancedSoundNotifications() {
  const { user } = useAuth();
  const { showOrderNotification, showDeliveryNotification, showGeneralNotification, requestPermission } = usePushNotifications();
  const audioContextRef = useRef<AudioContext | null>(null);
  const configRef = useRef<SoundNotificationConfig>(defaultConfig);
  const activeRepeatsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [isEnabled, setIsEnabled] = useState(defaultConfig.enabled);

  // Inicializar AudioContext y permisos
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Crear AudioContext con configuraciones optimizadas
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass && !audioContextRef.current) {
          audioContextRef.current = new AudioContextClass({
            latencyHint: 'interactive', // Baja latencia para sonidos de notificación
            sampleRate: 44100 // Calidad estándar
          });
          
          console.log('✅ AudioContext inicializado correctamente');
        }

        // Solicitar permisos de notificación
        const granted = await requestPermission();
        if (granted) {
          console.log('✅ Permisos de notificación concedidos');
        }

        // Solicitar activación de audio en interacción del usuario
        const enableAudio = () => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              console.log('✅ AudioContext reactivado por interacción del usuario');
            });
          }
        };

        // Escuchar primer clic/tap para activar audio
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });

      } catch (error) {
        console.error('❌ Error inicializando sistema de audio:', error);
      }
    };

    initializeAudio();

    return () => {
      // Limpiar timeouts activos
      activeRepeatsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      activeRepeatsRef.current.clear();

      // Cerrar AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close().catch(console.warn);
        } catch (error) {
          console.warn('Error cerrando AudioContext:', error);
        }
      }
    };
  }, [requestPermission]);

  // Función principal para reproducir sonidos avanzados
  const playAdvancedSound = useCallback((soundType: NotificationSound, customConfig?: Partial<AdvancedSoundConfig>) => {
    if (!configRef.current.enabled || !audioContextRef.current) {
      console.warn('Sistema de sonido deshabilitado o AudioContext no disponible');
      return;
    }

    const config = { ...configRef.current.sounds[soundType], ...customConfig };
    const audioContext = audioContextRef.current;

    // Verificar y reactivar AudioContext si es necesario
    if (audioContext.state === 'closed') {
      console.warn('AudioContext cerrado, no se puede reproducir sonido');
      return;
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(console.warn);
    }

    // Limpiar repetición anterior si existe
    const repeatKey = `${soundType}-repeat`;
    if (activeRepeatsRef.current.has(repeatKey)) {
      clearTimeout(activeRepeatsRef.current.get(repeatKey)!);
      activeRepeatsRef.current.delete(repeatKey);
    }

    // Función para reproducir un tono individual
    const playTone = (delay: number = 0) => {
      setTimeout(() => {
        try {
          if (audioContext.state === 'closed') return;

          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          // Conectar nodos de audio
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          // Configurar oscilador
          oscillator.frequency.value = config.frequency;
          oscillator.type = 'sine'; // Forma de onda más limpia

          // Configurar volumen con envelope para evitar clicks
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            config.volume * configRef.current.volume,
            audioContext.currentTime + 0.01
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + config.duration / 1000
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + config.duration / 1000);

        } catch (error) {
          console.warn('Error reproduciendo tono:', error);
        }
      }, delay);
    };

    // Reproducir patrón según configuración
    const playPattern = () => {
      switch (config.pattern) {
        case 'single':
          playTone();
          break;
        
        case 'double':
          playTone();
          playTone(config.duration + 150);
          break;
        
        case 'triple':
          playTone();
          playTone(config.duration + 150);
          playTone((config.duration + 150) * 2);
          break;
        
        case 'continuous':
          // Sonido continuo para alertas críticas
          for (let i = 0; i < 3; i++) {
            playTone(i * (config.duration + 100));
          }
          break;
      }

      // Activar vibración en dispositivos móviles
      if (configRef.current.enableVibration && config.vibration && 'vibrate' in navigator) {
        try {
          navigator.vibrate(config.vibration);
        } catch (error) {
          console.warn('Error activando vibración:', error);
        }
      }
    };

    // Reproducir patrón inicial
    playPattern();

    // Configurar repeticiones si es necesario
    if (config.repeatCount && config.repeatCount > 1 && config.repeatInterval) {
      let repeatCounter = 1;
      
      const scheduleRepeat = () => {
        if (repeatCounter < config.repeatCount!) {
          const timeout = setTimeout(() => {
            playPattern();
            repeatCounter++;
            scheduleRepeat();
          }, config.repeatInterval);
          
          activeRepeatsRef.current.set(repeatKey, timeout);
        }
      };

      scheduleRepeat();
    }

  }, []);

  // Función para reproducir notificación completa (sonido + push)
  const playNotificationWithSound = useCallback(async (
    soundType: NotificationSound,
    title: string,
    options: {
      body?: string;
      data?: any;
      requireInteraction?: boolean;
      customSound?: Partial<AdvancedSoundConfig>;
    } = {}
  ) => {
    try {
      // Reproducir sonido inmediatamente
      playAdvancedSound(soundType, options.customSound);

      // Mostrar notificación push si está habilitado
      if (configRef.current.enableBackgroundNotifications) {
        await showGeneralNotification(title, options.body || '', {
          requireInteraction: options.requireInteraction || false,
          ...options.data
        });
      }

      // Mostrar toast interno
      toast.success(title, {
        description: options.body,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error en notificación completa:', error);
    }
  }, [playAdvancedSound, showGeneralNotification, configRef.current.enableBackgroundNotifications]);

  // Test de sonido específico
  const testSound = useCallback((soundType: NotificationSound) => {
    console.log(`🔊 Probando sonido: ${soundType}`);
    playAdvancedSound(soundType);
  }, [playAdvancedSound]);

  // Función para detener todas las repeticiones activas
  const stopAllSounds = useCallback(() => {
    activeRepeatsRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    activeRepeatsRef.current.clear();
    console.log('🔇 Todos los sonidos detenidos');
  }, []);

  // Configurar sonidos específicos por rol de usuario
  const setupRoleBasedNotifications = useCallback(() => {
    if (!user) return () => {};

    console.log(`🔊 Configurando notificaciones sonoras para: ${user.role}`);

    let subscription: any = null;

    switch (user.role) {
      case 'vendedor':
        // Notificaciones para vendedores
        subscription = supabase
          .channel('vendor-advanced-sounds')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${user.id}`
          }, (payload) => {
            console.log('🛒 Nueva orden con sonido avanzado');
            playNotificationWithSound(
              NotificationSound.NEW_ORDER,
              '🛒 ¡Nueva Orden Recibida!',
              {
                body: `Cliente: ${payload.new.customer_name} - Q${payload.new.total}`,
                requireInteraction: true,
                data: { orderId: payload.new.id }
              }
            );
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `seller_id=eq.${user.id}`
          }, (payload) => {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            
            if (oldStatus === 'ready' && newStatus === 'assigned') {
              console.log('🚚 Repartidor asignado con sonido');
              playNotificationWithSound(
                NotificationSound.ORDER_ASSIGNED,
                '🚚 Repartidor Asignado',
                {
                  body: `Pedido #${payload.new.id} en camino`,
                  data: { orderId: payload.new.id }
                }
              );
            }
          })
          .subscribe();
        break;

      case 'repartidor':
        // Notificaciones para repartidores
        subscription = supabase
          .channel('driver-advanced-sounds')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `driver_id=eq.${user.id}`
          }, (payload) => {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            
            if (oldStatus !== 'assigned' && newStatus === 'assigned') {
              console.log('📦 Nueva entrega asignada con sonido');
              playNotificationWithSound(
                NotificationSound.ORDER_READY,
                '📦 Nueva Entrega Asignada',
                {
                  body: `Entrega para: ${payload.new.customer_name}`,
                  requireInteraction: true,
                  data: { orderId: payload.new.id }
                }
              );
            }
          })
          .subscribe();
        break;

      case 'comprador':
        // Notificaciones para compradores
        subscription = supabase
          .channel('buyer-advanced-sounds')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`
          }, (payload) => {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            
            if (oldStatus === 'assigned' && newStatus === 'delivered') {
              console.log('✅ Pedido entregado con sonido');
              playNotificationWithSound(
                NotificationSound.ORDER_DELIVERED,
                '✅ ¡Pedido Entregado!',
                {
                  body: 'Tu pedido ha sido entregado exitosamente',
                  data: { orderId: payload.new.id }
                }
              );
            }
          })
          .subscribe();
        break;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, playNotificationWithSound]);

  // Activar notificaciones por rol
  useEffect(() => {
    const cleanup = setupRoleBasedNotifications();
    return cleanup;
  }, [setupRoleBasedNotifications]);

  // Configuraciones públicas
  const toggleSounds = useCallback((enabled: boolean) => {
    configRef.current.enabled = enabled;
    setIsEnabled(enabled);
    console.log(`🔊 Sonidos ${enabled ? 'activados' : 'desactivados'}`);
  }, []);

  const setVolume = useCallback((volume: number) => {
    configRef.current.volume = Math.max(0, Math.min(1, volume));
    console.log(`🔊 Volumen ajustado a: ${(configRef.current.volume * 100).toFixed(0)}%`);
  }, []);

  const toggleVibration = useCallback((enabled: boolean) => {
    configRef.current.enableVibration = enabled;
    console.log(`📳 Vibración ${enabled ? 'activada' : 'desactivada'}`);
  }, []);

  return {
    // Estado
    isEnabled,
    config: configRef.current,
    isAudioContextReady: audioContextRef.current?.state === 'running',
    
    // Funciones principales
    playAdvancedSound,
    playNotificationWithSound,
    testSound,
    stopAllSounds,
    
    // Configuración
    toggleSounds,
    setVolume,
    toggleVibration,
    
    // Información de soporte
    isAudioSupported: !!(window.AudioContext || (window as any).webkitAudioContext),
    isVibrationSupported: 'vibrate' in navigator
  };
}
