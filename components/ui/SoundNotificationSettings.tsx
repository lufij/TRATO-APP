import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Bell,
  ShoppingCart,
  Truck,
  Package,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useSoundNotifications, NotificationSound } from '../../hooks/useSoundNotifications';
import { useAuth } from '../../contexts/AuthContext';

interface SoundNotificationSettingsProps {
  onClose?: () => void;
}

export function SoundNotificationSettings({ onClose }: SoundNotificationSettingsProps) {
  const { user } = useAuth();
  const { 
    config, 
    isEnabled, 
    toggleSounds, 
    setVolume, 
    testSound 
  } = useSoundNotifications();
  
  const [localVolume, setLocalVolume] = useState(config.volume * 100);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setLocalVolume(value[0]);
    setVolume(newVolume);
  };

  const handleToggleSounds = (enabled: boolean) => {
    toggleSounds(enabled);
  };

  const getSoundDescription = (soundType: NotificationSound, userRole: string) => {
    const descriptions: Record<string, Record<NotificationSound, string>> = {
      vendedor: {
        [NotificationSound.NEW_ORDER]: 'Cuando recibes una nueva orden',
        [NotificationSound.ORDER_ASSIGNED]: 'Cuando un repartidor acepta una entrega',
        [NotificationSound.ORDER_READY]: 'No aplica para vendedores',
        [NotificationSound.ORDER_DELIVERED]: 'Cuando se entrega un pedido',
        [NotificationSound.NEW_PRODUCT]: 'No aplica para vendedores',
        [NotificationSound.GENERAL]: 'Notificaciones generales'
      },
      repartidor: {
        [NotificationSound.NEW_ORDER]: 'No aplica para repartidores',
        [NotificationSound.ORDER_ASSIGNED]: 'Cuando te asignan una entrega',
        [NotificationSound.ORDER_READY]: 'Cuando hay entregas disponibles',
        [NotificationSound.ORDER_DELIVERED]: 'Cuando completas una entrega',
        [NotificationSound.NEW_PRODUCT]: 'No aplica para repartidores',
        [NotificationSound.GENERAL]: 'Notificaciones generales'
      },
      comprador: {
        [NotificationSound.NEW_ORDER]: 'No aplica para compradores',
        [NotificationSound.ORDER_ASSIGNED]: 'Cuando asignan un repartidor',
        [NotificationSound.ORDER_READY]: 'Cuando tu pedido está listo',
        [NotificationSound.ORDER_DELIVERED]: 'Cuando entregan tu pedido',
        [NotificationSound.NEW_PRODUCT]: 'Cuando hay nuevos productos',
        [NotificationSound.GENERAL]: 'Notificaciones generales'
      }
    };

    return descriptions[userRole]?.[soundType] || 'Notificación general';
  };

  const getSoundIcon = (soundType: NotificationSound) => {
    const icons: Record<NotificationSound, React.ComponentType<any>> = {
      [NotificationSound.NEW_ORDER]: ShoppingCart,
      [NotificationSound.ORDER_ASSIGNED]: Truck,
      [NotificationSound.ORDER_READY]: Package,
      [NotificationSound.ORDER_DELIVERED]: CheckCircle,
      [NotificationSound.NEW_PRODUCT]: Package,
      [NotificationSound.GENERAL]: Bell
    };

    return icons[soundType] || Bell;
  };

  const getRelevantSounds = (userRole: string): NotificationSound[] => {
    const roleSounds: Record<string, NotificationSound[]> = {
      vendedor: [
        NotificationSound.NEW_ORDER,
        NotificationSound.ORDER_ASSIGNED,
        NotificationSound.ORDER_DELIVERED,
        NotificationSound.GENERAL
      ],
      repartidor: [
        NotificationSound.ORDER_READY,
        NotificationSound.ORDER_ASSIGNED,
        NotificationSound.ORDER_DELIVERED,
        NotificationSound.GENERAL
      ],
      comprador: [
        NotificationSound.ORDER_READY,
        NotificationSound.ORDER_ASSIGNED,
        NotificationSound.ORDER_DELIVERED,
        NotificationSound.NEW_PRODUCT,
        NotificationSound.GENERAL
      ]
    };

    return roleSounds[userRole] || [NotificationSound.GENERAL];
  };

  const getSoundPattern = (pattern: 'single' | 'double' | 'triple') => {
    switch (pattern) {
      case 'single': return '●';
      case 'double': return '● ●';
      case 'triple': return '● ● ●';
      default: return '●';
    }
  };

  const getRoleTitle = (role: string) => {
    const titles: Record<string, string> = {
      vendedor: 'Vendedor',
      repartidor: 'Repartidor',
      comprador: 'Comprador'
    };
    return titles[role] || role;
  };

  if (!user) return null;

  const relevantSounds = getRelevantSounds(user.role);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Configuración de Sonidos
            </h2>
            <p className="text-sm text-gray-600">
              Configuración para {getRoleTitle(user.role)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {getRoleTitle(user.role)}
        </Badge>
      </div>

      {/* Main Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? (
              <Volume2 className="w-5 h-5 text-green-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            Controles Principales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Activar sonidos</h3>
              <p className="text-sm text-gray-600">
                Recibir alertas sonoras para notificaciones importantes
              </p>
            </div>
            <Switch 
              checked={isEnabled}
              onCheckedChange={handleToggleSounds}
            />
          </div>

          {/* Volume Control */}
          {isEnabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Volumen</h3>
                  <span className="text-sm text-gray-600">{Math.round(localVolume)}%</span>
                </div>
                <Slider
                  value={[localVolume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sound Types */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Tipos de Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {relevantSounds.map((soundType) => {
                const Icon = getSoundIcon(soundType);
                const soundConfig = config.sounds[soundType];
                const description = getSoundDescription(soundType, user.role);
                
                // Skip if not applicable
                if (description.includes('No aplica')) return null;

                return (
                  <div key={soundType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {soundType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            Patrón: {getSoundPattern(soundConfig.pattern)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {soundConfig.frequency}Hz
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testSound(soundType)}
                      className="h-8 px-3"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Probar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">
                Información importante:
              </p>
              <ul className="space-y-1 text-xs">
                <li>• Los sonidos funcionan solo cuando la pestaña está activa</li>
                <li>• Asegúrate de tener el volumen activado en tu dispositivo</li>
                <li>• Los sonidos se generan usando Web Audio API</li>
                <li>• Puedes probar cada sonido con el botón "Probar"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      {onClose && (
        <div className="flex justify-end pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            Cerrar
          </Button>
        </div>
      )}
    </div>
  );
}
