import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionData | null>(null);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Verificar si las notificaciones y Push están soportadas
    const isSupported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window;
    
    setSupported(isSupported);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Registrar Service Worker si está soportado
    if (isSupported) {
      registerServiceWorker();
    }
  }, []);

  // 📝 Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ Service Worker registrado:', registration.scope);
      setServiceWorkerReady(true);

      // Verificar suscripción existente
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        setPushSubscription({
          endpoint: existingSub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSub.getKey('p256dh')!),
            auth: arrayBufferToBase64(existingSub.getKey('auth')!)
          }
        });
      }

      return registration;
    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
      throw error;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      return false;
    }
  }, [supported, permission]);

  // 🔑 Suscribirse a Push Notifications
  const subscribeToPush = useCallback(async (force = false) => {
    if (!supported || !serviceWorkerReady) {
      throw new Error('Service Worker no está listo');
    }

    // Solicitar permisos primero
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      throw new Error('Permisos de notificación requeridos');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar suscripción existente
      let existingSub = await registration.pushManager.getSubscription();
      if (existingSub && !force) {
        console.log('✅ Suscripción Push existente');
        return existingSub;
      }

      // Crear nueva suscripción
      // VAPID Key público - En producción debe venir del servidor
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLuxazjqak4lhktMu9-u5kWfOb2T_7Ztz8AXP_NqHPAP1rMQMO4VVs';

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });

      const subscriptionData = {
        endpoint: newSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(newSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(newSubscription.getKey('auth')!)
        }
      };

      setPushSubscription(subscriptionData);

      // Guardar en base de datos
      if (user?.id) {
        await saveSubscriptionToDatabase(subscriptionData);
      }

      console.log('✅ Nueva suscripción Push creada');
      return newSubscription;

    } catch (error) {
      console.error('❌ Error creando suscripción Push:', error);
      throw error;
    }
  }, [supported, serviceWorkerReady, user?.id, requestPermission]);

  // 💾 Guardar suscripción en Supabase
  const saveSubscriptionToDatabase = async (subscriptionData: PushSubscriptionData) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
          user_agent: navigator.userAgent,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Error guardando suscripción:', error);
      } else {
        console.log('✅ Suscripción guardada en BD');
      }
    } catch (error) {
      console.error('❌ Error en saveSubscriptionToDatabase:', error);
    }
  };

  // 🔔 Mostrar notificación local mejorada
  const showNotification = useCallback(async (
    title: string, 
    options: NotificationOptions = {}
  ) => {
    if (!supported || permission !== 'granted') {
      console.warn('No se pueden mostrar notificaciones:', { supported, permission });
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'trato-notification',
        requireInteraction: true,
        ...options
      } as any);

      // Auto-close después de 15 segundos si no requiere interacción
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 15000);
      }

      return notification;
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
      return null;
    }
  }, [supported, permission]);

  // 🛒 Notificación específica para órdenes
  const showOrderNotification = useCallback(async (orderData: {
    customer_name: string;
    total: number;
    delivery_type: string;
    order_id: string;
  }) => {
    const deliveryTypeText = {
      'pickup': 'Recoger en tienda',
      'dine-in': 'Comer en el lugar',
      'delivery': 'Servicio a domicilio'
    }[orderData.delivery_type] || orderData.delivery_type;

    return await showNotification('🛒 Nueva Orden Recibida', {
      body: `${orderData.customer_name} - Q${orderData.total.toFixed(2)}\n${deliveryTypeText}`,
      tag: `order-${orderData.order_id}`,
      requireInteraction: true,
      data: {
        type: 'new-order',
        orderId: orderData.order_id,
        customerName: orderData.customer_name,
        total: orderData.total,
        deliveryType: orderData.delivery_type
      }
    } as any);
  }, [showNotification]);

  // 🧪 Enviar notificación de prueba
  const sendTestNotification = useCallback(async () => {
    if (!supported) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      // Notificación local para prueba inmediata
      new Notification('🔔 Notificación de Prueba', {
        body: '¡Tu sistema de notificaciones está funcionando correctamente!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true
      } as any);

      console.log('✅ Notificación de prueba enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de prueba:', error);
    }
  }, [supported, requestPermission]);

  // 🔄 Desuscribirse de Push
  const unsubscribeFromPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setPushSubscription(null);
        
        // Marcar como inactiva en BD
        if (user?.id) {
          await supabase
            .from('push_subscriptions')
            .update({ active: false })
            .eq('user_id', user.id);
        }
        
        console.log('✅ Suscripción Push cancelada');
      }
    } catch (error) {
      console.error('❌ Error cancelando suscripción:', error);
    }
  }, [user?.id]);

  // 📱 Notificación AGRESIVA para móviles - no perder ventas
  const showAggressiveMobileNotification = useCallback(async (title: string, options: {
    body?: string;
    data?: any;
    soundType?: string;
    critical?: boolean;
  }) => {
    if (!supported) return null;

    // Detectar móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     ('ontouchstart' in window);

    if (isMobile) {
      console.log('📱 Aplicando notificación AGRESIVA para móvil...');
      
      // Configuración agresiva para móviles
      const mobileOptions = {
        ...options,
        requireInteraction: true,        // Forzar interacción
        persistent: true,                // Persistente
        renotify: true,                  // Re-notificar
        silent: false,                   // NO silencioso
        tag: `mobile-urgent-${Date.now()}`, // Tag único
        timestamp: Date.now(),
        actions: [
          {
            action: 'view',
            title: '👀 Ver Pedido',
            icon: '/favicon.ico'
          },
          {
            action: 'dismiss',
            title: '❌ Cerrar',
            icon: '/favicon.ico'
          }
        ],
        vibrate: [1000, 100, 1000, 100, 1000, 100, 1000], // Vibración muy intensa
      };

      try {
        // Notificación principal
        const mainNotification = await showNotification(title, mobileOptions);

        // Si es crítico (nueva orden), crear notificación de respaldo
        if (options.critical) {
          setTimeout(async () => {
            await showNotification(
              `🚨 URGENTE: ${title}`,
              {
                ...mobileOptions,
                body: `⚠️ IMPORTANTE: ${options.body}`,
                tag: `backup-${Date.now()}`
              }
            );
          }, 3000);
        }

        return mainNotification;
      } catch (error) {
        console.error('Error en notificación móvil agresiva:', error);
        return await showNotification(title, options);
      }
    } else {
      return await showNotification(title, options);
    }
  }, [showNotification, supported]);

  return {
    permission,
    supported,
    pushSubscription,
    serviceWorkerReady,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showNotification,
    showOrderNotification,
    showAggressiveMobileNotification, // Nueva función para móviles
    sendTestNotification,
    canNotify: supported && permission === 'granted'
  };
}

// 🔧 Funciones auxiliares para Push Notifications
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
