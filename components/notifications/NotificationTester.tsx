import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  Smartphone,
  Monitor,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useSoundNotifications, NotificationSound } from '../../hooks/useSoundNotifications';
import { supabase } from '../../utils/supabase/client';
import { useToastNotifications } from './MobileToastNotifications';

export function NotificationTester() {
  const { user } = useAuth();
  const { addToast } = useToastNotifications();
  const { permission, requestPermission, canNotify, showNotification } = usePushNotifications();
  const { isEnabled: soundEnabled, toggleSounds, testSound } = useSoundNotifications();
  
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState(false);

  // Check realtime connection
  const checkRealtimeConnection = async () => {
    setIsCheckingRealtime(true);
    setRealtimeConnected(false);
    
    try {
      const channel = supabase
        .channel('test-realtime')
        .on('broadcast', { event: 'ping' }, (payload) => {
          setRealtimeConnected(true);
          setLastTestResult('✅ Conexión en tiempo real: OK');
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Send a test ping
            channel.send({
              type: 'broadcast',
              event: 'ping',
              payload: { test: true }
            });
          }
        });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!realtimeConnected) {
          setLastTestResult('❌ Conexión en tiempo real: Error de timeout');
        }
        supabase.removeChannel(channel);
        setIsCheckingRealtime(false);
      }, 5000);

    } catch (error) {
      setLastTestResult(`❌ Error de conexión: ${error}`);
      setIsCheckingRealtime(false);
    }
  };

  // Test sound notification
  const handleTestSound = async () => {
    setIsTestingSound(true);
    setLastTestResult(null);
    
    try {
      if (!soundEnabled) {
        setLastTestResult('❌ Los sonidos están desactivados');
        setIsTestingSound(false);
        return;
      }

      // Test sound based on user role
      const soundType = user?.role === 'vendedor' ? NotificationSound.NEW_ORDER : 
                       user?.role === 'repartidor' ? NotificationSound.ORDER_ASSIGNED : NotificationSound.GENERAL;
      
      await testSound(soundType);
      setLastTestResult('✅ Sonido de prueba reproducido');
      
    } catch (error) {
      setLastTestResult(`❌ Error al reproducir sonido: ${error}`);
    } finally {
      setIsTestingSound(false);
    }
  };

  // Test push notification
  const handleTestPush = async () => {
    setIsTestingPush(true);
    setLastTestResult(null);
    
    try {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setLastTestResult('❌ Permisos de notificación denegados');
          setIsTestingPush(false);
          return;
        }
      }

      await showNotification('🧪 Notificación de Prueba', {
        body: 'Si ves este mensaje, las notificaciones funcionan correctamente',
        icon: '/icon-192x192.png',
        tag: 'test-notification',
        requireInteraction: false
      });
      
      setLastTestResult('✅ Notificación push enviada');
      
    } catch (error) {
      setLastTestResult(`❌ Error al enviar notificación: ${error}`);
    } finally {
      setIsTestingPush(false);
    }
  };

  // Test toast notification
  const handleTestToast = () => {
    addToast({
      type: 'new_order',
      title: '🛒 Nueva Orden de Prueba',
      message: 'Pedido de Q45.50 recibido de Cliente Test',
      autoRemove: true
    });
    setLastTestResult('✅ Notificación toast mostrada');
  };

  // Get device info
  const getDeviceInfo = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isHTTPS = window.location.protocol === 'https:';
    const supportsNotifications = 'Notification' in window;
    const supportsServiceWorker = 'serviceWorker' in navigator;
    
    return { isMobile, isHTTPS, supportsNotifications, supportsServiceWorker };
  };

  const deviceInfo = getDeviceInfo();

  const testNotifications = [
    {
      type: 'new_order' as const,
      title: '🛒 Nueva Orden',
      message: 'Pedido de Q45.50 recibido de María García',
      autoRemove: true
    },
    {
      type: 'success' as const,
      title: '✅ Orden Confirmada',
      message: 'Orden #123 confirmada exitosamente',
      autoRemove: true
    },
    {
      type: 'warning' as const,
      title: '⚠️ Orden Cancelada',
      message: 'El cliente canceló la orden #124',
      autoRemove: true
    },
    {
      type: 'order_update' as const,
      title: '📦 Orden Lista',
      message: 'Orden #125 lista para entrega',
      autoRemove: true
    }
  ];

  return (
    <Card className="mx-4 my-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Pruebas de Notificaciones
          {user?.role && (
            <Badge variant="outline" className="ml-auto">
              {user.role}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Device compatibility */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {deviceInfo.isMobile ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            <span>{deviceInfo.isMobile ? 'Móvil' : 'Escritorio'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {deviceInfo.isHTTPS ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>HTTPS: {deviceInfo.isHTTPS ? 'Sí' : 'No'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {deviceInfo.supportsNotifications ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>API Notificaciones: {deviceInfo.supportsNotifications ? 'Sí' : 'No'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {deviceInfo.supportsServiceWorker ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>Service Worker: {deviceInfo.supportsServiceWorker ? 'Sí' : 'No'}</span>
          </div>
        </div>

        {/* Current status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <div className="flex justify-center mb-2">
              {permission === 'granted' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="text-xs font-medium">Push</div>
            <div className="text-xs text-gray-600">
              {permission === 'granted' ? 'Permitidas' : 
               permission === 'denied' ? 'Bloqueadas' : 'Pendientes'}
            </div>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <div className="flex justify-center mb-2">
              {soundEnabled ? (
                <Volume2 className="w-6 h-6 text-green-600" />
              ) : (
                <VolumeX className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-xs font-medium">Sonido</div>
            <div className="text-xs text-gray-600">
              {soundEnabled ? 'Activado' : 'Desactivado'}
            </div>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <div className="flex justify-center mb-2">
              {realtimeConnected ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : isCheckingRealtime ? (
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-xs font-medium">Tiempo Real</div>
            <div className="text-xs text-gray-600">
              {realtimeConnected ? 'Conectado' : 
               isCheckingRealtime ? 'Verificando' : 'Desconectado'}
            </div>
          </div>
        </div>

        {/* Test buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleTestSound}
            disabled={isTestingSound || !soundEnabled}
            className="w-full"
            variant={soundEnabled ? "default" : "secondary"}
          >
            {isTestingSound ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Reproduciendo sonido...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Probar Sonido de Notificación
              </>
            )}
          </Button>
          
          <Button
            onClick={handleTestPush}
            disabled={isTestingPush}
            className="w-full"
            variant="outline"
          >
            {isTestingPush ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Enviando notificación...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Probar Notificación Push
              </>
            )}
          </Button>

          <Button
            onClick={handleTestToast}
            className="w-full"
            variant="outline"
          >
            📱 Probar Notificación Toast
          </Button>
          
          <Button
            onClick={checkRealtimeConnection}
            disabled={isCheckingRealtime}
            className="w-full"
            variant="outline"
          >
            {isCheckingRealtime ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verificando conexión...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Probar Conexión en Tiempo Real
              </>
            )}
          </Button>
        </div>

        {/* Toast notification tests */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Pruebas de Notificaciones Toast:</h4>
          <div className="space-y-2">
            {testNotifications.map((notification, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => addToast(notification)}
              >
                {notification.title}
              </Button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2 border-t pt-4">
          <Button
            onClick={() => toggleSounds(!soundEnabled)}
            variant="outline"
            className="w-full"
          >
            {soundEnabled ? (
              <>
                <VolumeX className="w-4 h-4 mr-2" />
                Desactivar Sonidos
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Activar Sonidos
              </>
            )}
          </Button>
          
          {permission !== 'granted' && (
            <Button
              onClick={requestPermission}
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Solicitar Permisos de Notificación
            </Button>
          )}
        </div>

        {/* Test result */}
        {lastTestResult && (
          <div className={`p-3 rounded-lg text-sm ${
            lastTestResult.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {lastTestResult}
          </div>
        )}

        {/* Warning messages */}
        {!deviceInfo.isHTTPS && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            ⚠️ Las notificaciones requieren HTTPS. En desarrollo, usa https://localhost:5173
          </div>
        )}
        
        {permission === 'denied' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ❌ Las notificaciones están bloqueadas. Ve a la configuración del navegador para habilitarlas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
