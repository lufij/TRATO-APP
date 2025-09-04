import React, { useEffect, useState } from 'react';
import { NotificationBanner } from './NotificationBanner';
import { NotificationTester } from './NotificationTester';
import { MobileToastNotifications } from './MobileToastNotifications';
import { useAuth } from '../../contexts/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useSoundNotifications, NotificationSound } from '../../hooks/useSoundNotifications';

interface NotificationSystemProps {
  showBanner?: boolean;
  showTester?: boolean;
  enableAutoActivation?: boolean;
  className?: string;
}

export function NotificationSystem({ 
  showBanner = true, 
  showTester = false,
  enableAutoActivation = true,
  className = ""
}: NotificationSystemProps) {
  const { user } = useAuth();
  const { permission, requestPermission } = usePushNotifications();
  const { isEnabled: soundEnabled, toggleSounds, testSound } = useSoundNotifications();
  
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [autoActivationAttempted, setAutoActivationAttempted] = useState(false);

  // Auto-activation logic for critical roles
  useEffect(() => {
    if (!user || autoActivationAttempted || !enableAutoActivation) return;

    const isCriticalRole = user.role === 'vendedor' || user.role === 'repartidor';
    const needsActivation = permission !== 'granted' || !soundEnabled;
    
    if (isCriticalRole && needsActivation) {
      // Auto-request permissions after a short delay for better UX
      const timer = setTimeout(async () => {
        try {
          // Only auto-request if not explicitly denied
          if (permission === 'default') {
            await requestPermission();
          }
          
          // Auto-enable sounds for critical roles
          if (!soundEnabled) {
            toggleSounds(true);
          }
        } catch (error) {
          console.log('Auto-activation failed:', error);
        } finally {
          setAutoActivationAttempted(true);
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setAutoActivationAttempted(true);
    }
  }, [user, permission, soundEnabled, enableAutoActivation, autoActivationAttempted]);

  // Don't render anything if user is not authenticated
  if (!user) {
    return null;
  }

  const shouldShowBanner = showBanner && !bannerDismissed && (
    permission !== 'granted' || 
    !soundEnabled ||
    !autoActivationAttempted
  );

  return (
    <div className={`notification-system ${className}`}>
      {/* Banner for activation */}
      {shouldShowBanner && (
        <NotificationBanner onDismiss={() => setBannerDismissed(true)} />
      )}
      
      {/* Tester component for debugging */}
      {showTester && (
        <NotificationTester />
      )}
      
      {/* Toast notifications provider - always render */}
      <MobileToastNotifications />
    </div>
  );
}

// Hook for easy notification system integration
export function useNotificationSystem() {
  const { user } = useAuth();
  const { permission, requestPermission, showNotification } = usePushNotifications();
  const { isEnabled: soundEnabled, toggleSounds, testSound } = useSoundNotifications();
  
  // Check if system is ready
  const isReady = permission === 'granted' && soundEnabled;
  const needsSetup = !isReady && user;
  
  // Setup function for manual activation
  const setupNotifications = async (): Promise<boolean> => {
    try {
      // Request push permission
      const pushGranted = await requestPermission();
      if (!pushGranted) {
        throw new Error('Push notifications denied');
      }
      
      // Enable sounds
      if (!soundEnabled) {
        toggleSounds(true);
      }
      
      // Test the system
      if (user?.role === 'vendedor') {
        await testSound(NotificationSound.NEW_ORDER);
      } else if (user?.role === 'repartidor') {
        await testSound(NotificationSound.ORDER_ASSIGNED);
      }
      
      return true;
    } catch (error) {
      console.error('Notification setup failed:', error);
      return false;
    }
  };
  
  // Send notification (handles both push and sound)
  const notify = async (title: string, options?: {
    body?: string;
    sound?: NotificationSound;
    push?: boolean;
    data?: any;
  }) => {
    const { body, sound = NotificationSound.GENERAL, push = true, data } = options || {};
    
    try {
      // Play sound if enabled
      if (soundEnabled && sound) {
        await testSound(sound);
      }
      
      // Show push notification if enabled and permitted
      if (push && permission === 'granted') {
        await showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          data,
          tag: `notification-${Date.now()}`,
          requireInteraction: user?.role === 'vendedor' // Keep vendor notifications until clicked
        });
      }
    } catch (error) {
      console.error('Notification failed:', error);
    }
  };
  
  return {
    isReady,
    needsSetup,
    permission,
    soundEnabled,
    setupNotifications,
    notify,
    testSound: (type: NotificationSound) => testSound(type)
  };
}

// Utility function to get role-specific notification settings
export function getRoleNotificationConfig(role: string) {
  switch (role) {
    case 'vendedor':
      return {
        defaultSound: NotificationSound.NEW_ORDER,
        criticalNotifications: true,
        autoSetup: true,
        description: 'Recibe alertas sonoras de nuevos pedidos para no perder ventas'
      };
    
    case 'repartidor':
      return {
        defaultSound: NotificationSound.ORDER_ASSIGNED,
        criticalNotifications: true,
        autoSetup: true,
        description: 'Recibe notificaciones de nuevas entregas asignadas'
      };
    
    case 'comprador':
      return {
        defaultSound: NotificationSound.ORDER_READY,
        criticalNotifications: false,
        autoSetup: false,
        description: 'Mantente informado del estado de tus pedidos'
      };
    
    default:
      return {
        defaultSound: NotificationSound.GENERAL,
        criticalNotifications: false,
        autoSetup: false,
        description: 'Recibe notificaciones importantes'
      };
  }
}
