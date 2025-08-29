import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, Package, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';

interface ToastNotification {
  id: string;
  type: 'new_order' | 'order_update' | 'general' | 'success' | 'warning';
  title: string;
  message: string;
  timestamp: string;
  autoRemove?: boolean;
}

interface MobileToastNotificationsProps {
  onNewOrder?: () => void;
}

export function MobileToastNotifications({ onNewOrder }: MobileToastNotificationsProps) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Audio for notifications
  const playNotificationSound = useCallback((type: string) => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (type === 'new_order') {
        // More notable sound for new orders (triple beep)
        [220, 330, 440].forEach((freq, index) => {
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
          }, index * 200);
        });
      } else {
        // Single beep for other notifications
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  }, []);

  // Add new toast
  const addToast = useCallback((notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = {
      ...notification,
      id,
      timestamp: new Date().toISOString(),
      autoRemove: notification.autoRemove !== false // Default to true
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Keep max 5 toasts

    // Play sound
    playNotificationSound(notification.type);

    // Auto-remove after 2 minutes if enabled
    if (newToast.autoRemove) {
      setTimeout(() => {
        removeToast(id);
      }, 120000); // 2 minutes
    }

    // Trigger callback for new orders
    if (notification.type === 'new_order' && onNewOrder) {
      onNewOrder();
    }
  }, [playNotificationSound, onNewOrder]);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Setup real-time subscription for new orders
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('seller-order-toasts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          const order = payload.new as any;
          addToast({
            type: 'new_order',
            title: '🛒 Nueva Orden',
            message: `Pedido de Q${order.total?.toFixed(2) || '0.00'} recibido`,
            autoRemove: true
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
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Only notify for status changes
          if (order.status !== oldOrder.status) {
            let message = '';
            let type: ToastNotification['type'] = 'order_update';
            
            switch (order.status) {
              case 'confirmed':
                message = 'Orden confirmada exitosamente';
                type = 'success';
                break;
              case 'ready':
                message = 'Orden lista para entrega';
                type = 'success';
                break;
              case 'delivered':
                message = 'Orden entregada exitosamente';
                type = 'success';
                break;
              case 'cancelled':
                message = 'Orden cancelada';
                type = 'warning';
                break;
              default:
                return; // Don't show toast for other status changes
            }

            addToast({
              type,
              title: '📋 Actualización de Orden',
              message,
              autoRemove: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, addToast]);

  // Get icon for toast type
  const getToastIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'new_order':
        return <ShoppingCart className="w-5 h-5 text-blue-600" />;
      case 'order_update':
        return <Package className="w-5 h-5 text-green-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get toast styling
  const getToastStyling = (type: ToastNotification['type']) => {
    switch (type) {
      case 'new_order':
        return 'bg-blue-50 border-blue-200 shadow-lg ring-2 ring-blue-500/20';
      case 'success':
        return 'bg-green-50 border-green-200 shadow-lg ring-2 ring-green-500/20';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 shadow-lg ring-2 ring-yellow-500/20';
      default:
        return 'bg-white border-gray-200 shadow-lg';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`
            ${getToastStyling(toast.type)}
            rounded-lg border p-4 pointer-events-auto
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right-2 fade-in-0
            ${index > 0 ? 'opacity-90 scale-95' : ''}
          `}
          style={{
            animationDelay: `${index * 100}ms`,
            transform: `translateY(${index * 4}px) scale(${1 - index * 0.05})`
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getToastIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {toast.title}
              </p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {toast.message}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(toast.timestamp).toLocaleTimeString('es-GT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Export hook for manual toast creation
export const useToastNotifications = () => {
  const addToast = useCallback((notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    // This will be handled by the main component
    window.dispatchEvent(new CustomEvent('addToast', { detail: notification }));
  }, []);

  return { addToast };
};
