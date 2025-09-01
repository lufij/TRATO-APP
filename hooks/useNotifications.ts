import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

interface NotificationConfig extends NotificationOptions {
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: NotificationOptions) => Promise<Notification | null>;
  playSound: (type?: string) => void;
  isServiceWorkerReady: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  // Verificar soporte
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!isSupported) return;

    // Estado inicial de permisos
    setPermission(Notification.permission);

    // Verificar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerReady(true);
        console.log('✅ Service Worker listo para notificaciones');
      });
    }
  }, [isSupported]);

  // Solicitar permisos
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Notificaciones no soportadas');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('✅ Permisos de notificación concedidos');
      } else {
        console.warn('❌ Permisos de notificación denegados');
      }
      
      return result;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return 'denied';
    }
  }, [isSupported]);

  // Mostrar notificación
  const showNotification = useCallback(async (options: NotificationOptions): Promise<Notification | null> => {
    if (!isSupported) {
      console.warn('Notificaciones no soportadas');
      return null;
    }

    if (permission !== 'granted') {
      console.warn('Permisos de notificación no concedidos');
      return null;
    }

    try {
      // Configuración por defecto
      const defaultOptions: NotificationConfig = {
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag: 'trato-notification',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        ...options
      };

      let notification: Notification;

      if (isServiceWorkerReady && 'serviceWorker' in navigator) {
        // Usar Service Worker para notificaciones persistentes
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(defaultOptions.title, {
          body: defaultOptions.body,
          icon: defaultOptions.icon,
          badge: defaultOptions.badge,
          tag: defaultOptions.tag,
          data: defaultOptions.data,
          requireInteraction: defaultOptions.requireInteraction,
          silent: defaultOptions.silent,
          // @ts-ignore - vibrate es soportado pero no está en tipos
          vibrate: defaultOptions.vibrate,
          actions: [
            {
              action: 'view',
              title: '👀 Ver',
              icon: '/icon-view.png'
            },
            {
              action: 'dismiss',
              title: '❌ Cerrar',
              icon: '/icon-close.png'
            }
          ]
        });
        
        console.log('📨 Notificación SW mostrada:', defaultOptions.title);
        return null; // SW notifications no retornan objeto
      } else {
        // Fallback a notificación básica
        notification = new Notification(defaultOptions.title, {
          body: defaultOptions.body,
          icon: defaultOptions.icon,
          tag: defaultOptions.tag,
          data: defaultOptions.data,
          requireInteraction: defaultOptions.requireInteraction,
          silent: defaultOptions.silent
        });

        // Manejar clicks en notificación básica
        notification.onclick = () => {
          window.focus();
          if (defaultOptions.data?.url) {
            window.location.href = defaultOptions.data.url;
          }
          notification.close();
        };

        console.log('📨 Notificación básica mostrada:', defaultOptions.title);
        return notification;
      }
    } catch (error) {
      console.error('Error mostrando notificación:', error);
      return null;
    }
  }, [permission, isSupported, isServiceWorkerReady]);

  // Reproducir sonido
  const playSound = useCallback((type: string = 'default') => {
    try {
      // Si hay Service Worker, delegarle el sonido
      if (isServiceWorkerReady && 'serviceWorker' in navigator) {
        navigator.serviceWorker.controller?.postMessage({
          type: 'PLAY_NOTIFICATION_SOUND',
          soundType: type
        });
        return;
      }

      // Fallback: reproducir sonido directamente
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const frequencies: { [key: string]: number[] } = {
        'new_order': [800, 1000, 1200],
        'order_ready': [1200, 800],
        'order_delivered': [600, 800, 1000, 800],
        'default': [800, 1000]
      };
      
      const notes = frequencies[type] || frequencies.default;
      let delay = 0;
      
      notes.forEach((freq) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }, delay);
        
        delay += 200;
      });
      
      console.log('🔊 Sonido reproducido:', type);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.log('🔇 Error reproduciendo sonido:', errorMessage);
    }
  }, [isServiceWorkerReady]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    playSound,
    isServiceWorkerReady
  };
};

// Hook específico para pedidos
export const useOrderNotifications = () => {
  const notifications = useNotifications();

  const notifyNewOrder = useCallback((orderData: any) => {
    notifications.showNotification({
      title: `🆕 Nuevo Pedido - ${orderData.delivery_type || 'Delivery'}`,
      body: `Pedido #${orderData.id} por $${orderData.total || '0.00'}`,
      tag: `order-${orderData.id}`,
      data: {
        url: `/?order=${orderData.id}`,
        type: 'new_order',
        orderId: orderData.id
      },
      requireInteraction: true,
      vibrate: [300, 200, 300, 200, 300]
    });
    
    notifications.playSound('new_order');
  }, [notifications]);

  const notifyOrderReady = useCallback((orderData: any) => {
    notifications.showNotification({
      title: '✅ Pedido Listo',
      body: `Tu pedido #${orderData.id} está listo para ${orderData.delivery_type === 'pickup' ? 'recoger' : 'servir'}`,
      tag: `order-ready-${orderData.id}`,
      data: {
        url: `/?order=${orderData.id}`,
        type: 'order_ready',
        orderId: orderData.id
      },
      vibrate: [200, 100, 200]
    });
    
    notifications.playSound('order_ready');
  }, [notifications]);

  const notifyOrderDelivered = useCallback((orderData: any) => {
    notifications.showNotification({
      title: '🎉 Pedido Entregado',
      body: `Tu pedido #${orderData.id} ha sido entregado exitosamente`,
      tag: `order-delivered-${orderData.id}`,
      data: {
        url: `/?order=${orderData.id}`,
        type: 'order_delivered',
        orderId: orderData.id
      },
      vibrate: [100, 50, 100, 50, 100, 50, 200]
    });
    
    notifications.playSound('order_delivered');
  }, [notifications]);

  return {
    ...notifications,
    notifyNewOrder,
    notifyOrderReady,
    notifyOrderDelivered
  };
};
