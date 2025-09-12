import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import { usePushNotifications } from './usePushNotifications';

// Define notification sound types
export enum NotificationSound {
  NEW_ORDER = 'new-order',
  ORDER_ASSIGNED = 'order-assigned',
  ORDER_READY = 'order-ready',
  ORDER_DELIVERED = 'order-delivered',
  NEW_PRODUCT = 'new-product',
  GENERAL = 'general'
}

interface SoundNotificationConfig {
  enabled: boolean;
  volume: number;
  sounds: {
    [key in NotificationSound]: {
      frequency: number;
      duration: number;
      pattern: 'single' | 'double' | 'triple';
    };
  };
}

const defaultConfig: SoundNotificationConfig = {
  enabled: true,
  volume: 1.0, // Volumen máximo para que los vendedores no pierdan ventas
  sounds: {
    [NotificationSound.NEW_ORDER]: {
      frequency: 1400, // Frecuencia de emergencia muy alta y audible
      duration: 600,   // Duración más larga para máxima atención
      pattern: 'double' // Doble tono urgente
    },
    [NotificationSound.ORDER_ASSIGNED]: {
      frequency: 1300, // Tono de emergencia agudo
      duration: 500,
      pattern: 'double'
    },
    [NotificationSound.ORDER_READY]: {
      frequency: 1500, // Frecuencia máxima para pedido listo
      duration: 550,
      pattern: 'double'
    },
    [NotificationSound.ORDER_DELIVERED]: {
      frequency: 1200, // Tono alto pero confirmatorio
      duration: 650,
      pattern: 'double'
    },
    [NotificationSound.NEW_PRODUCT]: {
      frequency: 1250, // Tono de alerta audible
      duration: 450,
      pattern: 'double'
    },
    [NotificationSound.GENERAL]: {
      frequency: 1350, // Tono general de emergencia
      duration: 500,
      pattern: 'double'
    }
  }
};

