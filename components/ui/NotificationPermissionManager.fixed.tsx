import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';

interface NotificationPermissionManagerProps {
  onPermissionChange?: (hasPermission: boolean) => void;
  userRole?: 'buyer' | 'seller' | 'driver';
  showForBuyers?: boolean;
  className?: string;
}

export function NotificationPermissionManager({ 
  onPermissionChange,
  userRole = 'buyer',
  showForBuyers = false,
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
      onPermissionChange?.(permission === 'granted');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const testNotification = () => {
    if (notificationPermission === 'granted') {
      const notification = new Notification(`Prueba - ${getRoleText()}`, {
        body: 'Las notificaciones están funcionando correctamente.',
        icon: '/icon-192x192.png',
        tag: 'test-notification'
      });

      if (soundEnabled) {
        // Play notification sound if available
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {
          // Fallback to system sound
        });
      }

      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  };

  // Para compradores: solo mostrar si están activadas o si se especifica explícitamente
  if (userRole === 'buyer' && !showForBuyers && notificationPermission !== 'granted') {
    return null;
  }

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={`border-gray-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notificaciones para {getRoleText()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className="text-sm font-medium">{status.text}</span>
          </div>
          <Badge 
            variant={notificationPermission === 'granted' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {notificationPermission === 'granted' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        {notificationPermission !== 'granted' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Activa las notificaciones para recibir actualizaciones importantes sobre tus {userRole === 'seller' ? 'ventas' : userRole === 'driver' ? 'entregas' : 'pedidos'}.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={requestPermission}
            disabled={isRequesting || notificationPermission === 'granted'}
            size="sm"
            className="text-xs h-8"
            variant={notificationPermission === 'granted' ? 'outline' : 'default'}
          >
            {isRequesting ? 'Solicitando...' : 
             notificationPermission === 'granted' ? 'Activadas' : 'Activar'}
          </Button>
          
          {notificationPermission === 'granted' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
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
