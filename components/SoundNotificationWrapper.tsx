import React, { useEffect, useState, useCallback } from 'react';
import { useAdvancedSoundNotifications, NotificationSound } from '../hooks/useAdvancedSoundNotifications';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Bell, Volume2, VolumeX, Settings, TestTube, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface SoundNotificationWrapperProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  type: 'order' | 'message' | 'system';
  title: string;
  message: string;
  data: {
    notification_type: string;
    sound_type: string;
    priority?: 'low' | 'medium' | 'high';
    order_id?: string;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
}

export function SoundNotificationWrapper({ children }: SoundNotificationWrapperProps) {
  const { user } = useAuth();
  const {
    isEnabled,
    config,
    playAdvancedSound,
    testSound,
    toggleSounds,
    setVolume,
    toggleVibration,
    isAudioSupported,
    isVibrationSupported
  } = useAdvancedSoundNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar notificaciones no leídas
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const notifs = data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }, [user]);

  // Marcar notificación como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }, []);

  // Procesar nueva notificación
  const processNotification = useCallback(async (notification: Notification) => {
    console.log('🔔 Nueva notificación:', notification);

    // Determinar tipo de sonido basado en los datos
    let soundType = NotificationSound.GENERAL;
    if (notification.data.sound_type === 'new_order') {
      soundType = NotificationSound.NEW_ORDER;
    } else if (notification.data.sound_type === 'driver_assigned') {
      soundType = NotificationSound.ORDER_ASSIGNED;
    } else if (notification.data.sound_type === 'order_delivered') {
      soundType = NotificationSound.ORDER_DELIVERED;
    } else if (notification.data.sound_type === 'order_ready') {
      soundType = NotificationSound.ORDER_READY;
    }

    // Reproducir sonido
    playAdvancedSound(soundType);

    // Mostrar toast
    toast(notification.title, {
      description: notification.message,
      duration: 5000,
    });

    // Actualizar lista de notificaciones
    setNotifications(prev => [notification, ...prev.slice(0, 19)]);
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, [playAdvancedSound]);

  // Configurar suscripción en tiempo real
  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          const notification = payload.new as Notification;
          await processNotification(notification);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log(`🔗 Suscripción de notificaciones: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user, processNotification]);

  // Función de prueba
  const testNotification = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .insert([
          {
            recipient_id: user.id,
            type: 'order',
            title: '🧪 Prueba de Sonido',
            message: 'Esta es una notificación de prueba del sistema de sonidos',
            data: {
              notification_type: 'test',
              sound_type: 'new_order',
              priority: 'high'
            },
            is_read: false
          }
        ]);

      toast.success('Notificación de prueba enviada');
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      toast.error('Error enviando notificación de prueba');
    }
  }, [user]);

  // Activar audio al cargar
  useEffect(() => {
    const activateAudio = async () => {
      if (!isAudioSupported) return;
      
      try {
        // Reproducir sonido de prueba silencioso para activar contexto
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioContext.resume();
        audioContext.close();
        console.log('🔊 Audio activado automáticamente');
      } catch (error) {
        console.warn('⚠️ No se pudo activar el audio automáticamente:', error);
      }
    };

    setTimeout(activateAudio, 1000);
  }, [isAudioSupported]);

  // Cargar datos inicial
  useEffect(() => {
    if (!user) return;

    loadNotifications();
    const cleanup = setupRealtimeSubscription();
    
    return cleanup;
  }, [user, loadNotifications, setupRealtimeSubscription]);

  // Solicitar permisos de notificación
  useEffect(() => {
    const requestPermissions = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('✅ Permisos de notificación concedidos');
        }
      }
    };

    requestPermissions();
  }, []);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}

      {/* ICONOS DE PRUEBA REMOVIDOS - Los iconos Bell y Volume2 que estaban 
          en la esquina superior derecha han sido eliminados para no interferir 
          con el botón de cerrar sesión. El sistema de notificaciones sigue 
          funcionando normalmente a través de los paneles internos. */}

      {/* Panel de configuración de sonido */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-gray-200 shadow-xl">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Settings className="w-5 h-5" />
                Configuración de Sonido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 bg-white text-gray-900">{/* Activar/Desactivar sonidos */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Notificaciones sonoras</label>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={toggleSounds}
                />
              </div>

              {/* Control de volumen */}
              {isEnabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    Volumen ({Math.round(config.volume * 100)}%)
                  </label>
                  <Slider
                    value={[config.volume]}
                    onValueChange={([volume]) => setVolume(volume)}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
              )}

              {/* Vibración */}
              {isVibrationSupported && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Vibración (móvil)</label>
                  <Switch
                    checked={config.enableVibration}
                    onCheckedChange={toggleVibration}
                  />
                </div>
              )}

              <Separator />

              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  onClick={() => testSound(NotificationSound.NEW_ORDER)}
                  variant="outline"
                  className="flex-1"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Probar Sonido
                </Button>
                <Button
                  onClick={testNotification}
                  variant="outline"
                  className="flex-1"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Prueba Real
                </Button>
              </div>

              <Button
                onClick={() => setShowSettings(false)}
                className="w-full"
              >
                Cerrar
              </Button>

              {/* Estado de conexión */}
              <div className="text-center text-sm text-muted-foreground">
                Estado: {isConnected ? (
                  <span className="text-green-600 font-medium">Conectado ✓</span>
                ) : (
                  <span className="text-red-600 font-medium">Desconectado ✗</span>
                )}
              </div>

              {/* Info de soporte */}
              <div className="text-xs text-gray-600 space-y-1">
                <div>Audio: {isAudioSupported ? '✓' : '✗'}</div>
                <div>Vibración: {isVibrationSupported ? '✓' : '✗'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Panel de notificaciones */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-96 bg-white border border-gray-200 shadow-xl">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Bell className="w-5 h-5" />
                Notificaciones
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-600 py-4">
                    No hay notificaciones
                  </p>
                ) : (
                  notifications.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        notification.is_read 
                          ? 'bg-gray-50 border-gray-200 text-gray-700' 
                          : 'bg-blue-50 border-blue-200 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          >
                            Marcar leída
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowNotifications(false)}
                  className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Indicador de desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white px-3 py-1 rounded text-xs z-40">
          Audio: {isEnabled ? 'ON' : 'OFF'} | {isConnected ? 'Conectado' : 'Desconectado'}
        </div>
      )}
    </div>
  );
}
