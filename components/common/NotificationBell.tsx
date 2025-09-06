import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, BellDot } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface Notification {
  id: string;
  created_at: string;
  message: string;
  is_read: boolean;
  order_id: string;
  type: 'order_accepted' | 'order_rejected' | 'order_ready' | 'order_in_transit';
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    const unread = data?.filter(n => !n.is_read).length || 0;
    setUnreadCount(unread);
  };

  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          // You might want to show a toast notification here as well
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (!open && unreadCount > 0) {
      // Mark all as read when the popover closes
      setUnreadCount(0);
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
        
        // Update local state to reflect the change
        setNotifications(prev => 
          prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
        );
      }
    }
  };
  
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffSeconds < 60) return `hace ${diffSeconds}s`;
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `hace ${diffMinutes}m`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `hace ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `hace ${diffDays}d`;

    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          {unreadCount > 0 ? (
            <BellDot className="h-6 w-6 text-gray-700" />
          ) : (
            <Bell className="h-6 w-6 text-gray-600" />
          )}
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white border border-gray-200 shadow-lg" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900">Notificaciones</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-3 ${!notification.is_read ? 'bg-blue-50' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Badge variant={notification.type === 'order_accepted' ? 'default' : 'destructive'}>
                          {notification.type === 'order_accepted' ? 'Aceptada' : 'Rechazada'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 p-6 bg-white">No tienes notificaciones.</p>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
