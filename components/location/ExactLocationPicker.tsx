import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  MapPin, 
  Navigation, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface ExactLocationPickerProps {
  onLocationConfirm: (location: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    source: 'gps' | 'manual';
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  className?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  source: 'gps' | 'manual';
  verified: boolean;
}

export function ExactLocationPicker({ 
  onLocationConfirm, 
  initialLocation,
  className = '' 
}: ExactLocationPickerProps) {
  const [location, setLocation] = useState<LocationData | null>(
    initialLocation ? {
      ...initialLocation,
      accuracy: 0,
      city: '',
      state: '',
      country: '',
      source: 'manual' as const,
      verified: false
    } : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Check geolocation permission on mount
  useEffect(() => {
    if ('geolocation' in navigator && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state as 'granted' | 'denied');
      });
    }
  }, []);

  // Get current GPS location with high accuracy
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Reverse geocoding to get address
      const address = await reverseGeocode(latitude, longitude);

      const locationData: LocationData = {
        latitude,
        longitude,
        accuracy,
        address: address.formatted_address,
        city: address.city,
        state: address.state,
        country: address.country,
        postal_code: address.postal_code,
        source: 'gps',
        verified: accuracy <= 50 // Consider verified if accuracy is good
      };

      setLocation(locationData);
      
      if (accuracy <= 20) {
        toast.success(`📍 Ubicación GPS obtenida con alta precisión (±${Math.round(accuracy)}m)`);
      } else if (accuracy <= 50) {
        toast.success(`📍 Ubicación GPS obtenida con buena precisión (±${Math.round(accuracy)}m)`);
      } else {
        toast.warning(`📍 Ubicación obtenida pero con baja precisión (±${Math.round(accuracy)}m). Intenta desde un lugar con mejor señal.`);
      }

    } catch (err: any) {
      console.error('Error getting location:', err);
      
      if (err.code === 1) { // PERMISSION_DENIED
        setError('Permisos de ubicación denegados. Por favor habilita la ubicación para tu navegador.');
        setPermissionStatus('denied');
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        setError('No se pudo obtener la ubicación. Verifica que tu GPS esté activado.');
      } else if (err.code === 3) { // TIMEOUT
        setError('Tiempo de espera agotado. Intenta desde un lugar con mejor señal GPS.');
      } else {
        setError('Error al obtener la ubicación. Verifica que el GPS esté habilitado.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Reverse geocoding using multiple services
  const reverseGeocode = async (lat: number, lng: number) => {
    // Try Google Maps first if available
    if (window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise<any[]>((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              reject(new Error(`Google Geocoding failed: ${status}`));
            }
          });
        });

        if (result[0]) {
          return parseGoogleMapsResult(result[0]);
        }
      } catch (error) {
        console.log('Google Maps geocoding failed, trying alternative...', error);
      }
    }

    // Fallback to OpenStreetMap Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TRATO App Location Service'
          }
        }
      );

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      return parseNominatimResult(data);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return {
        formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: 'Ciudad',
        state: 'Estado',
        country: 'País',
        postal_code: undefined
      };
    }
  };

  // Parse Google Maps geocoding result
  const parseGoogleMapsResult = (result: any) => {
    const components = result.address_components;
    const getComponent = (type: string) => 
      components.find((c: any) => c.types.includes(type))?.long_name || '';

    return {
      formatted_address: result.formatted_address,
      city: getComponent('locality') || getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1'),
      country: getComponent('country'),
      postal_code: getComponent('postal_code')
    };
  };

  // Parse Nominatim result
  const parseNominatimResult = (data: any) => {
    return {
      formatted_address: data.display_name || `${data.lat}, ${data.lon}`,
      city: data.address?.city || data.address?.town || data.address?.village || 'Ciudad',
      state: data.address?.state || data.address?.region || 'Estado',
      country: data.address?.country || 'País',
      postal_code: data.address?.postcode
    };
  };

  // Copy location info for sharing
  const copyLocationInfo = useCallback(async () => {
    if (!location) return;

    const locationInfo = `📍 UBICACIÓN EXACTA

🏠 Dirección: ${location.address}
🌎 Coordenadas GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
📊 Precisión: ±${Math.round(location.accuracy)}m
🗺️ Ciudad: ${location.city}, ${location.state}

📱 Link Google Maps:
https://www.google.com/maps?q=${location.latitude},${location.longitude}

✅ Verificado por GPS: ${location.verified ? 'Sí' : 'No'}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(locationInfo);
        toast.success('📋 Información de ubicación copiada');
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = locationInfo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('📋 Información copiada');
      }
    } catch (error) {
      toast.error('Error al copiar. Selecciona y copia manualmente.');
    }
  }, [location]);

  // Open in Google Maps
  const openInGoogleMaps = useCallback(() => {
    if (!location) return;
    
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=18`;
    window.open(url, '_blank');
  }, [location]);

  // Confirm location
  const confirmLocation = useCallback(() => {
    if (!location) return;

    onLocationConfirm({
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      accuracy: location.accuracy,
      source: location.source
    });

    toast.success('✅ Ubicación confirmada');
  }, [location, onLocationConfirm]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          Confirmar Ubicación Exacta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
              {permissionStatus === 'denied' && (
                <div className="mt-2">
                  <p className="text-sm">Para habilitar ubicación:</p>
                  <ul className="text-sm list-disc list-inside mt-1">
                    <li>Haz clic en el ícono de ubicación en la barra de direcciones</li>
                    <li>Selecciona "Permitir" para este sitio</li>
                    <li>Recarga la página si es necesario</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!location ? (
          <div className="text-center py-8">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Obtener Ubicación Precisa
            </h3>
            <p className="text-gray-600 mb-6">
              Usa tu GPS para obtener tu ubicación exacta y garantizar entregas precisas
            </p>
            
            <Button 
              onClick={getCurrentLocation}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Obteniendo ubicación...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5 mr-2" />
                  Obtener Mi Ubicación GPS
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Location Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <Target className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800 mb-1">
                    Ubicación Detectada
                  </h4>
                  <p className="text-green-700 text-sm break-words">
                    {location.address}
                  </p>
                </div>
                {location.verified && (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verificada
                  </Badge>
                )}
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                <div>
                  <span className="font-medium">Coordenadas:</span>
                  <br />
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
                <div>
                  <span className="font-medium">Precisión:</span>
                  <br />
                  ±{Math.round(location.accuracy)} metros
                </div>
                <div>
                  <span className="font-medium">Ciudad:</span>
                  <br />
                  {location.city}
                </div>
                <div>
                  <span className="font-medium">Estado:</span>
                  <br />
                  {location.state}
                </div>
              </div>
            </div>

            {/* Accuracy Warning */}
            {location.accuracy > 50 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  La precisión es baja (±{Math.round(location.accuracy)}m). 
                  Para mejor precisión, intenta desde un lugar con mejor señal GPS.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={confirmLocation}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Ubicación
              </Button>
              
              <Button 
                onClick={openInGoogleMaps}
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver en Maps
              </Button>
              
              <Button 
                onClick={copyLocationInfo}
                variant="outline"
                className="border-gray-200"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Info
              </Button>
            </div>

            {/* Retry Button */}
            <Button 
              onClick={getCurrentLocation}
              variant="ghost"
              className="w-full"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Obtener Nueva Ubicación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}
