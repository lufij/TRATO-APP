import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Settings
} from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationPermissionBannerProps {
  onDismiss?: () => void;
}

export function NotificationPermissionBanner({ onDismiss }: NotificationPermissionBannerProps) {
  const { user } = useAuth();
  const { permission, requestPermission, canNotify, supported } = usePushNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Solo mostrar el banner si:
    // 1. Las notificaciones están soportadas
    // 2. No se han concedido permisos
    // 3. El usuario es vendedor o repartidor (roles que necesitan notificaciones urgentes)
    const shouldShow = supported && 
                      permission !== 'granted' && 
                      permission !== 'denied' &&
                      (user?.role === 'vendedor' || user?.role === 'repartidor');
    
    setShowBanner(shouldShow);
  }, [supported, permission, user?.role]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setShowBanner(false);
        onDismiss?.();
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    onDismiss?.();
  };

  if (!showBanner) return null;

  const getRoleText = () => {
    switch (user?.role) {
      case 'vendedor':
        return {
          title: 'Notificaciones de Nuevas Órdenes',
          description: 'Recibe alertas inmediatas cuando lleguen nuevos pedidos, incluso con la pantalla apagada.',
          benefits: ['📱 Notificaciones incluso con pantalla apagada', '🔔 Alertas sonoras para nuevos pedidos', '⚡ Respuesta más rápida a clientes']
        };
      case 'repartidor':
        return {
          title: 'Notificaciones de Entregas',
          description: 'Mantente informado sobre nuevas entregas disponibles y asignaciones.',
          benefits: ['🚛 Alertas de nuevas entregas', '📍 Notificaciones de asignaciones', '💰 No pierdas oportunidades de entrega']
        };
      default:
        return {
          title: 'Notificaciones Push',
          description: 'Recibe notificaciones importantes de la aplicación.',
          benefits: ['🔔 Alertas importantes', '📱 Notificaciones push', '⚡ Información en tiempo real']
        };
    }
  };

  const roleText = getRoleText();

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BellRing className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-orange-900">
                {roleText.title}
              </CardTitle>
              <p className="text-sm text-orange-700 mt-1">
                {roleText.description}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits */}
        <div className="space-y-2">
          {roleText.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-orange-800">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              {benefit}
            </div>
          ))}
        </div>

        {/* Permission Status */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={permission === 'granted' ? 'default' : permission === 'denied' ? 'destructive' : 'secondary'}
            className="flex items-center gap-1"
          >
            {permission === 'granted' ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Activadas
              </>
            ) : permission === 'denied' ? (
              <>
                <X className="w-3 h-3" />
                Denegadas
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                Pendientes
              </>
            )}
          </Badge>
          {!supported && (
            <Badge variant="outline" className="text-gray-600">
              No soportadas en este navegador
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleRequestPermission}
            disabled={isRequesting || !supported || permission === 'granted'}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isRequesting ? (
              <>
                <Settings className="w-4 h-4 mr-2 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Activar Notificaciones
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDismiss}
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
          >
            Ahora no
          </Button>
        </div>

        {/* Help Text */}
        {permission === 'denied' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              Las notificaciones fueron denegadas. Para activarlas, ve a configuración del navegador → Notificaciones → Permitir para este sitio.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
