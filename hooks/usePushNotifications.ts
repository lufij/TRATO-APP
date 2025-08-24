import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Verificar si las notificaciones están soportadas
    setSupported('Notification' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
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
        icon: '/assets/trato-logo.png',
        badge: '/assets/trato-logo.png',
        tag: 'trato-notification',
        requireInteraction: true, // Mantiene la notificación hasta que el usuario interactúe
        ...options
      } as any); // Use any to bypass TypeScript limitations

      // Auto-close después de 10 segundos si no requiere interacción
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
      return null;
    }
  }, [supported, permission]);

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
      icon: '/assets/trato-logo.png',
      badge: '/assets/trato-logo.png',
      tag: `order-${orderData.order_id}`,
      requireInteraction: true,
      data: {
        type: 'new-order',
        orderId: orderData.order_id,
        customerName: orderData.customer_name,
        total: orderData.total,
        deliveryType: orderData.delivery_type
      }
    } as any); // Use any for advanced notification features
  }, [showNotification]);

  const showDeliveryNotification = useCallback(async (message: string, orderData?: any) => {
    return await showNotification('🚛 Actualización de Entrega', {
      body: message,
      icon: '/assets/trato-logo.png',
      badge: '/assets/trato-logo.png',
      tag: 'delivery-update',
      data: {
        type: 'delivery-update',
        ...orderData
      }
    });
  }, [showNotification]);

  const showGeneralNotification = useCallback(async (title: string, message: string, data?: any) => {
    return await showNotification(title, {
      body: message,
      icon: '/assets/trato-logo.png',
      badge: '/assets/trato-logo.png',
      tag: 'general-notification',
      data: {
        type: 'general',
        ...data
      }
    });
  }, [showNotification]);

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    showOrderNotification,
    showDeliveryNotification,
    showGeneralNotification,
    canNotify: supported && permission === 'granted'
  };
}
