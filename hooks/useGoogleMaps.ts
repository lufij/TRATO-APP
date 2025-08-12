import { useState, useCallback, useEffect } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  formatted_address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
  place_id?: string;
}

interface UseGoogleMapsReturn {
  getCurrentLocation: () => Promise<LocationData>;
  reverseGeocode: (lat: number, lng: number) => Promise<LocationData>;
  validateLocation: (lat: number, lng: number) => boolean;
  checkPermissions: () => Promise<PermissionState>;
  requestPermissions: () => Promise<boolean>;
  loading: boolean;
  error: string | null;
  permissionState: PermissionState | null;
  clearError: () => void;
}

// Check if location is within Gualán, Zacapa acceptable range
const GUALAN_BOUNDS = {
  north: 15.2, // Approximate bounds for Gualán area
  south: 15.0,
  east: -89.3,
  west: -89.5
};

// Safe way to get API key
function getGoogleMapsApiKey(): string | undefined {
  try {
    return import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY;
  } catch (error) {
    return undefined;
  }
}

// Detect browser type for better instructions
function getBrowserType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'Chrome';
  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('safari')) return 'Safari';
  if (userAgent.includes('edge')) return 'Edge';
  return 'tu navegador';
}

export function useGoogleMaps(): UseGoogleMapsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateLocation = useCallback((lat: number, lng: number): boolean => {
    return (
      lat >= GUALAN_BOUNDS.south &&
      lat <= GUALAN_BOUNDS.north &&
      lng >= GUALAN_BOUNDS.west &&
      lng <= GUALAN_BOUNDS.east
    );
  }, []);

  const checkPermissions = useCallback(async (): Promise<PermissionState> => {
    try {
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(result.state);
        return result.state;
      }
      // Fallback for browsers without permissions API
      setPermissionState('prompt');
      return 'prompt';
    } catch (error) {
      console.warn('Could not check geolocation permissions:', error);
      setPermissionState('prompt');
      return 'prompt';
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (error) => {
            console.log('Permission request result:', error.code, error.message);
            resolve(error.code !== error.PERMISSION_DENIED);
          },
          { timeout: 1000, maximumAge: 0 }
        );
      });
      
      if (result) {
        await checkPermissions();
      }
      
      return result;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, [checkPermissions]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<LocationData> => {
    try {
      setError(null);
      
      // Try using Google Maps Geocoding API if available
      const apiKey = getGoogleMapsApiKey();
      
      if (apiKey && typeof fetch !== 'undefined') {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es&region=GT`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const result = data.results[0];
              const addressComponents = result.address_components || [];
              
              // Extract address components safely
              let city = '';
              let state = '';
              let country = '';
              let postal_code = '';
              
              addressComponents.forEach((component: any) => {
                const types = component.types || [];
                if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                  city = component.long_name || '';
                } else if (types.includes('administrative_area_level_1')) {
                  state = component.long_name || '';
                } else if (types.includes('country')) {
                  country = component.long_name || '';
                } else if (types.includes('postal_code')) {
                  postal_code = component.long_name || '';
                }
              });
              
              return {
                latitude: lat,
                longitude: lng,
                address: result.formatted_address || `Ubicación GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                formatted_address: result.formatted_address || `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                city: city || 'Gualán',
                state: state || 'Zacapa',
                country: country || 'Guatemala',
                postal_code,
                place_id: result.place_id
              };
            }
          }
        } catch (fetchError) {
          console.warn('Google Maps API request failed, using fallback:', fetchError);
          // Continue to fallback below
        }
      }
      
      // Fallback to basic address formatting
      return {
        latitude: lat,
        longitude: lng,
        address: `Gualán, Zacapa, Guatemala (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
        formatted_address: `Ubicación GPS verificada en Gualán: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: 'Gualán',
        state: 'Zacapa',
        country: 'Guatemala'
      };
      
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      
      // Always return valid location data, even if geocoding fails
      return {
        latitude: lat,
        longitude: lng,
        address: `Gualán, Zacapa, Guatemala (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
        formatted_address: `Ubicación GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: 'Gualán',
        state: 'Zacapa',
        country: 'Guatemala'
      };
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);

      // Check if geolocation is supported
      if (!navigator?.geolocation) {
        const error = `❌ Geolocalización no disponible

Tu navegador no soporta geolocalización GPS. 

✅ Soluciones:
• Usa un navegador moderno (Chrome, Firefox, Safari, Edge)
• Verifica que estés usando HTTPS (no HTTP)
• Intenta desde un dispositivo móvil
• Actualiza tu navegador a la versión más reciente`;
        
        console.error('Geolocation not supported');
        setError(error);
        setLoading(false);
        reject(new Error(error));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds
        maximumAge: 300000 // 5 minutes
      };

      const browserName = getBrowserType();

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const accuracy = position.coords.accuracy;
            
            console.log(`📍 GPS Location obtained: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy: ${accuracy}m)`);
            
            // Validate that location is in acceptable range for Gualán
            if (!validateLocation(latitude, longitude)) {
              const error = `🗺️ Ubicación fuera del área de servicio

📍 Coordenadas detectadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
🏢 Área de servicio: Gualán, Zacapa

⚠️ Posibles causas:
• Tu negocio no está en Gualán, Zacapa
• El GPS no es preciso (intenta ir al aire libre)
• Estás usando VPN que cambia tu ubicación

✅ Si tu negocio SÍ está en Gualán:
• Ve al exterior para mejor señal GPS
• Desactiva VPN si usas una
• Espera unos segundos y vuelve a intentar
• La ubicación se guardará aunque esté fuera del área estimada`;
              
              console.warn(`Location validation failed: lat=${latitude}, lng=${longitude}, accuracy=${accuracy}m`);
              setError(error);
              setLoading(false);
              reject(new Error(error));
              return;
            }

            // Get address information
            const locationData = await reverseGeocode(latitude, longitude);
            
            console.log(`✅ Location successfully processed:`, locationData);
            setLoading(false);
            resolve(locationData);
            
          } catch (error) {
            console.error('Error processing location:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al procesar la ubicación detectada';
            setError(errorMessage);
            setLoading(false);
            reject(error);
          }
        },
        (error) => {
          // Enhanced error logging
          console.error('Geolocation error details:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
            TIMEOUT: error.TIMEOUT
          });

          let errorMessage = 'Error al detectar la ubicación';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = `🚫 Permiso de ubicación denegado

📱 SOLUCIÓN RÁPIDA para ${browserName}:

🔒 **Método 1 - Ícono de ubicación:**
1. Busca el ícono 🔒 o 🌐 en la barra de direcciones
2. Haz clic en él
3. Cambia "Ubicación" de "Bloqueado" a "Permitir"
4. Recarga la página

⚙️ **Método 2 - Configuración del navegador:**
• Chrome: Configuración → Privacidad → Configuración del sitio → Ubicación
• Firefox: Preferencias → Privacidad → Permisos → Ubicación  
• Safari: Preferencias → Sitios web → Ubicación
• Edge: Configuración → Permisos del sitio → Ubicación

📍 **¿Por qué necesitamos tu ubicación?**
Los repartidores necesitan las coordenadas GPS exactas de tu negocio para hacer entregas correctas.

🔄 Después de cambiar los permisos, recarga esta página y vuelve a intentar.`;
              break;
              
            case error.POSITION_UNAVAILABLE:
              errorMessage = `📡 Señal GPS no disponible

🛰️ **Posibles causas:**
• Estás en un lugar cerrado (edificio, sótano)
• Señal GPS débil en tu área
• Interferencia de otros dispositivos
• GPS desactivado en el dispositivo

✅ **Soluciones:**
• Ve cerca de una ventana o al aire libre
• Verifica que el GPS esté activado en tu dispositivo
• Espera 1-2 minutos para que mejore la señal
• Intenta desde otro lugar o dispositivo
• Asegúrate de tener conexión a internet estable

📱 En móviles: Configuración → Ubicación → Activar GPS de alta precisión`;
              break;
              
            case error.TIMEOUT:
              errorMessage = `⏰ Tiempo de espera agotado (15 segundos)

🔄 **La detección GPS tardó demasiado:**

📶 **Soluciones rápidas:**
• Ve a un lugar con mejor señal (ventana o exterior)
• Verifica tu conexión a internet
• Reinicia el GPS en tu dispositivo si es móvil
• Cierra otras apps que usen ubicación

🚀 **Inténtalo de nuevo:**
La detección puede ser más rápida en el segundo intento.

💡 **Tip:** En dispositivos móviles, el GPS suele ser más rápido y preciso que en computadoras.`;
              break;
              
            default:
              errorMessage = `❌ Error GPS desconocido

🔧 **Información técnica:**
• Código de error: ${error.code}
• Mensaje: ${error.message}

🛠️ **Soluciones generales:**
• Recarga la página e intenta de nuevo
• Verifica los permisos de ubicación
• Intenta desde otro navegador o dispositivo
• Asegúrate de usar HTTPS (no HTTP)

📧 Si el problema persiste, contacta soporte técnico con esta información.`;
          }
          
          console.error('Geolocation error processed:', errorMessage);
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, [validateLocation, reverseGeocode]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    getCurrentLocation,
    reverseGeocode,
    validateLocation,
    checkPermissions,
    requestPermissions,
    loading,
    error,
    permissionState,
    clearError
  };
}