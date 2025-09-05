import React, { useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, Clock, MapPin, Package, TrendingUp } from 'lucide-react';

interface CriticalNotificationProps {
  onNotification?: (type: string, message: string) => void;
}

export function CriticalNotifications({ onNotification }: CriticalNotificationProps) {
  const { user } = useAuth();

  // 🚨 NOTIFICACIÓN 1: Stock crítico para vendedores
  const setupStockAlerts = useCallback(async () => {
    if (!user || user.role !== 'vendedor') return;

    try {
      // Suscribirse a cambios de stock
      const stockSubscription = supabase
        .channel('stock-alerts')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'products',
            filter: `seller_id=eq.${user.id}`
          },
          (payload) => {
            const { old: oldProduct, new: newProduct } = payload;
            
            // Stock crítico (< 5)
            if (newProduct.stock <= 5 && oldProduct.stock > 5) {
              console.warn(`⚠️ Stock bajo: ${newProduct.name} (${newProduct.stock} restantes)`);
              onNotification?.('stock_low', `Stock bajo: ${newProduct.name}`);
            }
            
            // Stock agotado
            if (newProduct.stock === 0 && oldProduct.stock > 0) {
              console.error(`🚫 AGOTADO: ${newProduct.name}`);
              onNotification?.('stock_out', `Producto agotado: ${newProduct.name}`);
            }
          }
        )
        .subscribe();

      return () => stockSubscription.unsubscribe();
    } catch (error) {
      console.error('Error setting up stock alerts:', error);
    }
  }, [user, onNotification]);

  // 🚨 NOTIFICACIÓN 2: Órdenes por tiempo excedido
  const setupTimeoutAlerts = useCallback(async () => {
    if (!user) return;

    const checkTimeouts = async () => {
      try {
        let query = supabase.from('orders').select('*');
        
        switch (user.role) {
          case 'vendedor':
            query = query.eq('seller_id', user.id);
            break;
          case 'comprador':
            query = query.eq('buyer_id', user.id);
            break;
          case 'repartidor':
            query = query.eq('driver_id', user.id);
            break;
        }

        const { data: orders } = await query;
        
        if (!orders) return;

        const now = new Date();
        
        orders.forEach(order => {
          const createdAt = new Date(order.created_at);
          const timeDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60); // minutos
          
          // Orden pendiente > 10 minutos
          if (order.status === 'pending' && timeDiff > 10 && user.role === 'vendedor') {
            console.warn(`⏰ Orden pendiente desde hace ${Math.floor(timeDiff)} min`);
            onNotification?.('order_timeout', `Orden #${order.id.slice(-6)} pendiente`);
          }
          
          // Preparación > 30 minutos
          if (order.status === 'accepted' && timeDiff > 30) {
            console.error(`🕒 Orden en preparación desde hace ${Math.floor(timeDiff)} min`);
            onNotification?.('preparation_timeout', `Preparación excedida: #${order.id.slice(-6)}`);
          }
          
          // Lista para pickup > 15 minutos
          if (order.status === 'ready' && order.delivery_type === 'pickup' && timeDiff > 45) {
            if (user.role === 'comprador') {
              console.warn(`📦 Tu pedido está listo desde hace ${Math.floor(timeDiff)} min`);
            }
          }
        });
        
      } catch (error) {
        console.error('Error checking timeouts:', error);
      }
    };

    // Verificar cada 5 minutos
    const interval = setInterval(checkTimeouts, 5 * 60 * 1000);
    checkTimeouts(); // Primera verificación inmediata
    
    return () => clearInterval(interval);
  }, [user, onNotification]);

  // 🚨 NOTIFICACIÓN 3: Alertas de ubicación para repartidores
  const setupLocationAlerts = useCallback(async () => {
    if (!user || user.role !== 'repartidor') return;

    // Escuchar órdenes asignadas
    const locationSubscription = supabase
      .channel('location-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'orders',
          filter: `driver_id=eq.${user.id}`
        },
        (payload) => {
          const order = payload.new;
          
          // Notificar cuando se asigna una entrega
          if (order.status === 'assigned' && payload.old.status !== 'assigned') {
            console.log(`🚚 Nueva entrega asignada: ${order.delivery_address}`);
            onNotification?.('delivery_assigned', `Nueva entrega: ${order.customer_name}`);
          }
        }
      )
      .subscribe();

    return () => locationSubscription.unsubscribe();
  }, [user, onNotification]);

  // 🚨 NOTIFICACIÓN 4: Monitoreo de sistema para admins
  const setupSystemAlerts = useCallback(async () => {
    // Comentado por ahora - no hay rol admin en el sistema actual
    if (!user) return;

    const checkSystemHealth = async () => {
      try {
        // Verificar repartidores disponibles - CORREGIDO: usar misma lógica que OnlineDriversIndicator
        const { data: availableDrivers } = await supabase
          .from('drivers')
          .select('id')
          .eq('is_online', true)
          .eq('is_active', true)
          .eq('is_verified', true);

        if (!availableDrivers || availableDrivers.length === 0) {
          console.error('🚨 CRÍTICO: No hay repartidores disponibles');
          onNotification?.('no_drivers', 'Sin repartidores disponibles');
        }

        // Verificar órdenes acumuladas
        const { data: pendingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('status', 'ready');

        if (pendingOrders && pendingOrders.length > 10) {
          console.warn(`📊 ALERTA: ${pendingOrders.length} órdenes esperando entrega`);
          onNotification?.('high_volume', `${pendingOrders.length} órdenes pendientes`);
        }

      } catch (error) {
        console.error('Error checking system health:', error);
      }
    };

    // Verificar cada 3 minutos
    const interval = setInterval(checkSystemHealth, 3 * 60 * 1000);
    checkSystemHealth();
    
    return () => clearInterval(interval);
  }, [user, onNotification]);

  // 🚨 NOTIFICACIÓN 5: Alertas de productos del día
  const setupDailyProductAlerts = useCallback(async () => {
    if (!user || user.role !== 'vendedor') return;

    try {
      // Verificar productos del día que expiran hoy
      const today = new Date().toISOString().split('T')[0];
      
      const { data: dailyProducts } = await supabase
        .from('daily_products')
        .select('*')
        .eq('seller_id', user.id)
        .eq('date', today)
        .lt('stock', 10); // Stock bajo en productos del día

      if (dailyProducts && dailyProducts.length > 0) {
        dailyProducts.forEach(product => {
          if (product.stock <= 3) {
            console.warn(`⏰ Producto del día agotándose: ${product.name} (${product.stock} left)`);
          }
        });
      }

    } catch (error) {
      console.error('Error checking daily products:', error);
    }
  }, [user, onNotification]);

  // Configurar escucha de eventos personalizados críticos
  useEffect(() => {
    const handleCriticalNotification = (event: CustomEvent) => {
      const { type, message, data } = event.detail;
      console.log(`🔥 Notificación crítica recibida: ${type} - ${message}`, data);
      
      // Ejecutar callback de notificación
      onNotification?.(type, message);
      
      // Sonido crítico para nuevos pedidos
      if (type === 'new_order') {
        // Crear sonido sintético con Web Audio API
        const playNotificationSound = () => {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Crear secuencia de tonos
            const playTone = (frequency: number, duration: number, delay: number = 0) => {
              setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
              }, delay);
            };
            
            // Secuencia de notificación: tres tonos ascendentes
            playTone(800, 0.2, 0);
            playTone(1000, 0.2, 300);
            playTone(1200, 0.3, 600);
            
          } catch (error) {
            console.warn('No se pudo reproducir sonido con Web Audio API:', error);
            
            // Fallback: vibración en móviles
            if (navigator.vibrate) {
              navigator.vibrate([300, 100, 300, 100, 300]);
            }
          }
        };
        
        // Reproducir sonido inmediatamente y repetir para asegurar notificación
        playNotificationSound();
        setTimeout(playNotificationSound, 2000);
      }
    };

    window.addEventListener('criticalNotification', handleCriticalNotification as EventListener);
    
    return () => {
      window.removeEventListener('criticalNotification', handleCriticalNotification as EventListener);
    };
  }, [onNotification]);

  // Configurar todas las alertas críticas
  useEffect(() => {
    if (!user) return;

    const cleanupFunctions: (() => void)[] = [];

    // Configurar alertas según el rol
    const setupAlerts = async () => {
      const stockCleanup = await setupStockAlerts();
      const timeoutCleanup = await setupTimeoutAlerts();
      const locationCleanup = await setupLocationAlerts();
      const systemCleanup = await setupSystemAlerts();
      
      // Configurar productos del día (sin retorno)
      setupDailyProductAlerts();

      if (stockCleanup) cleanupFunctions.push(stockCleanup);
      if (timeoutCleanup) cleanupFunctions.push(timeoutCleanup);
      if (locationCleanup) cleanupFunctions.push(locationCleanup);
      if (systemCleanup) cleanupFunctions.push(systemCleanup);
    };

    setupAlerts();

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [user, setupStockAlerts, setupTimeoutAlerts, setupLocationAlerts, setupSystemAlerts, setupDailyProductAlerts]);

  return null; // Este componente no renderiza nada, solo maneja notificaciones
}

// Hook para usar las notificaciones críticas
export function useCriticalNotifications() {
  const [notifications, setNotifications] = React.useState<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
  }>>([]);

  const handleNotification = useCallback((type: string, message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Mantener últimas 50
  }, []);

  return {
    notifications,
    handleNotification
  };
}
