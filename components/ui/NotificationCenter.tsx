import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Bell, 
  BellRing,
  Check,
  CheckCircle,
  Clock,
  Truck,
  ShoppingCart,
  XCircle,
  Package,
  RefreshCw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Suscribirse a notificaciones en tiempo real
    const subscription = supabase
      .channel('user_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user?.id}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        
        // Mostrar toast para nuevas notificaciones
        toast.info(newNotification.title, {
          description: newNotification.message
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId);
    
    try {
      const { data, error } = await supabase
        .rpc('mark_notification_read', {
          p_notification_id: notificationId
        });

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );

    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Error al marcar como leída');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Error al marcar todas como leídas');
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      new_order: ShoppingCart,
      order_accepted: CheckCircle,
      order_rejected: XCircle,
      order_ready: Package,
      driver_assigned: Truck,
      order_picked_up: Package,
      order_in_transit: Truck,
      order_delivered: CheckCircle,
      delivery_available: Truck,
      default: Bell
    };

    return iconMap[type as keyof typeof iconMap] || iconMap.default;
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseColors = {
      new_order: 'text-blue-600',
      order_accepted: 'text-green-600',
      order_rejected: 'text-red-600',
      order_ready: 'text-orange-600',
      driver_assigned: 'text-purple-600',
      order_picked_up: 'text-indigo-600',
      order_in_transit: 'text-purple-600',
      order_delivered: 'text-green-600',
      delivery_available: 'text-blue-600',
      default: 'text-gray-600'
    };

    const color = baseColors[type as keyof typeof baseColors] || baseColors.default;
    return isRead ? color.replace('-600', '-400') : color;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)} d`;
  };

  const renderNotification = (notification: Notification) => {
    const Icon = getNotificationIcon(notification.type);
    const iconColor = getNotificationColor(notification.type, notification.is_read);
    const isMarkingThisAsRead = markingAsRead === notification.id;

    return (
      <Card 
        key={notification.id} 
        className={`mb-3 cursor-pointer transition-all hover:shadow-md ${
          !notification.is_read ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
        }`}
        onClick={() => !notification.is_read && markAsRead(notification.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              !notification.is_read ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-medium text-sm ${
                  !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {notification.title}
                </h4>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(notification.created_at)}
                  </span>
                  
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      disabled={isMarkingThisAsRead}
                      className="h-6 w-6 p-0"
                    >
                      {isMarkingThisAsRead ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              <p className={`text-sm mt-1 ${
                !notification.is_read ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {notification.message}
              </p>

              {notification.data?.order_id && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Orden #{notification.data.order_id.slice(-8)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando notificaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5" />
          <h2 className="text-xl font-bold">Notificaciones</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes notificaciones
            </h3>
            <p className="text-gray-600">
              Las notificaciones importantes aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-2">
            {notifications.map(renderNotification)}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Hook para obtener el contador de notificaciones no leídas
export function useNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
        setCount(count || 0);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchCount();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('notification_count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  return count;
}
