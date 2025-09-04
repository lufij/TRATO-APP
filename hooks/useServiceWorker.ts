// 🚀 HOOK PARA SERVICE WORKER Y NOTIFICACIONES PUSH REALES
// Para app comunitaria en producción - Móvil optimizado

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

interface PushSubscriptionState {
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isSubscribing: boolean;
  publicKey: string | null;
}

export function useServiceWorker() {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    hasUpdate: false,
    registration: null,
    error: null
  });

  const [pushState, setPushState] = useState<PushSubscriptionState>({
    isSubscribed: false,
    subscription: null,
    isSubscribing: false,
    publicKey: null
  });

  // Verificar soporte inicial
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    setSwState(prev => ({
      ...prev,
      isSupported
    }));

    if (!isSupported) {
      console.log('❌ Service Worker o Push no soportados en este navegador');
      return;
    }

    registerServiceWorker();
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      setSwState(prev => ({ ...prev, isInstalling: true, error: null }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ Service Worker registrado:', registration.scope);

      // Listeners para eventos del SW
      registration.addEventListener('updatefound', () => {
        console.log('🔄 Actualización de Service Worker encontrada');
        setSwState(prev => ({ ...prev, hasUpdate: true }));
      });

      if (registration.waiting) {
        console.log('⏳ Service Worker esperando activación');
        setSwState(prev => ({ ...prev, hasUpdate: true }));
      }

      setSwState(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
        registration
      }));

      // Configurar push después del registro
      setupPushNotifications(registration);

    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
      setSwState(prev => ({
        ...prev,
        isInstalling: false,
        error: `Error: ${error}`
      }));
    }
  }, []);

  // Configurar notificaciones push
  const setupPushNotifications = useCallback(async (registration: ServiceWorkerRegistration) => {
    try {
      // Verificar si ya está suscrito
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('📱 Push subscription existente encontrada');
        setPushState(prev => ({
          ...prev,
          isSubscribed: true,
          subscription: existingSubscription
        }));
        return;
      }

      console.log('📱 No hay subscription existente');
      
    } catch (error) {
      console.error('❌ Error verificando push subscription:', error);
    }
  }, []);

  // Suscribirse a push notifications
  const subscribeToPush = useCallback(async () => {
    if (!swState.registration || pushState.isSubscribing) return;

    try {
      setPushState(prev => ({ ...prev, isSubscribing: true }));

      // Verificar permisos de notificación
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Permisos de notificación denegados');
      }

      // VAPID public key (deberías obtener esto de tu backend)
      // Por ahora usamos una key de prueba - en producción debe venir del servidor
      const applicationServerKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI95Q2xJlOJYhGjBZOYz-BxVg5QvTZA7qrKAOOoJHXHaYINqkC_8G5pnEw';

      const subscription = await swState.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey) as BufferSource
      });

      console.log('✅ Suscripción push creada:', subscription);

      // Enviar subscription al servidor (Supabase)
      await sendSubscriptionToServer(subscription);

      setPushState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
        isSubscribing: false,
        publicKey: applicationServerKey
      }));

    } catch (error) {
      console.error('❌ Error suscribiendo a push:', error);
      setPushState(prev => ({
        ...prev,
        isSubscribing: false
      }));
    }
  }, [swState.registration, pushState.isSubscribing]);

  // Cancelar suscripción push
  const unsubscribeFromPush = useCallback(async () => {
    if (!pushState.subscription) return;

    try {
      await pushState.subscription.unsubscribe();
      
      // Remover del servidor
      await removeSubscriptionFromServer(pushState.subscription);

      setPushState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null
      }));

      console.log('✅ Push subscription cancelada');
      
    } catch (error) {
      console.error('❌ Error cancelando push subscription:', error);
    }
  }, [pushState.subscription]);

  // Activar update del Service Worker
  const activateUpdate = useCallback(() => {
    if (!swState.registration?.waiting) return;

    swState.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    setSwState(prev => ({ ...prev, hasUpdate: false }));
    
    // Recargar página después de un momento
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }, [swState.registration]);

  // Listener para mensajes del Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Mensaje del Service Worker:', event.data);
      
      const { type, data } = event.data;
      
      switch (type) {
        case 'NOTIFICATION_CLICK':
          // Manejar click en notificación
          console.log('👆 Click en notificación:', data);
          break;
          
        case 'NOTIFICATION_RECEIVED':
          // Manejar notificación recibida
          console.log('📱 Notificación recibida:', data);
          break;
          
        case 'NOTIFICATION_PERMISSION_RESULT':
          // Resultado de solicitud de permisos
          console.log('🔔 Resultado permisos:', data);
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    serviceWorker: swState,
    push: pushState,
    subscribeToPush,
    unsubscribeFromPush,
    activateUpdate,
    isReady: swState.isRegistered && swState.isSupported
  };
}

// =====================================================
// FUNCIONES HELPER
// =====================================================

// Convertir VAPID key a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Enviar subscription al servidor (Supabase)
async function sendSubscriptionToServer(subscription: PushSubscription) {
  try {
    // En producción, esto debería ir a tu API/Supabase
    console.log('📡 Enviando subscription al servidor:', subscription);
    
    // Ejemplo de cómo guardar en localStorage por ahora
    localStorage.setItem('push_subscription', JSON.stringify(subscription));
    
    // TODO: Implementar guardado en Supabase
    /*
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON(),
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    */
    
  } catch (error) {
    console.error('❌ Error enviando subscription:', error);
    throw error;
  }
}

// Remover subscription del servidor
async function removeSubscriptionFromServer(subscription: PushSubscription) {
  try {
    console.log('🗑️ Removiendo subscription del servidor');
    
    // Remover del localStorage
    localStorage.removeItem('push_subscription');
    
    // TODO: Remover de Supabase
    /*
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .match({ 
        user_id: user.id,
        endpoint: subscription.endpoint 
      });
      
    if (error) throw error;
    */
    
  } catch (error) {
    console.error('❌ Error removiendo subscription:', error);
    throw error;
  }
}

// Hook complementario para testear notificaciones
export function useNotificationTester() {
  const sendTestNotification = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker no soportado');
    }

    const registration = await navigator.serviceWorker.ready;
    
    registration.active?.postMessage({
      type: 'TEST_NOTIFICATION'
    });
  }, []);

  return {
    sendTestNotification
  };
}
