import React, { useState } from 'react';
import { useAdvancedSoundNotifications, NotificationSound } from '../hooks/useAdvancedSoundNotifications';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Volume2, VolumeX, TestTube, Zap, PlayCircle } from 'lucide-react';

export function SoundTester() {
  const {
    isEnabled,
    config,
    playAdvancedSound,
    testSound,
    toggleSounds,
    setVolume,
    toggleVibration,
    isAudioSupported,
    isVibrationSupported
  } = useAdvancedSoundNotifications();

  const [lastPlayed, setLastPlayed] = useState<string>('');

  const soundTypes = [
    { key: NotificationSound.NEW_ORDER, label: '🛒 Nueva Orden', color: 'bg-green-500' },
    { key: NotificationSound.ORDER_ASSIGNED, label: '🚚 Repartidor Asignado', color: 'bg-blue-500' },
    { key: NotificationSound.ORDER_READY, label: '✅ Orden Lista', color: 'bg-orange-500' },
    { key: NotificationSound.ORDER_DELIVERED, label: '📦 Orden Entregada', color: 'bg-purple-500' },
    { key: NotificationSound.NEW_PRODUCT, label: '🆕 Nuevo Producto', color: 'bg-pink-500' },
    { key: NotificationSound.GENERAL, label: '🔔 General', color: 'bg-gray-500' },
    { key: NotificationSound.CRITICAL, label: '🚨 Crítico', color: 'bg-red-500' }
  ];

  const playSound = (soundType: NotificationSound, label: string) => {
    playAdvancedSound(soundType);
    setLastPlayed(label);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-96 overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Probador de Sonidos
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? 'ACTIVO' : 'INACTIVO'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Control principal */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Sistema de Sonido</span>
            <Button
              onClick={() => toggleSounds(!isEnabled)}
              variant={isEnabled ? 'default' : 'outline'}
              size="sm"
            >
              {isEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {isEnabled ? 'Activado' : 'Desactivado'}
            </Button>
          </div>

          {isEnabled && (
            <>
              <Separator />

              {/* Sonidos de prueba */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Tipos de Sonido:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {soundTypes.map(({ key, label, color }) => (
                    <Button
                      key={key}
                      onClick={() => playSound(key, label)}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                    >
                      <div className={`w-3 h-3 rounded-full ${color} mr-2`} />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Test rápido */}
              <div className="flex gap-2">
                <Button
                  onClick={() => testSound(NotificationSound.NEW_ORDER)}
                  className="flex-1"
                  size="sm"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Test Rápido
                </Button>
                <Button
                  onClick={() => {
                    // Reproducir secuencia de sonidos
                    playAdvancedSound(NotificationSound.NEW_ORDER);
                    setTimeout(() => playAdvancedSound(NotificationSound.ORDER_ASSIGNED), 1000);
                    setTimeout(() => playAdvancedSound(NotificationSound.ORDER_DELIVERED), 2000);
                    setLastPlayed('Secuencia completa');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Secuencia
                </Button>
              </div>

              {/* Último sonido reproducido */}
              {lastPlayed && (
                <div className="text-center text-sm text-muted-foreground">
                  Último: {lastPlayed}
                </div>
              )}
            </>
          )}

          {/* Info del sistema */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Audio:</span>
              <span>{isAudioSupported ? '✅ Soportado' : '❌ No soportado'}</span>
            </div>
            <div className="flex justify-between">
              <span>Vibración:</span>
              <span>{isVibrationSupported ? '✅ Soportado' : '❌ No soportado'}</span>
            </div>
            <div className="flex justify-between">
              <span>Volumen:</span>
              <span>{Math.round(config.volume * 100)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
