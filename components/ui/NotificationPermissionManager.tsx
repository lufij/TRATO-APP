import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertTriangle, CheckCircle } from 'lucide-react';

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
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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
        // Test notification
        new Notification('¡TRATO Notificaciones Activas!', {
          body: 'Las notificaciones están funcionando correctamente',
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

  if (notificationPermission === 'granted') {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-700 ${className}`}>
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span>Notificaciones activas</span>
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Configurar Notificaciones</h3>
            <p className="text-sm text-gray-600">
              {notificationPermission === 'denied' 
                ? 'Notificaciones bloqueadas' 
                : 'Activa las notificaciones para recibir alertas'}
            </p>
          </div>
        </div>
        
        {notificationPermission !== 'denied' && (
          <button
            onClick={requestPermission}
            disabled={isRequesting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isRequesting ? 'Activando...' : 'Activar'}
          </button>
        )}
      </div>

      {notificationPermission === 'denied' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">
            Las notificaciones están bloqueadas. Para activarlas, haz clic en el ícono del candado en la barra de direcciones y selecciona "Permitir".
          </p>
        </div>
      )}
    </div>
  );
}
