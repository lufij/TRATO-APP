import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  isOnline: boolean;
  updateAvailable: boolean;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  update: () => Promise<void>;
  unregister: () => Promise<boolean>;
  showInstallPrompt: () => Promise<void>;
  canInstall: boolean;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    registration: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    updateAvailable: false
  });

  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Check if we're in a development environment (like Figma Make)
  const isDevelopment = () => {
    if (typeof window === 'undefined') return true;
    
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('figma') ||
      hostname.includes('preview') ||
      hostname.includes('dev') ||
      process.env.NODE_ENV === 'development'
    );
  };

  // Check if service worker is supported and not in development
  useEffect(() => {
    const isSupported = !isDevelopment() && 'serviceWorker' in navigator;
    setState(prev => ({ ...prev, isSupported }));
    
    if (isDevelopment()) {
      console.log('Service Worker disabled in development environment');
    }
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for install prompt (only in production)
  useEffect(() => {
    if (isDevelopment() || typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: any) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      setInstallPromptEvent(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setInstallPromptEvent(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker
  const register = async (): Promise<void> => {
    if (!state.isSupported || isDevelopment()) {
      if (isDevelopment()) {
        console.log('Service Worker registration skipped in development');
      } else {
        console.warn('Service Worker not supported');
      }
      return;
    }

    try {
      console.log('Registering Service Worker...');
      
      // First check if the service worker file exists
      const swResponse = await fetch('/sw.js', { method: 'HEAD' });
      if (!swResponse.ok) {
        console.warn('Service Worker file not found, skipping registration');
        return;
      }
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Service Worker update available');
              setState(prev => ({ ...prev, updateAvailable: true }));
            }
          });
        }
      });

      setState(prev => ({ 
        ...prev, 
        isRegistered: true, 
        registration 
      }));

    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      // Don't throw error, just log it
    }
  };

  // Update service worker
  const update = async (): Promise<void> => {
    if (state.registration) {
      try {
        await state.registration.update();
        
        // Tell the new service worker to skip waiting
        if (state.registration.waiting) {
          state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Reload the page to activate new service worker
        window.location.reload();
      } catch (error) {
        console.error('Service Worker update failed:', error);
      }
    }
  };

  // Unregister service worker
  const unregister = async (): Promise<boolean> => {
    if (state.registration) {
      try {
        const result = await state.registration.unregister();
        if (result) {
          setState(prev => ({ 
            ...prev, 
            isRegistered: false, 
            registration: null 
          }));
        }
        return result;
      } catch (error) {
        console.error('Service Worker unregistration failed:', error);
        return false;
      }
    }
    return false;
  };

  // Show install prompt
  const showInstallPrompt = async (): Promise<void> => {
    if (installPromptEvent) {
      try {
        const result = await installPromptEvent.prompt();
        console.log('Install prompt result:', result);
        
        if (result.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        setInstallPromptEvent(null);
        setCanInstall(false);
      } catch (error) {
        console.error('Install prompt failed:', error);
      }
    }
  };

  // Auto-register on mount (only in production)
  useEffect(() => {
    if (state.isSupported && !state.isRegistered && !isDevelopment()) {
      register();
    }
  }, [state.isSupported, state.isRegistered]);

  return {
    ...state,
    register,
    update,
    unregister,
    showInstallPrompt,
    canInstall
  };
}