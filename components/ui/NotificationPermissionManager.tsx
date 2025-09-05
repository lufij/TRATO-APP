import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';

interface NotificationPermissionManagerProps {
  onPermissionChange?: (hasPermission: boolean) => void;
  userRole?: 'buyer' | 'seller' | 'driver';
  className?: string;
}

export function NotificationPermissionManager({ 
  onPermissionChange,
  userRole = 'buyer',
  className = ''
}: NotificationPermissionManagerProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { icon: CheckCircle, color: 'text-green-600', text: 'Notificaciones activas' };
      case 'denied':
        return { icon: BellOff, color: 'text-red-600', text: 'Notificaciones bloqueadas' };
      default:
        return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Permisos pendientes' };
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones');
      return;
    }

    if (notificationPermission === 'granted') return;

    setIsRequesting(true);
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        onPermissionChange?.(true);
        
        // Enviar notificación de prueba
        new Notification('¡TRATO Notificaciones Activas!', {
          body: `${userRole === 'buyer' ? 'Recibirás actualizaciones de tus pedidos' : 
                 userRole === 'seller' ? 'Recibirás alertas de nuevos pedidos' : 
                 'Recibirás notificaciones de entregas'}`,
          icon: '/favicon.ico'
        });
      } else {
        onPermissionChange?.(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const testNotification = () => {
    if (notificationPermission !== 'granted') return;
    
    new Notification('🧪 Prueba de Notificación', {
      body: 'Las notificaciones están funcionando correctamente',
      icon: '/favicon.ico'
    });
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  if (notificationPermission === 'granted') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <StatusIcon className="w-4 h-4 text-green-600" />
        <span className="text-green-700">Notificaciones activas</span>
        <Button 
          size="sm" 
          variant="outline"
          onClick={testNotification}
          className="text-xs"
        >
          Probar
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Configurar Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className="text-sm font-medium">{status.text}</span>
          </div>
          <Badge variant={notificationPermission === 'granted' ? 'default' : 'secondary'}>
            {notificationPermission === 'granted' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        {notificationPermission !== 'granted' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {userRole === 'buyer' ? 
                'Activa las notificaciones para recibir actualizaciones de tus pedidos en tiempo real' :
                userRole === 'seller' ?
                'Activa las notificaciones para no perder ningún pedido nuevo' :
                'Activa las notificaciones para recibir entregas asignadas'
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={requestPermission}
            disabled={isRequesting || notificationPermission === 'granted'}
            className="flex-1"
          >
            {isRequesting ? 'Solicitando...' : 'Activar Notificaciones'}
          </Button>
          
          {notificationPermission === 'granted' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={testNotification}
            >
              <Volume2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
        return { icon: BellOff, color: 'text-red-600', text: 'Notificaciones bloqueadas' };
      default:
        return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Activar notificaciones' };
    }
  };

  const getRoleText = () => {
    switch (userRole) {
      case 'seller':
        return 'vendedor';
      case 'driver':
        return 'repartidor';
      default:
        return 'comprador';
    }
  };

  // Para compradores: solo mostrar si están activadas o si se especifica explícitamente
  if (userRole === 'buyer' && !showForBuyers && notificationPermission !== 'granted') {
    return null;
  }

  const status = getPermissionStatus();
  const StatusIcon = status.icon;ckCircle } from 'lucide-react';

interface NotificationPermissionManagerProps {
  onPermissionChange?: (hasPermission: boolean) => void;
  userRole?: 'buyer' | 'seller' | 'driver'; // Añadir rol de usuario
  showForBuyers?: boolean; // Control para compradores
}

export function NotificationPermissionManager({ 
  onPermissionChange, 
  userRole = 'buyer',
  showForBuyers = false 
}: NotificationPermissionManagerProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [audioSupported, setAudioSupported] = useState(false);
  const [vibrationSupported, setVibrationSupported] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = () => {
    // Verificar permisos de notificación
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      onPermissionChange?.(Notification.permission === 'granted');
    }

    // Verificar soporte de audio
    const audioSupport = 'AudioContext' in window || 'webkitAudioContext' in window;
    setAudioSupported(audioSupport);

    // Verificar soporte de vibración
    const vibrationSupport = 'vibrate' in navigator;
    setVibrationSupported(vibrationSupport);

    // Solo mostrar banner para vendedores y repartidores, o si se especifica para compradores
    const shouldShow = userRole !== 'buyer' || showForBuyers;
    const shouldShowBanner = shouldShow && (Notification.permission === 'default' || Notification.permission === 'denied');
    setShowBanner(shouldShowBanner);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        onPermissionChange?.(permission === 'granted');
        
        if (permission === 'granted') {
          setShowBanner(false);
          // Solo mostrar notificación de prueba para vendedores y repartidores
          if (userRole !== 'buyer') {
            new Notification('¡Notificaciones Activadas!', {
              body: 'Ahora recibirás alertas de nuevos pedidos',
              icon: '/favicon.ico'
            });
          }
        }
      } catch (error) {
        console.error('Error solicitando permisos de notificación:', error);
      }
    }
  };

  const testAudioNotification = () => {
    try {
      if (audioSupported) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Crear tono de prueba
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        console.log('🔊 Sonido de prueba reproducido');
      }
      
      if (vibrationSupported) {
        navigator.vibrate([200, 100, 200]);
        console.log('📳 Vibración de prueba activada');
      }
    } catch (error) {
      console.error('Error en prueba de audio/vibración:', error);
    }
  };

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { icon: CheckCircle, color: 'text-green-600', text: 'Notificaciones activas' };
      case 'denied':
        return { icon: BellOff, color: 'text-red-600', text: 'Notificaciones bloqueadas' };
      default:
        return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Activar notificaciones' };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  if (!showBanner && notificationPermission === 'granted') {
    // Solo mostrar indicador pequeño cuando los permisos están activos
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Notificaciones activas</span>
        </div>
        <button
          onClick={testAudioNotification}
          className="px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-xs transition-colors w-full sm:w-auto"
          title="Probar sonido y vibración"
        >
          🔊 Probar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
      {/* Mobile-First Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${status.color}`} />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">� Configuración de Notificaciones</h3>
            <p className="text-xs sm:text-sm text-gray-600">{status.text}</p>
          </div>
        </div>

        {/* Mobile-Friendly Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto text-sm"
            >
              <Bell className="w-4 h-4" />
              ✅ Activar Notificaciones
            </button>
          )}
          
          <button
            onClick={testAudioNotification}
            className="px-4 py-3 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto text-sm disabled:opacity-50"
            disabled={!audioSupported && !vibrationSupported}
          >
            <Volume2 className="w-4 h-4" />
            🔊 Probar Sonido
          </button>
        </div>
      </div>

      {/* Mobile-Optimized Status Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
          {notificationPermission === 'granted' ? (
            <Bell className="w-4 h-4 text-green-600" />
          ) : (
            <BellOff className="w-4 h-4 text-gray-400" />
          )}
          <span className={`text-xs ${notificationPermission === 'granted' ? 'text-green-600' : 'text-gray-500'}`}>
            📢 Alertas del navegador
          </span>
        </div>

        <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
          {audioSupported ? (
            <Volume2 className="w-4 h-4 text-green-600" />
          ) : (
            <VolumeX className="w-4 h-4 text-gray-400" />
          )}
          <span className={`text-xs ${audioSupported ? 'text-green-600' : 'text-gray-500'}`}>
            🔊 Sonidos de alerta
          </span>
        </div>

        <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
          {vibrationSupported ? (
            <div className="w-4 h-4 bg-green-600 rounded animate-pulse" />
          ) : (
            <div className="w-4 h-4 bg-gray-400 rounded" />
          )}
          <span className={`text-xs ${vibrationSupported ? 'text-green-600' : 'text-gray-500'}`}>
            📳 Vibración (móvil)
          </span>
        </div>
      </div>

      {notificationPermission === 'denied' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <strong>🚫 Las notificaciones están bloqueadas.</strong> Para activarlas:
          </p>
          <ul className="text-xs sm:text-sm text-red-600 mt-2 ml-4 list-disc">
            <li>📱 En móvil: Ve a Configuración del navegador</li>
            <li>🖥️ En computadora: Haz clic en el candado de la URL</li>
            <li>✅ Selecciona "Permitir" para notificaciones</li>
            <li>🔄 Recarga esta página</li>
          </ul>
        </div>
      )}

      {notificationPermission === 'default' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>🔔 ¡Activa las notificaciones para no perderte ningún pedido!</strong>
          </p>
          <p className="text-xs sm:text-sm text-yellow-600 mt-1">
            📬 Recibirás alertas inmediatas cuando lleguen nuevos pedidos.
          </p>
        </div>
      )}
    </div>
  );
}
