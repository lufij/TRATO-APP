import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: 'order' | 'message' | 'system' | 'rating' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

interface UseNotificationReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'user_id' | 'read' | 'created_at'>) => Promise<void>;
  isTableAvailable: boolean;
}

export function useNotification(): UseNotificationReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTableAvailable, setIsTableAvailable] = useState<boolean>(false);

  // Check if notifications table exists and is properly configured
  const checkTableAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('notifications')
        .select('count', { count: 'exact', head: true });

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703') {
          console.log('notifications table is not available:', error.code);
          return false;
        }
        console.warn('notifications table check error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('notifications table availability check failed:', error);
      return false;
    }
  }, []);

  // Fetch notifications from the database
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Check table availability first
    const tableAvailable = await checkTableAvailability();
    setIsTableAvailable(tableAvailable);
    
    if (!tableAvailable) {
      console.log('notifications table not available, using empty state');
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, checkTableAvailability]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user || !isTableAvailable) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Unexpected error marking notification as read:', error);
    }
  }, [user, isTableAvailable]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user || !isTableAvailable) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Unexpected error marking all notifications as read:', error);
    }
  }, [user, isTableAvailable]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user || !isTableAvailable) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Unexpected error deleting notification:', error);
    }
  }, [user, isTableAvailable]);

  // Add notification - gracefully handle when table doesn't exist
  const addNotification = useCallback(async (
    notification: Omit<Notification, 'id' | 'user_id' | 'read' | 'created_at'>
  ) => {
    if (!user) return;

    // If table is not available, just log the notification locally
    if (!isTableAvailable) {
      console.log('Would add notification (table not available):', notification);
      
      // Add to local state with a temporary ID
      const localNotification: Notification = {
        id: `local-${Date.now()}`,
        user_id: user.id,
        read: false,
        created_at: new Date().toISOString(),
        ...notification
      };
      
      setNotifications(prev => [localNotification, ...prev.slice(0, 49)]); // Keep max 50
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            ...notification,
            user_id: user.id,
            read: false,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding notification:', error);
        return;
      }

      if (data) {
        setNotifications(prev => [data, ...prev]);
      }
    } catch (error) {
      console.error('Unexpected error adding notification:', error);
    }
  }, [user, isTableAvailable]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Fetch notifications when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up real-time subscription for notifications (only if table is available)
  useEffect(() => {
    if (!user || !isTableAvailable) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time notification update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === payload.new.id 
                  ? payload.new as Notification
                  : notif
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => 
              prev.filter(notif => notif.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isTableAvailable]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    addNotification,
    isTableAvailable
  };
}