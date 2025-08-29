import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { useSoundNotifications, NotificationSound } from '../hooks/useSoundNotifications';
import { Volume2, VolumeX, Play, CheckCircle, AlertCircle } from 'lucide-react';

export function SoundNotificationTester() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Función para probar sonidos directamente
  const testSound = async (soundType: NotificationSound, description: string) => {
    try {
      console.log(`🔊 Probando sonido: ${soundType}`);
      
      // Crear AudioContext para la prueba
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Configuración de sonidos
      const soundConfigs = {
        [NotificationSound.NEW_ORDER]: { frequency: 800, duration: 300, pattern: 'triple' },
        [NotificationSound.ORDER_ASSIGNED]: { frequency: 600, duration: 200, pattern: 'double' },
        [NotificationSound.ORDER_READY]: { frequency: 1000, duration: 250, pattern: 'double' },
        [NotificationSound.ORDER_DELIVERED]: { frequency: 500, duration: 400, pattern: 'single' },
        [NotificationSound.NEW_PRODUCT]: { frequency: 700, duration: 200, pattern: 'single' },
        [NotificationSound.GENERAL]: { frequency: 650, duration: 200, pattern: 'single' }
      };

      const config = soundConfigs[soundType];
      if (!config) return;

      const playTone = (delay = 0) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration / 1000);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + config.duration / 1000);
        }, delay);
      };

      // Reproducir según el patrón
      switch (config.pattern) {
        case 'single':
          playTone();
          break;
        case 'double':
          playTone();
          playTone(config.duration + 100);
          break;
        case 'triple':
          playTone();
          playTone(config.duration + 100);
          playTone((config.duration + 100) * 2);
          break;
      }

      setTestResults(prev => ({ ...prev, [soundType]: true }));
      
    } catch (error) {
      console.error(`❌ Error probando sonido ${soundType}:`, error);
      setTestResults(prev => ({ ...prev, [soundType]: false }));
    }
  };

  // Sonidos relevantes por rol
  const getSoundsForRole = (role: string) => {
    switch (role) {
      case 'vendedor':
        return [
          { type: NotificationSound.NEW_ORDER, name: 'Nueva Orden', description: 'Cuando recibe un pedido' },
          { type: NotificationSound.ORDER_ASSIGNED, name: 'Repartidor Asignado', description: 'Cuando un repartidor acepta' },
          { type: NotificationSound.ORDER_DELIVERED, name: 'Entrega Completada', description: 'Cuando se completa la entrega' }
        ];
      case 'repartidor':
        return [
          { type: NotificationSound.ORDER_READY, name: 'Entrega Disponible', description: 'Nuevo pedido listo para entrega' },
          { type: NotificationSound.ORDER_ASSIGNED, name: 'Entrega Asignada', description: 'Le asignan una entrega' },
          { type: NotificationSound.ORDER_DELIVERED, name: 'Entrega Completada', description: 'Completa una entrega' }
        ];
      case 'comprador':
        return [
          { type: NotificationSound.ORDER_READY, name: 'Pedido Listo', description: 'Su pedido está listo' },
          { type: NotificationSound.ORDER_ASSIGNED, name: 'Repartidor Asignado', description: 'Le asignan repartidor' },
          { type: NotificationSound.ORDER_DELIVERED, name: 'Pedido Entregado', description: 'Recibe su pedido' },
          { type: NotificationSound.NEW_PRODUCT, name: 'Nuevo Producto', description: 'Hay productos nuevos' }
        ];
      default:
        return [];
    }
  };

  const roleTitle = {
    'vendedor': '👨‍💼 Vendedor',
    'repartidor': '🚛 Repartidor', 
    'comprador': '🛒 Comprador'
  };

  const sounds = user ? getSoundsForRole(user.role) : [];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Probador de Notificaciones Sonoras
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{roleTitle[user?.role as keyof typeof roleTitle] || 'No identificado'}</Badge>
          <Badge variant={isAudioEnabled ? "default" : "secondary"}>
            {isAudioEnabled ? "Audio Habilitado" : "Audio Deshabilitado"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Info del navegador */}
        <div className="p-4 bg-blue-50 rounded-lg border">
          <h3 className="font-semibold text-blue-900 mb-2">🔍 Información del Sistema</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Audio API:</strong> {window.AudioContext || (window as any).webkitAudioContext ? '✅ Disponible' : '❌ No disponible'}</p>
            <p><strong>Usuario:</strong> {user?.name || 'No identificado'} ({user?.role || 'Sin rol'})</p>
            <p><strong>Navegador:</strong> {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Otro'}</p>
          </div>
        </div>

        {/* Pruebas de sonido */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">🎵 Probar Sonidos ({sounds.length} disponibles)</h3>
          
          {sounds.map((sound) => (
            <div key={sound.type} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{sound.name}</div>
                <div className="text-sm text-gray-600">{sound.description}</div>
                <div className="text-xs text-gray-400 mt-1">Tipo: {sound.type}</div>
              </div>
              
              <div className="flex items-center gap-2">
                {testResults[sound.type] !== undefined && (
                  testResults[sound.type] ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testSound(sound.type, sound.description)}
                  disabled={!isAudioEnabled}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Probar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant={isAudioEnabled ? "destructive" : "default"}
            size="sm"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          >
            {isAudioEnabled ? <VolumeX className="w-4 h-4 mr-1" /> : <Volume2 className="w-4 h-4 mr-1" />}
            {isAudioEnabled ? 'Desactivar Audio' : 'Activar Audio'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestResults({})}
          >
            Limpiar Resultados
          </Button>
        </div>

        {/* Instrucciones */}
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>💡 Instrucciones:</strong> Haz clic en "Probar" para escuchar cada sonido. 
            Si no escuchas nada, verifica que el volumen esté activado y que tu navegador permita audio.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
