import React from 'react';
import { SellerDashboard } from './SellerDashboard';
import { NotificationPermissionManager } from './NotificationPermissionManager';
import { FloatingNotifications, useFloatingNotifications } from './FloatingNotifications';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { useEffect, useCallback } from 'react';

export function EnhancedSellerDashboard() {
  const { user } = useAuth();
  const { 
    notifications: floatingNotifications, 
    addNotification, 
    removeNotification 
  } = useFloatingNotifications();

  // Función mejorada para reproducir sonido
  const playNotificationSound = useCallback(async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Sonido de campana más profesional
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
      oscillator1.type = 'sine';
      
      oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.3);
      oscillator2.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.2);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 1.2);
      oscillator2.start(audioContext.currentTime + 0.1);
      oscillator2.stop(audioContext.currentTime + 1.0);
      
      console.log('🔊 Sonido de pedido reproducido');
      
    } catch (error) {
      console.log('⚠️ Error con sonido:', error);
    }
  }, []);

  // Sistema de notificaciones en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Activando notificaciones para vendedor:', user.email);

    const channel = supabase
      .channel('seller-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🎯 Nuevo pedido recibido:', payload.new);
          
          const newOrder = payload.new;
          const total = parseFloat(newOrder.total || '0').toFixed(2);
          
          // Agregar notificación flotante
          addNotification({
            title: '🛒 Nuevo Pedido',
            message: `Orden por Q${total}${newOrder.notes ? ` - ${newOrder.notes}` : ''}`,
            orderData: newOrder,
            duration: 8000 // 8 segundos para dar tiempo de leer
          });
          
          // Reproducir sonido
          playNotificationSound();
          
          // Notificación del navegador si está permitida
          if (Notification.permission === 'granted') {
            const browserNotification = new Notification('🛒 Nuevo Pedido TRATO', {
              body: `Orden por Q${total}${newOrder.notes ? ` - ${newOrder.notes.substring(0, 50)}` : ''}`,
              icon: '/favicon.ico',
              tag: `trato-order-${newOrder.id}`,
              requireInteraction: true
            });

            setTimeout(() => {
              browserNotification.close();
            }, 10000);

            // Click en notificación para enfocar la ventana
            browserNotification.onclick = () => {
              window.focus();
              browserNotification.close();
            };
          }

          // Vibrar en móviles si está disponible
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
          }
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
          
          // Notificar cambios importantes de estado
          if (oldStatus !== newStatus && (newStatus === 'cancelled' || newStatus === 'delivered')) {
            const orderId = payload.new?.id?.toString().slice(-4) || 'N/A';
            const message = newStatus === 'cancelled' 
              ? `Orden #${orderId} cancelada`
              : `Orden #${orderId} marcada como entregada`;
            
            addNotification({
              title: newStatus === 'cancelled' ? '❌ Orden Cancelada' : '✅ Orden Entregada',
              message,
              orderData: payload.new,
              duration: 5000
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de notificaciones:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Escuchando nuevos pedidos');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Error en notificaciones:', status);
        }
      });

    return () => {
      console.log('🔄 Desconectando notificaciones');
      supabase.removeChannel(channel);
    };
  }, [user?.id, addNotification, playNotificationSound]);

  return (
    <>
      {/* Gestión de permisos - solo aparece si se necesita */}
      <NotificationPermissionManager />
      
      {/* Notificaciones flotantes */}
      <FloatingNotifications 
        notifications={floatingNotifications}
        onRemove={removeNotification}
      />
      
      {/* Dashboard original del vendedor */}
      <SellerDashboard />
    </>
  );
}
