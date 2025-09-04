// 🔔 SISTEMA DE NOTIFICACIONES PROFESIONAL
// Para app comunitaria TRATO - Móvil optimizado

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Settings,
  Smartphone,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import { useSoundNotifications } from '../../hooks/useSoundNotifications';

interface NotificationSettingsProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function NotificationSettings({ 
  className = "", 
  showTitle = true,
  compact = false 
}: NotificationSettingsProps) {
  const { user } = useAuth();
  const { serviceWorker, push, subscribeToPush, unsubscribeFromPush, isReady } = useServiceWorker();
  const { isEnabled: soundEnabled, toggleSounds } = useSoundNotifications();
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Estado de notificaciones del navegador
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Solicitar permisos y suscribirse
  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setLastAction(null);
    
    try {
      if (browserPermission !== 'granted') {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        
        if (permission !== 'granted') {
          setLastAction('❌ Permisos denegados por el usuario');
          return;
        }
      }

      await subscribeToPush();
      setLastAction('✅ Notificaciones activadas correctamente');
      
    } catch (error) {
      console.error('Error activando notificaciones:', error);
      setLastAction('❌ Error activando notificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Desactivar notificaciones
  const handleDisableNotifications = async () => {
    setIsLoading(true);
    setLastAction(null);
    
    try {
      await unsubscribeFromPush();
      setLastAction('✅ Notificaciones desactivadas');
      
    } catch (error) {
      console.error('Error desactivando notificaciones:', error);
      setLastAction('❌ Error desactivando notificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si está completamente configurado
  const isFullyEnabled = browserPermission === 'granted' && push.isSubscribed;
  const canEnable = serviceWorker.isSupported && browserPermission !== 'denied';

  // Obtener mensaje de estado
  const getStatusMessage = () => {
    if (!serviceWorker.isSupported) {
      return 'Tu navegador no soporta notificaciones push';
    }
    
    if (browserPermission === 'denied') {
      return 'Notificaciones bloqueadas en configuración del navegador';
    }
    
    if (isFullyEnabled) {
      return 'Notificaciones activadas y funcionando';
    }
    
    if (push.isSubscribing) {
      return 'Configurando notificaciones...';
    }
    
    return 'Notificaciones disponibles para activar';
  };

  // Versión compacta para móviles
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          size="sm"
          variant={isFullyEnabled ? "default" : "outline"}
          onClick={isFullyEnabled ? handleDisableNotifications : handleEnableNotifications}
          disabled={isLoading || !canEnable}
          className="text-xs"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isFullyEnabled ? (
            <BellOff className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          <span className="ml-1 hidden sm:inline">
            {isFullyEnabled ? 'ON' : 'OFF'}
          </span>
        </Button>
        
        {lastAction && (
          <div className="text-xs text-muted-foreground">
            {lastAction.includes('✅') ? '✅' : '❌'}
          </div>
        )}
      </div>
    );
  }

  // Versión completa
  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Notificaciones
            {user?.role && (
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {/* Estado actual */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex-shrink-0">
            {isFullyEnabled ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : browserPermission === 'denied' ? (
              <X className="w-5 h-5 text-red-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {isFullyEnabled ? 'Activadas' : 'Inactivas'}
            </div>
            <div className="text-xs text-muted-foreground">
              {getStatusMessage()}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Información técnica (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>SW: {serviceWorker.isRegistered ? '✅' : '❌'}</div>
            <div>Push: {push.isSubscribed ? '✅' : '❌'}</div>
            <div>Permisos: {browserPermission}</div>
            <div>Sonido: {soundEnabled ? '🔊' : '🔇'}</div>
          </div>
        )}

        {/* Controles principales */}
        <div className="space-y-2">
          {!isFullyEnabled && canEnable && (
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Configurando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Activar Notificaciones
                </>
              )}
            </Button>
          )}
          
          {isFullyEnabled && (
            <Button
              onClick={handleDisableNotifications}
              disabled={isLoading}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <BellOff className="w-4 h-4 mr-2" />
              Desactivar
            </Button>
          )}
          
          {/* Control de sonido */}
          <Button
            onClick={() => toggleSounds(!soundEnabled)}
            variant="ghost"
            className="w-full text-xs"
            size="sm"
          >
            {soundEnabled ? '🔊' : '🔇'} Sonido: {soundEnabled ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* Mensaje de estado de la última acción */}
        {lastAction && (
          <div className={`p-2 rounded text-xs text-center ${
            lastAction.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {lastAction}
          </div>
        )}

        {/* Instrucciones para navegador bloqueado */}
        {browserPermission === 'denied' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-orange-600 mt-0.5" />
              <div className="text-xs text-orange-700">
                <div className="font-medium mb-1">Para activar notificaciones:</div>
                <div>1. Ve a configuración del navegador</div>
                <div>2. Busca "Notificaciones" o "Permisos"</div>
                <div>3. Permite notificaciones para este sitio</div>
                <div>4. Recarga la página</div>
              </div>
            </div>
          </div>
        )}

        {/* Información sobre HTTPS */}
        {!window.location.protocol.includes('https') && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 text-center">
            💡 Las notificaciones funcionan completamente solo en HTTPS
          </div>
        )}
      </CardContent>
    </Card>
  );
}
