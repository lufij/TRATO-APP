import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { 
  Bell, 
  CheckCircle, 
  ShoppingCart, 
  Truck, 
  Star,
  Package,
  Clock,
  User,
  Store,
  AlertCircle,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

interface FloatingNotificationProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  index: number;
}

function FloatingNotification({ notification, onDismiss, index }: FloatingNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const autoRemoveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mostrar notificación con animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100 + index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  // Auto-eliminación después de 5 minutos
  useEffect(() => {
    autoRemoveTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      if (autoRemoveTimerRef.current) {
        clearTimeout(autoRemoveTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = () => {
    if (autoRemoveTimerRef.current) {
      clearTimeout(autoRemoveTimerRef.current);
    }
    setIsRemoving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      new_order: ShoppingCart,
      order_accepted: CheckCircle,
      order_ready: Package,
      order_assigned: User,
      order_picked_up: Truck,
      order_in_transit: Truck,
      order_delivered: CheckCircle,
      order_completed: Star,
      order_cancelled: AlertCircle,
      order_rejected: AlertCircle,
      promotion: Store,
      new_product: Package,
      message: Bell,
      system: AlertCircle,
      rating: Star,
      general: Bell
    };
    return iconMap[type as keyof typeof iconMap] || Bell;
  };

  const getNotificationColor = (type: string) => {
    const colorMap = {
      new_order: 'bg-blue-500',
      order_accepted: 'bg-green-500',
      order_ready: 'bg-orange-500',
      order_assigned: 'bg-purple-500',
      order_picked_up: 'bg-indigo-500',
      order_in_transit: 'bg-indigo-500',
      order_delivered: 'bg-green-500',
      order_completed: 'bg-gray-500',
      order_cancelled: 'bg-red-500',
      order_rejected: 'bg-red-500',
      promotion: 'bg-yellow-500',
      new_product: 'bg-pink-500',
      message: 'bg-blue-500',
      system: 'bg-gray-500',
      rating: 'bg-yellow-500',
      general: 'bg-gray-500'
    };
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-500';
  };

  // Manejo de gestos táctiles
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !isDragging) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;
    setDragOffset(diff);
    setTouchEnd(currentTouch);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    // Si el deslizamiento es suficiente, eliminar notificación
    if (Math.abs(distance) > minSwipeDistance) {
      handleDismiss();
    } else {
      // Regresar a posición original
      setDragOffset(0);
    }
    
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Manejo de gestos con mouse (para escritorio)
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStart || !isDragging) return;
    
    const diff = e.clientX - touchStart;
    setDragOffset(diff);
    setTouchEnd(e.clientX);
  };

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      handleDismiss();
    } else {
      setDragOffset(0);
    }
    
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);

  return (
    <div
      ref={notificationRef}
      className={`
        fixed top-4 left-4 right-4 z-50 transform transition-all duration-300 ease-out
        ${isVisible && !isRemoving ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        ${isDragging ? 'transition-none' : ''}
      `}
      style={{
        transform: `translateY(${isVisible && !isRemoving ? index * 80 : -100}px) translateX(${dragOffset}px)`,
        opacity: isDragging ? Math.max(0.5, 1 - Math.abs(dragOffset) / 200) : (isVisible && !isRemoving ? 1 : 0)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Card className="bg-white shadow-lg border-l-4 border-orange-500 cursor-grab active:cursor-grabbing select-none">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icono */}
            <div className={`p-2 rounded-full ${colorClass} text-white flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            
            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                {notification.title}
              </h4>
              <p className="text-gray-700 text-sm">
                {notification.message}
              </p>
            </div>

            {/* Botón cerrar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Indicador de deslizamiento */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>Desliza para eliminar</span>
            <span>Auto-eliminar en 5min</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FloatingNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isTableAvailable, setIsTableAvailable] = useState<boolean>(false);

  // Verificar disponibilidad de la tabla
  const checkTableAvailability = async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .select('recipient_id, type, title, message, is_read, created_at')
        .limit(1);

      if (error) {
        console.warn('notifications table is not available:', error.code);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('notifications table availability check failed:', error);
      return false;
    }
  };

  // Cargar notificaciones
  const fetchNotifications = async () => {
    if (!user || !isTableAvailable) return;

    try {
      // Solo obtener notificaciones no leídas de las últimas 24 horas
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5); // Máximo 5 notificaciones flotantes

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error);
    }
  };

  // Marcar notificación como leída al eliminarla
  const handleDismissNotification = async (notificationId: string) => {
    // Eliminar visualmente inmediatamente
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Marcar como leída en la base de datos
    if (isTableAvailable) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  // Inicialización
  useEffect(() => {
    const initialize = async () => {
      const available = await checkTableAvailability();
      setIsTableAvailable(available);
      
      if (available) {
        await fetchNotifications();
      }
    };

    initialize();
  }, [user?.id]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!isTableAvailable || !user) return;

    const channel = supabase
      .channel('floating-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isTableAvailable]);

  // Auto-refrescar cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      if (isTableAvailable) {
        fetchNotifications();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isTableAvailable]);

  if (!isTableAvailable || notifications.length === 0) {
    return null;
  }

  return (
    <>
      {notifications.map((notification, index) => (
        <FloatingNotification
          key={notification.id}
          notification={notification}
          onDismiss={handleDismissNotification}
          index={index}
        />
      ))}
    </>
  );
}
