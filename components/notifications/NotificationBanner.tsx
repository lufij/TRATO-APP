import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Bell, 
  Volume2, 
  X, 
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useSoundNotifications } from '../../hooks/useSoundNotifications';
import { supabase } from '../../utils/supabase/client';

interface NotificationBannerProps {
  onDismiss?: () => void;
}

export function NotificationBanner({ onDismiss }: NotificationBannerProps) {
  const { user } = useAuth();
  const { permission, requestPermission, canNotify } = usePushNotifications();
  const { isEnabled: soundEnabled, toggleSounds, testSound } = useSoundNotifications();
  
  const [dismissed, setDismissed] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [showDetails, setShowDetails] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Check if banner should be shown
  const shouldShow = !dismissed && (
    permission !== 'granted' || 
    !soundEnabled || 
    realtimeStatus === 'disconnected'
  );

  // Test realtime connection
  useEffect(() => {
    const testConnection = async () => {
      setRealtimeStatus('checking');
      
      try {
        const channel = supabase
          .channel('banner-test')
          .on('broadcast', { event: 'test' }, () => {
            setRealtimeStatus('connected');
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus('connected');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setRealtimeStatus('disconnected');
            }
          });

        // Cleanup after test
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 3000);
      } catch (error) {
        setRealtimeStatus('disconnected');
      }
    };

    if (user) {
      testConnection();
    }
  }, [user]);

  const handleActivateAll = async () => {
    setIsActivating(true);
    
    try {
      // 1. Request notification permission
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          alert('⚠️ Las notificaciones son necesarias para recibir pedidos. Por favor, permite las notificaciones en la configuración del navegador.');
          setIsActivating(false);
          return;
        }
      }

      // 2. Enable sounds
      if (!soundEnabled) {
        toggleSounds(true);
      }

      // 3. Test sound to activate audio context
      setTimeout(() => {
        testSound('general' as any);
      }, 500);

      // 4. Show success message
      setTimeout(() => {
        setDismissed(true);
        onDismiss?.();
      }, 1000);
      
    } catch (error) {
      console.error('Error activating notifications:', error);
      alert('Error al activar notificaciones. Inténtalo de nuevo.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (!shouldShow || !user) {
    return null;
  }

  const getStatusColor = () => {
    if (permission === 'granted' && soundEnabled && realtimeStatus === 'connected') {
      return 'bg-green-50 border-green-200';
    }
    if (permission === 'denied') {
      return 'bg-red-50 border-red-200';
    }
    return 'bg-orange-50 border-orange-200';
  };

  const getStatusIcon = () => {
    if (permission === 'granted' && soundEnabled && realtimeStatus === 'connected') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (permission === 'denied') {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    return <Bell className="w-5 h-5 text-orange-600" />;
  };

  const getRoleMessage = () => {
    switch (user.role) {
      case 'vendedor':
        return {
          title: '🔔 Activa las notificaciones para no perder ventas',
          description: 'Recibirás alertas sonoras cada vez que llegue un nuevo pedido'
        };
      case 'repartidor':
        return {
          title: '🚚 Activa las notificaciones para nuevas entregas',
          description: 'Te avisaremos cuando haya pedidos listos para entregar'
        };
      case 'comprador':
        return {
          title: '📱 Activa las notificaciones para seguir tus pedidos',
          description: 'Te mantendremos informado del estado de tus órdenes'
        };
      default:
        return {
          title: '🔔 Activa las notificaciones',
          description: 'Mantente informado de actualizaciones importantes'
        };
    }
  };

  const { title, description } = getRoleMessage();

  return (
    <Card className={`mx-4 my-2 shadow-lg ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                {title}
              </h3>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">
              {description}
            </p>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge 
                variant={permission === 'granted' ? 'default' : 'destructive'}
                className="text-xs"
              >
                <Bell className="w-3 h-3 mr-1" />
                {permission === 'granted' ? 'Permisos ✓' : 'Sin permisos'}
              </Badge>
              
              <Badge 
                variant={soundEnabled ? 'default' : 'secondary'}
                className="text-xs"
              >
                <Volume2 className="w-3 h-3 mr-1" />
                {soundEnabled ? 'Sonido ✓' : 'Sin sonido'}
              </Badge>
              
              <Badge 
                variant={realtimeStatus === 'connected' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {realtimeStatus === 'connected' ? (
                  <Wifi className="w-3 h-3 mr-1" />
                ) : (
                  <WifiOff className="w-3 h-3 mr-1" />
                )}
                {realtimeStatus === 'connected' ? 'Tiempo real ✓' : 
                 realtimeStatus === 'checking' ? 'Verificando...' : 'Sin conexión'}
              </Badge>
            </div>

            {/* Detailed status */}
            {showDetails && (
              <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span>Notificaciones del navegador:</span>
                  <span className={permission === 'granted' ? 'text-green-600' : 'text-red-600'}>
                    {permission === 'granted' ? '✅ Activadas' : 
                     permission === 'denied' ? '❌ Bloqueadas' : '⏳ Pendientes'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sonidos:</span>
                  <span className={soundEnabled ? 'text-green-600' : 'text-gray-600'}>
                    {soundEnabled ? '✅ Activados' : '⏹️ Desactivados'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Conexión en tiempo real:</span>
                  <span className={realtimeStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
                    {realtimeStatus === 'connected' ? '✅ Conectado' : 
                     realtimeStatus === 'checking' ? '🔄 Verificando' : '❌ Desconectado'}
                  </span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {permission !== 'granted' || !soundEnabled ? (
                <Button
                  onClick={handleActivateAll}
                  disabled={isActivating}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2"
                >
                  {isActivating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Activando...
                    </div>
                  ) : (
                    'Activar Notificaciones'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="text-sm px-4 py-2"
                >
                  Todo configurado ✓
                </Button>
              )}

              {realtimeStatus === 'disconnected' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-xs"
                >
                  Reconectar
                </Button>
              )}
            </div>

            {/* HTTPS warning */}
            {typeof window !== 'undefined' && !window.location.protocol.startsWith('https') && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                ⚠️ Las notificaciones requieren HTTPS. En desarrollo usa: https://localhost:5173
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
