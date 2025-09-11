import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface Notification {
  id: string;
  created_at: string;
  title: string;
  message: string;
  is_read: boolean;
  type: 'new_order' | 'order_accepted' | 'order_rejected' | 'order_ready' | 'order_in_transit' | 'order_assigned' | 'order_delivered';
  data?: any;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<any>(null);

  // 🔋 WAKE LOCK para mantener pantalla activa
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && user?.role === 'vendedor') {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('🔋 Wake Lock activado para vendedor');
      }
    } catch (error) {
      console.error('Error activando Wake Lock:', error);
    }
  }, [user?.role]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('🔋 Wake Lock liberado manualmente');
    }
  }, []);

  // 🔊 FUNCIÓN DE SONIDO POTENTE REUTILIZABLE (2 repeticiones automáticas)
  const playPowerfulTone = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      await audioContext.resume();

      // 🔊 CREAR 3 OSCILADORES SIMULTÁNEOS PARA SONIDO MÁS FUERTE
      const createPowerfulTone = (frequency: number, duration: number, delay: number = 0, volume: number = 1.0) => {
        setTimeout(() => {
          for (let i = 0; i < 3; i++) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency + (i * 5), audioContext.currentTime);
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
          }
        }, delay);
      };

      // 🎵 SECUENCIA COMPLETA 2 VECES PARA VENDEDORES
      const playSequence = (sequenceDelay = 0) => {
        createPowerfulTone(900, 600, sequenceDelay + 0, 1.0);     // Grave fuerte
        createPowerfulTone(1100, 600, sequenceDelay + 500, 1.0);  // Medio fuerte  
        createPowerfulTone(1300, 600, sequenceDelay + 1000, 1.0); // Agudo fuerte
        createPowerfulTone(1500, 800, sequenceDelay + 1500, 1.0); // Súper agudo
      };

      // 🔄 REPRODUCIR 2 VECES
      playSequence(0);
      playSequence(3000);

      // 📳 VIBRACIÓN INTENSA 2 veces
      if ('vibrate' in navigator) {
        navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
        setTimeout(() => {
          navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
        }, 3000);
      }

      console.log('🚨 Sonido potente activado (2 repeticiones)');
    } catch (error) {
      console.error('❌ Error con sonido potente:', error);
    }
  }, []);

  // 🔊 SONIDO PARA NOTIFICACIONES - SIMPLIFICADO PARA USAR playPowerfulTone
  const playNotificationSound = useCallback(async (notificationType: string) => {
    if (!soundEnabled) return;
    
    try {
      // 🚨 USAR DIRECTAMENTE LA FUNCIÓN POTENTE (ya incluye 2 repeticiones)
      console.log('🔊 Activando sonido SÚPER FUERTE 2x para:', notificationType);
      await playPowerfulTone();
      
      console.log('✅ Sonido SÚPER FUERTE 2x completado');
    } catch (error) {
      console.error('Error reproduciendo sonido:', error);
    }
  }, [soundEnabled, playPowerfulTone]);

  // 🌐 EXPONER FUNCIÓN DE SONIDO GLOBALMENTE PARA SERVICE WORKER
  useEffect(() => {
    // Hacer la función disponible globalmente
    (window as any).playVendorNotificationSound = playPowerfulTone;
    
    return () => {
      delete (window as any).playVendorNotificationSound;
    };
  }, [playPowerfulTone]);

  // Solicitar permisos de notificación para vendedores automáticamente + Wake Lock
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (user?.role === 'vendedor' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setSoundEnabled(true);
            await requestWakeLock();
          }
        } else if (Notification.permission === 'granted') {
          setSoundEnabled(true);
          await requestWakeLock();
        }
      }
    };

    requestNotificationPermission();

    // Cleanup en unmount
    return () => {
      releaseWakeLock();
    };
  }, [user?.role, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      setupRealtimeSubscription();
      
      // 🔊 Escuchar mensajes del Service Worker para Push Notifications
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        console.log('📨 Mensaje del Service Worker recibido:', event.data);
        
        if (event.data?.type === 'PLAY_POWERFUL_NOTIFICATION') {
          // Reproducir sonido potente cuando llega push con app abierta
          playNotificationSound(event.data.soundType || 'new_order');
          
          // Mostrar toast si tenemos los datos
          if (event.data.payload) {
            const { title, body } = event.data.payload;
            toast.info(title || '🔔 Nueva Notificación', {
              description: body || 'Tienes una nueva actualización',
              duration: 8000
            });
          }
        } else if (event.data?.type === 'PUSH_RECEIVED') {
          // Manejar push recibido - actualizar UI si es necesario
          console.log('📨 Push recibido con app abierta:', event.data.payload);
          fetchNotifications(); // Recargar notificaciones
        }
      };

      // Registrar listener del Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }

      // Cleanup
      return () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        }
      };
    }
  }, [user?.id, playNotificationSound]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
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
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // 🔊 Reproducir sonido para la notificación
          playNotificationSound(newNotification.type);
          
          // 📱 Mostrar notificación del navegador MEJORADA
          if (Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'trato-notification',
              requireInteraction: true,
            } as any);
          }
          
          // 🍞 Toast notification
          toast(newNotification.title, {
            description: newNotification.message,
          });
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
      }
    }
  };
  
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffSeconds < 60) return 'Ahora';
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes}m`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return `${Math.floor(diffHours / 24)}d`;
    } catch {
      return 'Ahora';
    }
  };

  const getNotificationBadge = (type: string) => {
    const badges: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline', label: string, color: string }> = {
      'new_order': { variant: 'default' as const, label: '🛒 Nueva Orden', color: 'bg-green-100 text-green-800' },
      'order_accepted': { variant: 'default' as const, label: '✅ Aceptada', color: 'bg-green-100 text-green-800' },
      'order_rejected': { variant: 'destructive' as const, label: '❌ Rechazada', color: 'bg-red-100 text-red-800' },
      'order_ready': { variant: 'secondary' as const, label: '📦 Lista', color: 'bg-blue-100 text-blue-800' },
      'order_in_transit': { variant: 'secondary' as const, label: '🚚 En Camino', color: 'bg-yellow-100 text-yellow-800' },
      'order_assigned': { variant: 'secondary' as const, label: '👤 Asignada', color: 'bg-purple-100 text-purple-800' },
      'order_delivered': { variant: 'default' as const, label: '🎉 Entregada', color: 'bg-green-100 text-green-800' },
    };
    return badges[type] || { variant: 'outline' as const, label: 'Notificación', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Notificaciones</h4>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0"
                title={soundEnabled ? "Desactivar sonidos" : "Activar sonidos"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {notifications.map((notification) => {
                const badge = getNotificationBadge(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      notification.is_read ? 'bg-gray-50' : 'bg-white border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </div>
                      <span className="text-xs text-gray-500">{formatTime(notification.created_at)}</span>
                    </div>
                    
                    <h5 className="font-medium text-sm mb-1">{notification.title}</h5>
                    <p className="text-xs text-gray-600 leading-relaxed">{notification.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
