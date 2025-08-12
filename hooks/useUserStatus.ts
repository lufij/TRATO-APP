import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

type UserStatus = 'online' | 'offline' | 'away';

interface UseUserStatusReturn {
  currentStatus: UserStatus;
  setStatus: (status: UserStatus) => Promise<void>;
  getUserStatus: (userId: string) => Promise<UserStatus | null>;
  isStatusAvailable: boolean;
  onlineUsers: string[];
}

export function useUserStatus(): UseUserStatusReturn {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<UserStatus>('offline');
  const [isStatusAvailable, setIsStatusAvailable] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Check if status column exists in users table
  const checkStatusAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('users')
        .select('status')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703') {
          console.log('users.status column is not available:', error.code);
          return false;
        }
        console.warn('users.status check error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('users.status availability check failed:', error);
      return false;
    }
  }, []);

  // Set user status
  const setStatus = useCallback(async (status: UserStatus) => {
    if (!user || !isStatusAvailable) {
      console.log(`Would set status to ${status} (not available)`);
      setCurrentStatus(status);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user status:', error);
        return;
      }

      setCurrentStatus(status);
      console.log(`User status updated to: ${status}`);
    } catch (error) {
      console.error('Unexpected error updating user status:', error);
    }
  }, [user, isStatusAvailable]);

  // Get specific user status
  const getUserStatus = useCallback(async (userId: string): Promise<UserStatus | null> => {
    if (!isStatusAvailable) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting user status:', error);
        return null;
      }

      return (data?.status as UserStatus) || 'offline';
    } catch (error) {
      console.error('Unexpected error getting user status:', error);
      return null;
    }
  }, [isStatusAvailable]);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    if (!isStatusAvailable) {
      setOnlineUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('status', 'online');

      if (error) {
        console.error('Error fetching online users:', error);
        return;
      }

      setOnlineUsers(data?.map(u => u.id) || []);
    } catch (error) {
      console.error('Unexpected error fetching online users:', error);
    }
  }, [isStatusAvailable]);

  // Initialize status availability and current user status
  useEffect(() => {
    const initializeStatus = async () => {
      const available = await checkStatusAvailability();
      setIsStatusAvailable(available);

      if (available && user) {
        // Get current user status
        const status = await getUserStatus(user.id);
        if (status) {
          setCurrentStatus(status);
        }
        
        // Set to online when component mounts
        await setStatus('online');
        
        // Fetch online users
        await fetchOnlineUsers();
      }
    };

    initializeStatus();
  }, [user, checkStatusAvailability, getUserStatus, setStatus, fetchOnlineUsers]);

  // Set up real-time subscription for user status changes
  useEffect(() => {
    if (!isStatusAvailable || !user) return;

    const channel = supabase
      .channel('user-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `status=in.(online,offline,away)`
        },
        (payload) => {
          console.log('User status change detected:', payload);
          
          // Update online users list
          fetchOnlineUsers();
          
          // Update current user status if it's our own status change
          if (payload.new.id === user.id) {
            setCurrentStatus(payload.new.status as UserStatus);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isStatusAvailable, fetchOnlineUsers]);

  // Handle page visibility changes
  useEffect(() => {
    if (!isStatusAvailable || !user) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, set to away after 5 minutes
        setTimeout(() => {
          if (document.hidden) {
            setStatus('away');
          }
        }, 5 * 60 * 1000); // 5 minutes
      } else {
        // Page is visible, set back to online
        setStatus('online');
      }
    };

    const handleBeforeUnload = () => {
      // Set to offline when page unloads
      setStatus('offline');
    };

    const handleFocus = () => {
      setStatus('online');
    };

    const handleBlur = () => {
      // Set to away after 2 minutes of inactivity
      setTimeout(() => {
        if (!document.hasFocus()) {
          setStatus('away');
        }
      }, 2 * 60 * 1000); // 2 minutes
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Set to offline when component unmounts
      setStatus('offline');
    };
  }, [user, isStatusAvailable, setStatus]);

  return {
    currentStatus,
    setStatus,
    getUserStatus,
    isStatusAvailable,
    onlineUsers
  };
}