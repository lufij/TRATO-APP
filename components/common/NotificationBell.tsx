import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, BellDot, Volume2, VolumeX } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
        console.log('🔋 Wake Lock activado - pantalla permanecerá activa');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔋 Wake Lock liberado');
        });
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

  // � FUNCIÓN DE SONIDO POTENTE REUTILIZABLE
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

      // Reproducir 2 veces
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

  // �🔊 SONIDO PARA NOTIFICACIONES (especialmente para vendedores)
  const playNotificationSound = useCallback(async (notificationType: string) => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      await audioContext.resume();

      // 🚨 SONIDO SUPER FUERTE - Múltiples osciladores simultáneos
      const playPowerfulTone = (frequency: number, duration: number, delay: number = 0, volume: number = 1.0) => {
        setTimeout(() => {
          // CREAR 3 OSCILADORES SIMULTÁNEOS PARA SONIDO MÁS FUERTE
          for (let i = 0; i < 3; i++) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Frecuencias ligeramente diferentes para sonido más rico y fuerte
            oscillator.frequency.setValueAtTime(frequency + (i * 5), audioContext.currentTime);
            oscillator.type = 'square'; // Onda cuadrada = más fuerte
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime); // Volumen máximo
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
          }
        }, delay);
      };

      // 🎵 SECUENCIA COMPLETA DE SONIDO (se ejecuta 2 veces)
      const playFullSequence = (sequenceDelay = 0) => {
        if (notificationType === 'new_order' && user?.role === 'vendedor') {
          // 🚨 SECUENCIA SÚPER CRÍTICA PARA VENDEDORES - 4 tonos fuertes
          playPowerfulTone(900, 600, sequenceDelay + 0, 1.0);     // Tono grave fuerte
          playPowerfulTone(1100, 600, sequenceDelay + 500, 1.0);  // Tono medio fuerte  
          playPowerfulTone(1300, 600, sequenceDelay + 1000, 1.0); // Tono agudo fuerte
          playPowerfulTone(1500, 800, sequenceDelay + 1500, 1.0); // Tono súper agudo MÁS largo
        } else if (notificationType === 'order_assigned' && user?.role === 'repartidor') {
          // 🚚 SECUENCIA FUERTE PARA REPARTIDORES - 3 tonos fuertes
          playPowerfulTone(1000, 500, sequenceDelay + 0, 1.0);
          playPowerfulTone(1200, 500, sequenceDelay + 400, 1.0);
          playPowerfulTone(1000, 700, sequenceDelay + 800, 1.0);
        } else {
          // 🔔 SECUENCIA ESTÁNDAR PERO FUERTE - 2 tonos fuertes
          playPowerfulTone(800, 600, sequenceDelay + 0, 1.0);
          playPowerfulTone(1000, 700, sequenceDelay + 500, 1.0);
        }
      };

      // 🔄 REPRODUCIR SECUENCIA 2 VECES
      playFullSequence(0);      // Primera vez inmediatamente
      playFullSequence(3000);   // Segunda vez después de 3 segundos

      // 📳 VIBRACIÓN SÚPER INTENSA (también 2 veces)
      if ('vibrate' in navigator) {
        if (notificationType === 'new_order') {
          // PATRÓN LARGO E INTENSO - 2 veces
          navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
          setTimeout(() => {
            navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
          }, 3000);
        } else if (notificationType === 'order_assigned') {
          // PATRÓN MEDIO INTENSO - 2 veces  
          navigator.vibrate([300, 120, 300, 120, 500]);
          setTimeout(() => {
            navigator.vibrate([300, 120, 300, 120, 500]);
          }, 3000);
        } else {
          // PATRÓN ESTÁNDAR INTENSO - 2 veces
          navigator.vibrate([250, 100, 250, 100, 400]);
          setTimeout(() => {
            navigator.vibrate([250, 100, 250, 100, 400]);
          }, 3000);
        }
      }

      console.log('🔊 Sonido SÚPER FUERTE reproducido 2 VECES para:', notificationType);
    } catch (error) {
      console.error('Error reproduciendo sonido:', error);
    }
  }, [soundEnabled, user?.role]);

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
            await requestWakeLock(); // Activar Wake Lock cuando se conceden permisos
            console.log('🔔 Permisos de notificación y sonido activados automáticamente para vendedor');
            console.log('🔋 Wake Lock solicitado para mantener pantalla activa');
          }
        } else if (Notification.permission === 'granted') {
          setSoundEnabled(true);
          await requestWakeLock(); // Activar Wake Lock si ya hay permisos
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
  }, [user?.id]);

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
            const notification = new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `trato-${newNotification.type}`,
              requireInteraction: true, // CRÍTICO: No se cierra automáticamente
              silent: false, // IMPORTANTE: Con sonido del sistema
              data: {
                type: newNotification.type,
                id: newNotification.id,
                timestamp: Date.now()
              }
            });

            // Manejar clicks en la notificación
            notification.onclick = () => {
              window.focus();
              setIsOpen(true); // Abrir panel de notificaciones
              notification.close();
            };

            // Para vendedores: notificación crítica que no se cierra
            if (newNotification.type === 'new_order' && user?.role === 'vendedor') {
              // No cerrar automáticamente las notificaciones críticas
            } else {
              // Cerrar automáticamente otras notificaciones después de 10 segundos
              setTimeout(() => {
                if (notification) notification.close();
              }, 10000);
            }
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
        <button className="relative rounded-full p-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          {unreadCount > 0 ? (
            <BellDot className="h-6 w-6 text-gray-700" />
          ) : (
            <Bell className="h-6 w-6 text-gray-600" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-white border border-gray-200 shadow-lg" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              {/* Control de sonido para vendedores y repartidores */}
              {(user?.role === 'vendedor' || user?.role === 'repartidor') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="flex items-center gap-1 text-xs"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400">OFF</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => {
                  const badgeInfo = getNotificationBadge(notification.type);
                  return (
                    <div key={notification.id} className={`p-4 ${!notification.is_read ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeInfo.color}`}>
                            {badgeInfo.label}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-sm text-gray-500 mb-2">No tienes notificaciones</p>
                <p className="text-xs text-gray-400">
                  Las notificaciones aparecerán aquí cuando las recibas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
