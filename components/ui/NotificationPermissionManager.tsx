import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, AlertTriangle, CheckCircle } from 'lucide-react';

interface NotificationPermissionManagerProps {
  onPermissionChange?: (hasPermission: boolean) => void;
}

export function NotificationPermissionManager({ onPermissionChange }: NotificationPermissionManagerProps) {
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

    // Mostrar banner si no hay permisos
    const shouldShowBanner = Notification.permission === 'default' || Notification.permission === 'denied';
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
          // Mostrar notificación de prueba
          new Notification('¡Notificaciones Activadas!', {
            body: 'Ahora recibirás alertas de nuevos pedidos',
            icon: '/favicon.ico'
          });
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
        return { icon: CheckCircle, color: 'text-green-600', text: 'Permisos concedidos' };
      case 'denied':
        return { icon: BellOff, color: 'text-red-600', text: 'Permisos bloqueados' };
      default:
        return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Permisos pendientes' };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  if (!showBanner && notificationPermission === 'granted') {
    // Solo mostrar indicador pequeño cuando los permisos están activos
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
        <CheckCircle className="w-4 h-4" />
        <span>Notificaciones activas</span>
        <button
          onClick={testAudioNotification}
          className="ml-2 px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-xs transition-colors"
        >
          Probar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${status.color}`} />
          <div>
            <h3 className="font-semibold text-gray-900">Configuración de Notificaciones</h3>
            <p className="text-sm text-gray-600">{status.text}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {notificationPermission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Activar Notificaciones
            </button>
          )}
          
          <button
            onClick={testAudioNotification}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            disabled={!audioSupported && !vibrationSupported}
          >
            <Volume2 className="w-4 h-4" />
            Probar Sonido
          </button>
        </div>
      </div>

      {/* Estado detallado de capacidades */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          {notificationPermission === 'granted' ? (
            <Bell className="w-4 h-4 text-green-600" />
          ) : (
            <BellOff className="w-4 h-4 text-gray-400" />
          )}
          <span className={notificationPermission === 'granted' ? 'text-green-600' : 'text-gray-500'}>
            Notificaciones del navegador
          </span>
        </div>

        <div className="flex items-center gap-2">
          {audioSupported ? (
            <Volume2 className="w-4 h-4 text-green-600" />
          ) : (
            <VolumeX className="w-4 h-4 text-gray-400" />
          )}
          <span className={audioSupported ? 'text-green-600' : 'text-gray-500'}>
            Sonidos de alerta
          </span>
        </div>

        <div className="flex items-center gap-2">
          {vibrationSupported ? (
            <div className="w-4 h-4 bg-green-600 rounded" />
          ) : (
            <div className="w-4 h-4 bg-gray-400 rounded" />
          )}
          <span className={vibrationSupported ? 'text-green-600' : 'text-gray-500'}>
            Vibración (móvil)
          </span>
        </div>
      </div>

      {notificationPermission === 'denied' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <strong>Las notificaciones están bloqueadas.</strong> Para activarlas:
          </p>
          <ul className="text-sm text-red-600 mt-2 ml-4 list-disc">
            <li>Haz clic en el ícono de candado en la barra de direcciones</li>
            <li>Selecciona "Permitir" para notificaciones</li>
            <li>Recarga la página</li>
          </ul>
        </div>
      )}

      {notificationPermission === 'default' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            <strong>¡Activa las notificaciones para no perderte ningún pedido!</strong>
          </p>
          <p className="text-sm text-yellow-600 mt-1">
            Recibirás alertas inmediatas cuando lleguen nuevos pedidos.
          </p>
        </div>
      )}
    </div>
  );
}
