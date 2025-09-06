import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Bell,
  ShoppingCart,
  Truck,
  Package,
  CheckCircle,
  Settings,
  Smartphone,
  Monitor,
  Vibrate,
  StopCircle,
  TestTube
} from 'lucide-react';
import { useAdvancedSoundNotifications, NotificationSound } from '../hooks/useAdvancedSoundNotifications';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface AdvancedSoundTesterProps {
  onClose?: () => void;
}

export function AdvancedSoundTester({ onClose }: AdvancedSoundTesterProps) {
  const { user } = useAuth();
  const { 
    isEnabled,
    config,
    isAudioContextReady,
    isAudioSupported,
    isVibrationSupported,
    playAdvancedSound,
    playNotificationWithSound,
    testSound,
    stopAllSounds,
    toggleSounds,
    setVolume,
    toggleVibration
  } = useAdvancedSoundNotifications();

  const [localVolume, setLocalVolume] = useState(config.volume * 100);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Actualizar volumen local cuando cambie el config
  useEffect(() => {
    setLocalVolume(config.volume * 100);
  }, [config.volume]);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setLocalVolume(value[0]);
    setVolume(newVolume);
  };

  const handleToggleSounds = (enabled: boolean) => {
    toggleSounds(enabled);
    if (enabled) {
      toast.success('🔊 Sistema de sonido activado');
    } else {
      toast.info('🔇 Sistema de sonido desactivado');
    }
  };

  const handleToggleVibration = (enabled: boolean) => {
    toggleVibration(enabled);
    if (enabled) {
      toast.success('📳 Vibración activada');
    } else {
      toast.info('📳 Vibración desactivada');
    }
  };

  // Test individual de sonidos
  const handleTestSound = async (soundType: NotificationSound) => {
    try {
      console.log(`🧪 Probando sonido: ${soundType}`);
      testSound(soundType);
      setTestResults(prev => ({ ...prev, [soundType]: true }));
      
      // Limpiar resultado después de 3 segundos
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [soundType]: false }));
      }, 3000);
    } catch (error) {
      console.error(`❌ Error probando sonido ${soundType}:`, error);
      setTestResults(prev => ({ ...prev, [soundType]: false }));
      toast.error(`Error probando ${soundType}`);
    }
  };

  // Test completo de notificación (sonido + push)
  const handleTestCompleteNotification = async (soundType: NotificationSound) => {
    try {
      const titles = {
        [NotificationSound.NEW_ORDER]: '🛒 Nueva Orden de Prueba',
        [NotificationSound.ORDER_ASSIGNED]: '🚚 Repartidor Asignado (Prueba)',
        [NotificationSound.ORDER_READY]: '📦 Entrega Disponible (Prueba)',
        [NotificationSound.ORDER_DELIVERED]: '✅ Pedido Entregado (Prueba)',
        [NotificationSound.NEW_PRODUCT]: '🆕 Nuevo Producto (Prueba)',
        [NotificationSound.GENERAL]: '📢 Notificación General (Prueba)',
        [NotificationSound.CRITICAL]: '🚨 Alerta Crítica (Prueba)'
      };

      const bodies = {
        [NotificationSound.NEW_ORDER]: 'Pedido de prueba por Q25.50 - Cliente de prueba',
        [NotificationSound.ORDER_ASSIGNED]: 'Tu pedido ha sido asignado a un repartidor',
        [NotificationSound.ORDER_READY]: 'Nueva entrega disponible en tu área',
        [NotificationSound.ORDER_DELIVERED]: 'Tu pedido ha sido entregado exitosamente',
        [NotificationSound.NEW_PRODUCT]: 'Nuevo producto disponible en tu tienda favorita',
        [NotificationSound.GENERAL]: 'Esta es una notificación de prueba general',
        [NotificationSound.CRITICAL]: 'Esta es una alerta crítica de prueba'
      };

      await playNotificationWithSound(
        soundType,
        titles[soundType],
        {
          body: bodies[soundType],
          requireInteraction: soundType === NotificationSound.CRITICAL,
          data: { test: true, timestamp: Date.now() }
        }
      );

      setTestResults(prev => ({ ...prev, [`complete-${soundType}`]: true }));
      
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [`complete-${soundType}`]: false }));
      }, 5000);

    } catch (error) {
      console.error(`❌ Error probando notificación completa ${soundType}:`, error);
      toast.error(`Error en notificación completa ${soundType}`);
    }
  };

  // Test automático de todos los sonidos
  const handleTestAll = async () => {
    if (isTestingAll) return;
    
    setIsTestingAll(true);
    toast.info('🧪 Iniciando prueba completa del sistema...');

    const relevantSounds = getSoundsForRole(user?.role || 'comprador');
    
    for (let i = 0; i < relevantSounds.length; i++) {
      const sound = relevantSounds[i];
      
      toast.info(`🔊 Probando: ${sound.name}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      testSound(sound.type);
      
      // Esperar a que termine el sonido antes del siguiente
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    setIsTestingAll(false);
    toast.success('✅ Prueba completa del sistema finalizada');
  };

  // Sonidos relevantes por rol
  const getSoundsForRole = (role: string) => {
    switch (role) {
      case 'vendedor':
        return [
          { type: NotificationSound.NEW_ORDER, name: 'Nueva Orden', description: 'Cuando recibes un pedido', icon: ShoppingCart, color: 'bg-green-500' },
          { type: NotificationSound.ORDER_ASSIGNED, name: 'Repartidor Asignado', description: 'Cuando un repartidor acepta', icon: Truck, color: 'bg-blue-500' },
          { type: NotificationSound.ORDER_DELIVERED, name: 'Entrega Completada', description: 'Cuando se completa la entrega', icon: CheckCircle, color: 'bg-emerald-500' },
          { type: NotificationSound.GENERAL, name: 'General', description: 'Notificaciones generales', icon: Bell, color: 'bg-gray-500' }
        ];
      case 'repartidor':
        return [
          { type: NotificationSound.ORDER_READY, name: 'Entrega Disponible', description: 'Nuevo pedido listo para entrega', icon: Package, color: 'bg-orange-500' },
          { type: NotificationSound.ORDER_ASSIGNED, name: 'Entrega Asignada', description: 'Cuando te asignan una entrega', icon: Truck, color: 'bg-blue-500' },
          { type: NotificationSound.ORDER_DELIVERED, name: 'Entrega Completada', description: 'Cuando completas una entrega', icon: CheckCircle, color: 'bg-emerald-500' },
          { type: NotificationSound.GENERAL, name: 'General', description: 'Notificaciones generales', icon: Bell, color: 'bg-gray-500' }
        ];
      case 'comprador':
        return [
          { type: NotificationSound.ORDER_ASSIGNED, name: 'Repartidor Asignado', description: 'Cuando asignan tu entrega', icon: Truck, color: 'bg-blue-500' },
          { type: NotificationSound.ORDER_DELIVERED, name: 'Pedido Entregado', description: 'Cuando entregan tu pedido', icon: CheckCircle, color: 'bg-emerald-500' },
          { type: NotificationSound.NEW_PRODUCT, name: 'Nuevo Producto', description: 'Cuando hay nuevos productos', icon: Package, color: 'bg-purple-500' },
          { type: NotificationSound.GENERAL, name: 'General', description: 'Notificaciones generales', icon: Bell, color: 'bg-gray-500' }
        ];
      default:
        return [
          { type: NotificationSound.GENERAL, name: 'General', description: 'Notificaciones generales', icon: Bell, color: 'bg-gray-500' }
        ];
    }
  };

  const getSoundDescription = (soundType: NotificationSound) => {
    const soundConfig = config.sounds[soundType];
    return `${soundConfig.frequency}Hz • ${soundConfig.duration}ms • ${soundConfig.pattern} • ${soundConfig.repeatCount || 1} rep.`;
  };

  const relevantSounds = getSoundsForRole(user?.role || 'comprador');

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TestTube className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Sistema Avanzado de Sonidos
            </h2>
            <p className="text-sm text-gray-600">
              Configuración y pruebas para {user?.role || 'usuario'}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose} size="sm">
            Cerrar
          </Button>
        )}
      </div>

      {/* Estado del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {isAudioSupported ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Monitor className="w-3 h-3 mr-1" />
                  Audio OK
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <VolumeX className="w-3 h-3 mr-1" />
                  No Audio
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isAudioContextReady ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Activo
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Pausado
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isVibrationSupported ? (
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  <Vibrate className="w-3 h-3 mr-1" />
                  Vibración
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Sin Vibr.
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {Notification.permission === 'granted' ? (
                <Badge variant="default" className="bg-purple-100 text-purple-800">
                  <Bell className="w-3 h-3 mr-1" />
                  Push OK
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Bell className="w-3 h-3 mr-1" />
                  Sin Push
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activar/Desactivar Sonidos */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Sonidos de Notificación</h4>
              <p className="text-sm text-gray-600">Activar/desactivar todos los sonidos</p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleSounds}
            />
          </div>

          <Separator />

          {/* Control de Volumen */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volumen General
              </h4>
              <span className="text-sm text-gray-600">{localVolume.toFixed(0)}%</span>
            </div>
            <Slider
              value={[localVolume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              step={5}
              className="w-full"
              disabled={!isEnabled}
            />
          </div>

          <Separator />

          {/* Vibración */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Vibrate className="w-4 h-4" />
                Vibración en Móviles
              </h4>
              <p className="text-sm text-gray-600">
                {isVibrationSupported ? 'Activar vibración en dispositivos móviles' : 'No soportado en este dispositivo'}
              </p>
            </div>
            <Switch
              checked={config.enableVibration}
              onCheckedChange={handleToggleVibration}
              disabled={!isVibrationSupported || !isEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pruebas de Sonido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Pruebas de Sonido - {user?.role || 'Usuario'}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={stopAllSounds}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <StopCircle className="w-4 h-4 mr-1" />
                Detener Todo
              </Button>
              <Button
                onClick={handleTestAll}
                disabled={isTestingAll || !isEnabled}
                size="sm"
              >
                <Play className="w-4 h-4 mr-1" />
                {isTestingAll ? 'Probando...' : 'Probar Todo'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Pruebas Individuales</TabsTrigger>
              <TabsTrigger value="complete">Notificación Completa</TabsTrigger>
            </TabsList>
            
            {/* Pruebas Individuales de Sonido */}
            <TabsContent value="individual" className="space-y-4">
              <div className="grid gap-4">
                {relevantSounds.map((sound) => {
                  const IconComponent = sound.icon;
                  const isActive = testResults[sound.type];
                  
                  return (
                    <div key={sound.type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sound.color} bg-opacity-20`}>
                          <IconComponent className={`w-5 h-5 text-gray-700`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{sound.name}</h4>
                          <p className="text-sm text-gray-600">{sound.description}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            {getSoundDescription(sound.type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            ✓ Reproducido
                          </Badge>
                        )}
                        <Button
                          onClick={() => handleTestSound(sound.type)}
                          disabled={!isEnabled}
                          size="sm"
                          variant="outline"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Pruebas Completas (Sonido + Notificación Push) */}
            <TabsContent value="complete" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800">Notificaciones Completas</h4>
                <p className="text-sm text-blue-600 mt-1">
                  Prueba el sonido junto con notificaciones push del navegador como aparecerían en uso real.
                </p>
              </div>
              
              <div className="grid gap-4">
                {relevantSounds.map((sound) => {
                  const IconComponent = sound.icon;
                  const isActive = testResults[`complete-${sound.type}`];
                  
                  return (
                    <div key={sound.type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sound.color} bg-opacity-20`}>
                          <IconComponent className={`w-5 h-5 text-gray-700`} />
                        </div>
                        <div>
                          <h4 className="font-medium">Notificación: {sound.name}</h4>
                          <p className="text-sm text-gray-600">{sound.description}</p>
                          <p className="text-xs text-gray-500">Incluye sonido + vibración + push</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            ✓ Enviado
                          </Badge>
                        )}
                        <Button
                          onClick={() => handleTestCompleteNotification(sound.type)}
                          disabled={!isEnabled}
                          size="sm"
                        >
                          <Bell className="w-4 h-4 mr-1" />
                          Probar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Información Técnica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Información Técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Compatibilidad</h4>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>• Web Audio API: {isAudioSupported ? '✅ Soportado' : '❌ No soportado'}</li>
                <li>• Vibración: {isVibrationSupported ? '✅ Soportado' : '❌ No soportado'}</li>
                <li>• Push Notifications: {Notification.permission === 'granted' ? '✅ Permitido' : '⚠️ ' + Notification.permission}</li>
                <li>• AudioContext: {isAudioContextReady ? '✅ Activo' : '⚠️ Suspendido'}</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium">Configuración Actual</h4>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>• Sonidos: {isEnabled ? '✅ Habilitado' : '❌ Deshabilitado'}</li>
                <li>• Volumen: {(config.volume * 100).toFixed(0)}%</li>
                <li>• Vibración: {config.enableVibration ? '✅ Habilitada' : '❌ Deshabilitada'}</li>
                <li>• Rol: {user?.role || 'No definido'}</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800">💡 Consejos para mejores notificaciones</h4>
            <ul className="text-sm text-gray-600 space-y-1 mt-2">
              <li>• Mantén el volumen del sistema alto para escuchar mejor las notificaciones</li>
              <li>• En móviles, activa la vibración para notificaciones con pantalla apagada</li>
              <li>• Permite notificaciones del navegador para recibir alertas en segundo plano</li>
              <li>• Los sonidos se reproducen automáticamente cuando ocurren eventos reales</li>
              <li>• El sistema repite sonidos importantes para asegurar que los escuches</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
