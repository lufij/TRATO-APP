import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, AlertTriangle, Zap, Timer } from 'lucide-react';

interface TimeoutAlert {
  orderId: string;
  status: string;
  timeSinceStatus: number; // minutos
  customerName: string;
  total: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface TimeoutAlertsProps {
  onAlert?: (alert: TimeoutAlert) => void;
}

export function TimeoutAlerts({ onAlert }: TimeoutAlertsProps) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<TimeoutAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // 🚨 FUNCIONALIDAD FALTANTE: Monitoreo de tiempos límite por estado
  const checkTimeoutAlerts = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase.from('orders').select('*');
      
      // Filtrar órdenes según el rol
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
        default:
          return;
      }

      // Solo órdenes activas
      query = query.in('status', ['pending', 'accepted', 'ready', 'assigned', 'picked-up', 'in-transit']);
      
      const { data: orders } = await query;
      if (!orders) return;

      const now = new Date();
      const newAlerts: TimeoutAlert[] = [];

      orders.forEach(order => {
        const createdAt = new Date(order.created_at);
        const acceptedAt = order.accepted_at ? new Date(order.accepted_at) : null;
        const readyAt = order.ready_at ? new Date(order.ready_at) : null;
        const assignedAt = order.status === 'assigned' ? new Date(order.updated_at) : null;
        const pickedUpAt = order.picked_up_at ? new Date(order.picked_up_at) : null;

        let referenceTime = createdAt;
        let timeLimitMinutes = 0;
        let urgencyLevel: TimeoutAlert['urgencyLevel'] = 'low';

        // 🚨 DEFINIR LÍMITES DE TIEMPO POR ESTADO
        switch (order.status) {
          case 'pending':
            // Vendedor debe aceptar en 10 minutos
            referenceTime = createdAt;
            timeLimitMinutes = 10;
            if (user.role === 'vendedor') {
              const minutesSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60);
              if (minutesSince > 15) urgencyLevel = 'critical';
              else if (minutesSince > 12) urgencyLevel = 'high';
              else if (minutesSince > 8) urgencyLevel = 'medium';
            }
            break;

          case 'accepted':
            // Vendedor debe marcar como listo en 30 minutos (según tipo de entrega)
            referenceTime = acceptedAt || createdAt;
            timeLimitMinutes = order.delivery_type === 'dine-in' ? 25 : 30;
            if (user.role === 'vendedor') {
              const minutesSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60);
              if (minutesSince > timeLimitMinutes + 15) urgencyLevel = 'critical';
              else if (minutesSince > timeLimitMinutes + 10) urgencyLevel = 'high';
              else if (minutesSince > timeLimitMinutes) urgencyLevel = 'medium';
            }
            break;

          case 'ready':
            referenceTime = readyAt || createdAt;
            if (order.delivery_type === 'pickup') {
              // Cliente debe recoger en 20 minutos
              timeLimitMinutes = 20;
              if (user.role === 'comprador') {
                const minutesSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60);
                if (minutesSince > 30) urgencyLevel = 'critical';
                else if (minutesSince > 25) urgencyLevel = 'high';
                else if (minutesSince > 15) urgencyLevel = 'medium';
              }
            } else if (order.delivery_type === 'delivery') {
              // Debe asignarse repartidor en 15 minutos
              timeLimitMinutes = 15;
              const minutesSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60);
              if (minutesSince > 25) urgencyLevel = 'critical';
              else if (minutesSince > 20) urgencyLevel = 'high';
              else if (minutesSince > 15) urgencyLevel = 'medium';
            }
            break;

          case 'assigned':
            // Repartidor debe recoger en 15 minutos
            referenceTime = assignedAt || readyAt || createdAt;
            timeLimitMinutes = 15;
            if (user.role === 'repartidor') {
              const minutesSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60);
              if (minutesSince > 25) urgencyLevel = 'critical';
              else if (minutesSince > 20) urgencyLevel = 'high';
              else if (minutesSince > 15) urgencyLevel = 'medium';
            }
            break;

          case 'picked-up':
          case 'in-transit':
            // Debe entregar en 45 minutos máximo
            referenceTime = pickedUpAt || assignedAt || readyAt || createdAt;
            timeLimitMinutes = 45;
            const minutesSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60);
            if (minutesSince > 60) urgencyLevel = 'critical';
            else if (minutesSince > 50) urgencyLevel = 'high';
            else if (minutesSince > 40) urgencyLevel = 'medium';
            break;
        }

        const timeSinceStatus = (now.getTime() - referenceTime.getTime()) / (1000 * 60);

        // Solo crear alerta si ha excedido el tiempo mínimo
        if (timeSinceStatus > timeLimitMinutes && urgencyLevel !== 'low') {
          newAlerts.push({
            orderId: order.id,
            status: order.status,
            timeSinceStatus: Math.floor(timeSinceStatus),
            customerName: order.customer_name || 'Cliente',
            total: order.total,
            urgencyLevel
          });
        }
      });

      setAlerts(newAlerts);

      // Notificar nuevas alertas críticas
      newAlerts
        .filter(alert => alert.urgencyLevel === 'critical')
        .forEach(alert => {
          onAlert?.(alert);
          console.error(`🚨 ALERTA CRÍTICA: Orden ${alert.orderId.slice(-6)} en estado ${alert.status} por ${alert.timeSinceStatus} minutos`);
        });

    } catch (error) {
      console.error('Error checking timeout alerts:', error);
    }
  }, [user, onAlert]);

  // 🚨 NUEVA FUNCIONALIDAD: Auto-notificación de órdenes críticas
  const notifyCriticalTimeouts = useCallback(async (criticalAlerts: TimeoutAlert[]) => {
    if (!user || criticalAlerts.length === 0) return;

    try {
      for (const alert of criticalAlerts) {
        // Obtener información de la orden para notificar a todas las partes
        const { data: orderData } = await supabase
          .from('orders')
          .select('buyer_id, seller_id, driver_id')
          .eq('id', alert.orderId)
          .single();

        if (!orderData) continue;

        const notifications = [];

        // Notificaciones específicas por estado
        switch (alert.status) {
          case 'pending':
            // Notificar vendedor sobre orden no aceptada
            notifications.push({
              recipient_id: orderData.seller_id,
              type: 'order_timeout_critical',
              title: '🚨 ORDEN CRÍTICA',
              message: `Orden pendiente por ${alert.timeSinceStatus} minutos - ACEPTAR URGENTE`,
              data: { order_id: alert.orderId, timeout_minutes: alert.timeSinceStatus }
            });
            
            // Notificar comprador
            notifications.push({
              recipient_id: orderData.buyer_id,
              type: 'order_delay',
              title: 'Demora en tu pedido',
              message: `Tu pedido está tardando más de lo esperado. Te mantendremos informado.`,
              data: { order_id: alert.orderId }
            });
            break;

          case 'accepted':
            // Notificar vendedor sobre preparación lenta
            notifications.push({
              recipient_id: orderData.seller_id,
              type: 'preparation_timeout',
              title: '⏰ PREPARACIÓN LENTA',
              message: `Orden en preparación por ${alert.timeSinceStatus} minutos`,
              data: { order_id: alert.orderId, timeout_minutes: alert.timeSinceStatus }
            });
            break;

          case 'ready':
            if (alert.timeSinceStatus > 20) {
              // Notificar comprador sobre pickup pendiente
              notifications.push({
                recipient_id: orderData.buyer_id,
                type: 'pickup_reminder',
                title: '📦 Tu pedido está listo',
                message: `Tu pedido lleva ${alert.timeSinceStatus} minutos esperando ser recogido`,
                data: { order_id: alert.orderId, waiting_minutes: alert.timeSinceStatus }
              });
            }
            break;
        }

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
    } catch (error) {
      console.error('Error sending critical timeout notifications:', error);
    }
  }, [user]);

  // Configurar monitoreo automático
  useEffect(() => {
    if (!user) return;

    setIsMonitoring(true);
    
    // Verificación inicial
    checkTimeoutAlerts();

    // Verificar cada 2 minutos
    const interval = setInterval(checkTimeoutAlerts, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [user, checkTimeoutAlerts]);

  // Enviar notificaciones para alertas críticas
  useEffect(() => {
    const criticalAlerts = alerts.filter(alert => alert.urgencyLevel === 'critical');
    if (criticalAlerts.length > 0) {
      notifyCriticalTimeouts(criticalAlerts);
    }
  }, [alerts, notifyCriticalTimeouts]);

  const getAlertColor = (urgency: TimeoutAlert['urgencyLevel']) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getAlertIcon = (urgency: TimeoutAlert['urgencyLevel']) => {
    switch (urgency) {
      case 'critical': return <Zap className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      default: return <Timer className="w-4 h-4" />;
    }
  };

  const getStatusMessage = (alert: TimeoutAlert) => {
    switch (alert.status) {
      case 'pending':
        return `Esperando aceptación por ${alert.timeSinceStatus} min`;
      case 'accepted':
        return `En preparación por ${alert.timeSinceStatus} min`;
      case 'ready':
        return `Listo por ${alert.timeSinceStatus} min`;
      case 'assigned':
        return `Repartidor asignado hace ${alert.timeSinceStatus} min`;
      case 'picked-up':
      case 'in-transit':
        return `En camino por ${alert.timeSinceStatus} min`;
      default:
        return `En estado ${alert.status} por ${alert.timeSinceStatus} min`;
    }
  };

  if (!isMonitoring || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Clock className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Alertas de tiempo ({alerts.length})
        </h3>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.orderId}
            className={`border rounded-lg p-3 ${getAlertColor(alert.urgencyLevel)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {getAlertIcon(alert.urgencyLevel)}
                <div>
                  <p className="font-medium">
                    {alert.customerName} - Q{alert.total.toFixed(2)}
                  </p>
                  <p className="text-sm">
                    {getStatusMessage(alert)}
                  </p>
                  <p className="text-xs opacity-75">
                    Orden #{alert.orderId.slice(-6)}
                  </p>
                </div>
              </div>
              
              {alert.urgencyLevel === 'critical' && (
                <div className="flex items-center space-x-1 text-red-600">
                  <span className="text-xs font-bold">URGENTE</span>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
