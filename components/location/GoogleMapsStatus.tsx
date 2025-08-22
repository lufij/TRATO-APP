import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  MapPin,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';

// Extend Window interface
declare global {
  interface Window {
    google: any;
    googleMapsConfig: {
      apiKey: string;
      libraries: string[];
    };
  }
}

export function GoogleMapsStatus() {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error' | 'offline'>('loading');
  const [apiKey, setApiKey] = useState<string>('');
  const [libraries, setLibraries] = useState<string[]>([]);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
    };

    // Check Google Maps status
    const checkGoogleMaps = () => {
      if (window.google?.maps) {
        setStatus('loaded');
        
        // Extract API key from window config
        if (window.googleMapsConfig?.apiKey) {
          const key = window.googleMapsConfig.apiKey;
          setApiKey(`${key.substring(0, 8)}...${key.substring(key.length - 4)}`);
          setLibraries(window.googleMapsConfig.libraries || []);
        }
      } else if (navigator.onLine) {
        // Still loading or error
        const timeout = setTimeout(() => {
          if (!window.google?.maps) {
            setStatus('error');
          }
        }, 10000); // 10 seconds timeout

        return () => clearTimeout(timeout);
      }
    };

    updateOnlineStatus();
    checkGoogleMaps();

    // Listen for Google Maps loaded event
    const handleMapsLoaded = () => {
      setStatus('loaded');
      checkGoogleMaps();
    };

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('google-maps-loaded', handleMapsLoaded);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('google-maps-loaded', handleMapsLoaded);
    };
  }, []);

  const getStatusInfo = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-blue-500" />,
          title: 'Cargando Google Maps',
          description: 'Conectando con los servicios de Google Maps...',
          variant: 'default' as const,
          color: 'text-blue-600'
        };
      case 'loaded':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          title: 'Google Maps Conectado',
          description: 'Todos los servicios están disponibles',
          variant: 'default' as const,
          color: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: 'Error de Conexión',
          description: 'No se pudo cargar Google Maps. Funcionalidad limitada.',
          variant: 'destructive' as const,
          color: 'text-red-600'
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-5 h-5 text-gray-500" />,
          title: 'Sin Conexión',
          description: 'Conecta a internet para usar Google Maps',
          variant: 'default' as const,
          color: 'text-gray-600'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          Estado de Google Maps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant={statusInfo.variant}>
          <div className="flex items-start gap-3">
            {statusInfo.icon}
            <div className="flex-1">
              <h4 className={`font-medium ${statusInfo.color}`}>
                {statusInfo.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </Alert>

        {status === 'loaded' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Key:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {apiKey}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Librerías:</span>
              <div className="flex gap-1">
                {libraries.map(lib => (
                  <Badge key={lib} variant="secondary" className="text-xs">
                    {lib}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Geocodificación</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Mapas Interactivos</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Autocompletado</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Cálculo Distancias</span>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Las funcionalidades básicas seguirán funcionando con GPS y OpenStreetMap.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Reintentar Carga
            </Button>
          </div>
        )}

        {status === 'offline' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Solo GPS básico disponible sin conexión a internet.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Wifi className="w-3 h-3" />
              <span>Conecta a internet para funcionalidad completa</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
