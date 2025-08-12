import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  MapPin, 
  RefreshCw, 
  Settings, 
  Smartphone, 
  Monitor, 
  Wifi, 
  Shield,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react';

interface GPSErrorRecoveryProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
  loading?: boolean;
  permissionState?: PermissionState | null;
}

export function GPSErrorRecovery({ 
  error, 
  onRetry, 
  onDismiss, 
  loading = false,
  permissionState 
}: GPSErrorRecoveryProps) {
  const [copiedInstructions, setCopiedInstructions] = useState(false);

  // Detect error type from message
  const isPermissionError = error.includes('denegado') || error.includes('PERMISSION_DENIED');
  const isSignalError = error.includes('no disponible') || error.includes('POSITION_UNAVAILABLE');
  const isTimeoutError = error.includes('agotado') || error.includes('TIMEOUT');

  const copyInstructions = () => {
    const instructions = `Instrucciones para habilitar GPS en TRATO:

1. 🔒 En la barra de direcciones, busca el ícono de ubicación
2. 📍 Cambia de "Bloqueado" a "Permitir" 
3. 🔄 Recarga la página
4. 🎯 Vuelve a intentar verificar ubicación

¿Problemas? Ve a configuración del navegador:
• Chrome: chrome://settings/content/location
• Firefox: about:preferences#privacy
• Safari: Preferencias → Sitios web → Ubicación

La ubicación GPS es necesaria para que los repartidores encuentren tu negocio en Gualán.`;

    navigator.clipboard?.writeText(instructions).then(() => {
      setCopiedInstructions(true);
      setTimeout(() => setCopiedInstructions(false), 2000);
    });
  };

  const openBrowserSettings = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    let settingsUrl = '';

    if (userAgent.includes('chrome')) {
      settingsUrl = 'chrome://settings/content/location';
    } else if (userAgent.includes('firefox')) {
      settingsUrl = 'about:preferences#privacy';
    } else if (userAgent.includes('edge')) {
      settingsUrl = 'edge://settings/content/location';
    }

    if (settingsUrl) {
      window.open(settingsUrl, '_blank');
    }
  };

  return (
    <Card className="border-red-300 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <MapPin className="w-5 h-5" />
          {isPermissionError && "Permiso de Ubicación Requerido"}
          {isSignalError && "Señal GPS No Disponible"}
          {isTimeoutError && "Tiempo de Espera Agotado"}
          {!isPermissionError && !isSignalError && !isTimeoutError && "Error de Ubicación GPS"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Details */}
        <Alert className="border-red-200 bg-red-100">
          <AlertDescription className="text-red-800 whitespace-pre-line text-sm">
            {error}
          </AlertDescription>
        </Alert>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onRetry}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Intentar de Nuevo
          </Button>

          {isPermissionError && (
            <Button
              variant="outline"
              onClick={openBrowserSettings}
              className="text-blue-600 border-blue-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              Abrir Configuración
            </Button>
          )}

          <Button
            variant="outline"
            onClick={copyInstructions}
            className="text-green-600 border-green-300"
          >
            {copiedInstructions ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar Instrucciones
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onDismiss}
            className="text-gray-600"
          >
            Cerrar
          </Button>
        </div>

        {/* Device-Specific Help */}
        <div className="bg-white rounded-lg p-4 space-y-3 border border-red-200">
          <h4 className="font-semibold text-red-900 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Guía Rápida por Dispositivo
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-blue-800">
                <Smartphone className="w-4 h-4" />
                En Móviles:
              </div>
              <ul className="text-gray-700 space-y-1 ml-6">
                <li>• Activar GPS en Configuración</li>
                <li>• Ir al aire libre</li>
                <li>• Permitir ubicación al navegador</li>
                <li>• Usar modo alta precisión</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-purple-800">
                <Monitor className="w-4 h-4" />
                En Computadora:
              </div>
              <ul className="text-gray-700 space-y-1 ml-6">
                <li>• Verificar conexión WiFi estable</li>
                <li>• Usar cerca de ventana</li>
                <li>• Permitir en configuración navegador</li>
                <li>• Preferible usar móvil si disponible</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Permission State Info */}
        {permissionState && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Estado actual de permisos:</strong>{' '}
              <span className={`font-medium ${
                permissionState === 'granted' ? 'text-green-600' : 
                permissionState === 'denied' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {permissionState === 'granted' && '✅ Concedido'}
                {permissionState === 'denied' && '❌ Denegado'}
                {permissionState === 'prompt' && '⏳ Pendiente'}
              </span>
            </div>
          </div>
        )}

        {/* Why GPS is Important */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h5 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            ¿Por qué necesitamos tu ubicación GPS?
          </h5>
          <p className="text-yellow-800 text-sm">
            Los repartidores necesitan las coordenadas exactas de tu negocio para hacer entregas correctas y rápidas. 
            Sin ubicación GPS, no podrán encontrar tu negocio fácilmente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}