export function useSoundNotifications() {
  const { user } = useAuth();
  const { showOrderNotification, showDeliveryNotification, showGeneralNotification, requestPermission } = usePushNotifications();
  const audioContextRef = useRef<AudioContext | null>(null);
  const configRef = useRef<SoundNotificationConfig>(defaultConfig);

  // Initialize AudioContext and request notification permissions
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
    }

    // Request notification permissions on initialization
    requestPermission().then(granted => {
      if (granted) {
        console.log('✅ Permisos de notificación concedidos');
      } else {
        console.warn('⚠️ Permisos de notificación denegados');
      }
    });

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close().catch(err => {
            console.warn('Error closing AudioContext:', err);
          });
        } catch (error) {
          console.warn('Error closing AudioContext:', error);
        }
      }
    };
  }, [requestPermission]);

  // Play notification sound
  const playSound = useCallback((soundType: NotificationSound) => {
    if (!configRef.current.enabled || !audioContextRef.current) return;

    const config = configRef.current.sounds[soundType];
    const audioContext = audioContextRef.current;

    // Check if AudioContext is closed
    if (audioContext.state === 'closed') {
      console.warn('AudioContext is closed, cannot play sound');
      return;
    }

    // Resume AudioContext if suspended (required for some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(err => {
        console.warn('Error resuming AudioContext:', err);
        return;
      });
    }

    const playTone = (delay: number = 0) => {
      setTimeout(() => {
        try {
          if (audioContext.state === 'closed') return;
          
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = config.frequency;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            configRef.current.volume,
            audioContext.currentTime + 0.01
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + config.duration / 1000
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + config.duration / 1000);
        } catch (error) {
          console.warn('Error playing sound tone:', error);
        }
      }, delay);
    };

    // Play sound pattern
    switch (config.pattern) {
      case 'single':
        playTone();
        break;
      case 'double':
        playTone();
        playTone(config.duration + 30); // Espacio mínimo para máxima urgencia
        break;
      case 'triple':
        playTone();
        playTone(config.duration + 100);
        playTone((config.duration + 100) * 2);
        break;
    }
  }, []);

  // Handle vendor notifications
  const setupVendorNotifications = useCallback(() => {
    if (!user || user.role !== 'vendedor') return;

    const subscription = supabase
      .channel('vendor-sound-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔊 Vendor: New order notification with sound');
          
          // Reproducir sonido avanzado con múltiples repeticiones
          playSound(NotificationSound.NEW_ORDER);
          
          // También usar el sistema avanzado si está disponible
          if ((window as any).notifyNewOrder) {
            (window as any).notifyNewOrder({
              id: payload.new.id,
              customer_name: payload.new.customer_name || 'Cliente',
              total: payload.new.total_amount || payload.new.total || 0,
              delivery_type: payload.new.delivery_type || 'pickup'
            });
          }
          
          // Show push notification
          showOrderNotification({
            customer_name: payload.new.customer_name || 'Cliente',
            total: payload.new.total_amount || payload.new.total || 0,
            delivery_type: payload.new.delivery_type || 'pickup',
            order_id: payload.new.id
          });
          
          toast.success('¡Nueva orden recibida!', {
            description: `Pedido por Q${(payload.new.total_amount || payload.new.total || 0)}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          // Driver assigned notification
          if (oldStatus === 'ready' && newStatus === 'assigned') {
            console.log('🔊 Vendor: Driver assigned notification with sound');
            playSound(NotificationSound.ORDER_ASSIGNED);
            
            // También usar el sistema avanzado si está disponible
            if ((window as any).notifyDriverAssigned) {
              (window as any).notifyDriverAssigned({
                id: payload.new.id,
                customer_name: payload.new.customer_name
              });
            }
            
            showDeliveryNotification('Un repartidor aceptó la entrega');
            
            toast.info('Repartidor asignado', {
              description: 'Un repartidor aceptó la entrega',
              duration: 4000,
            });
          }

          // Order delivered notification
          if (newStatus === 'delivered') {
            console.log('🔊 Vendor: Order delivered notification with sound');
            playSound(NotificationSound.ORDER_DELIVERED);
            
            showDeliveryNotification('El pedido fue entregado exitosamente');
            
            toast.success('Pedido entregado', {
              description: 'El pedido fue entregado exitosamente',
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user, playSound]);

  // Handle delivery driver notifications
  const setupDriverNotifications = useCallback(() => {
    if (!user || user.role !== 'repartidor') return;

    const subscription = supabase
      .channel('driver-sound-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.ready'
        },
        (payload) => {
          console.log('🔊 Driver: New delivery available with sound');
          playSound(NotificationSound.ORDER_READY);
          
          // También usar el sistema avanzado si está disponible
          if ((window as any).notifyDeliveryAvailable) {
            (window as any).notifyDeliveryAvailable({
              id: payload.new.id,
              customer_name: payload.new.customer_name || 'Cliente',
              delivery_address: payload.new.delivery_address || 'Dirección no especificada',
              total: payload.new.total_amount || payload.new.total || 0
            });
          }
          
          // Push notification for new delivery available
          showDeliveryNotification(
            'Nueva entrega disponible',
            `Pedido de Q${payload.new.total_amount || payload.new.total || 0} listo para recoger`
          );
          
          toast.info('¡Nueva entrega disponible!', {
            description: `Pedido de Q${payload.new.total_amount || payload.new.total || 0} listo para recoger`,
            duration: 6000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          const newStatus = payload.new?.status;
          
          if (newStatus === 'assigned') {
            console.log('🔊 Driver: Order assigned to you with sound');
            playSound(NotificationSound.ORDER_ASSIGNED);
            
            // Push notification for order assignment
            showDeliveryNotification(
              'Entrega asignada',
              'Tienes una nueva entrega asignada'
            );
            
            toast.success('Entrega asignada', {
              description: 'Tienes una nueva entrega asignada',
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user, playSound, showDeliveryNotification]);

  // Handle buyer notifications
  const setupBuyerNotifications = useCallback(() => {
    if (!user || user.role !== 'comprador') return;

    const subscription = supabase
      .channel('buyer-sound-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`
        },
        (payload) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          // Order accepted
          if (oldStatus === 'pending' && newStatus === 'accepted') {
            console.log('🔊 Buyer: Order accepted with sound');
            playSound(NotificationSound.GENERAL);
            
            // Push notification for order accepted
            showOrderNotification({
              customer_name: 'Tu pedido',
              total: payload.new.total_amount || payload.new.total || 0,
              delivery_type: payload.new.delivery_type || 'pickup',
              order_id: payload.new.id
            });
            
            toast.success('Pedido aceptado', {
              description: 'El vendedor aceptó tu pedido',
              duration: 4000,
            });
          }

          // Order ready
          if (newStatus === 'ready') {
            console.log('🔊 Buyer: Order ready with sound');
            playSound(NotificationSound.ORDER_READY);
            
            // Push notification for order ready
            showOrderNotification({
              customer_name: 'Tu pedido',
              total: payload.new.total_amount || payload.new.total || 0,
              delivery_type: payload.new.delivery_type || 'pickup',
              order_id: payload.new.id
            });
            
            toast.info('Pedido listo', {
              description: 'Tu pedido está listo para recoger o será entregado pronto',
              duration: 5000,
            });
          }

          // Order assigned to driver
          if (newStatus === 'assigned') {
            console.log('🔊 Buyer: Driver assigned with sound');
            playSound(NotificationSound.ORDER_ASSIGNED);
            
            // Push notification for driver assigned
            showDeliveryNotification(
              'Repartidor asignado',
              'Un repartidor está en camino a recoger tu pedido'
            );
            
            toast.info('Repartidor asignado', {
              description: 'Un repartidor está en camino a recoger tu pedido',
              duration: 4000,
            });
          }

          // Order delivered
          if (newStatus === 'delivered') {
            console.log('🔊 Buyer: Order delivered with sound');
            playSound(NotificationSound.ORDER_DELIVERED);
            
            // También usar el sistema avanzado si está disponible
            if ((window as any).notifyOrderDelivered) {
              (window as any).notifyOrderDelivered({
                id: payload.new.id
              });
            }
            
            // Push notification for order delivered
            showOrderNotification({
              customer_name: 'Tu pedido',
              total: payload.new.total_amount || payload.new.total || 0,
              delivery_type: payload.new.delivery_type || 'pickup',
              order_id: payload.new.id
            });
            
            toast.success('¡Pedido entregado!', {
              description: 'Tu pedido ha sido entregado exitosamente',
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_products'
        },
        (payload) => {
          console.log('🔊 Buyer: New product available with sound');
          playSound(NotificationSound.NEW_PRODUCT);
          
          // Push notification for new product
          showOrderNotification({
            customer_name: 'Nuevo producto',
            total: 0,
            delivery_type: 'pickup',
            order_id: 'new-product'
          });
          
          toast.info('¡Nuevo producto disponible!', {
            description: 'Se agregó un nuevo producto al catálogo',
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user, playSound, showOrderNotification, showDeliveryNotification]);

  // Setup notifications based on user role
  useEffect(() => {
    if (!user) return;

    let cleanup: (() => void) | undefined;

    switch (user.role) {
      case 'vendedor':
        cleanup = setupVendorNotifications();
        break;
      case 'repartidor':
        cleanup = setupDriverNotifications();
        break;
      case 'comprador':
        cleanup = setupBuyerNotifications();
        break;
    }

    return cleanup;
  }, [user, setupVendorNotifications, setupDriverNotifications, setupBuyerNotifications]);

  // Configuration methods
  const updateConfig = useCallback((newConfig: Partial<SoundNotificationConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
  }, []);

  const toggleSounds = useCallback((enabled: boolean) => {
    configRef.current.enabled = enabled;
  }, []);

  const setVolume = useCallback((volume: number) => {
    configRef.current.volume = Math.max(0, Math.min(1, volume));
  }, []);

  const testSound = useCallback((soundType: NotificationSound) => {
    playSound(soundType);
  }, [playSound]);

  return {
    playSound,
    updateConfig,
    toggleSounds,
    setVolume,
    testSound,
    config: configRef.current,
    isEnabled: configRef.current.enabled
  };
}
