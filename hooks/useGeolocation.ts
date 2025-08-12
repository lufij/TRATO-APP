import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface GeolocationPosition {
  coords: GeolocationCoordinates;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  details?: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
  immediate?: boolean;
}

interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  supported: boolean;
  permissionState: PermissionState | null;
  getCurrentPosition: () => Promise<GeolocationPosition>;
  clearWatch: () => void;
  requestPermission: () => Promise<PermissionState>;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000, // 5 minutes
};

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  
  const watchId = useRef<number | null>(null);
  const supported = 'geolocation' in navigator;
  
  const positionOptions: PositionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Enhanced error creation with better logging
  const createGeolocationError = useCallback((nativeError: GeolocationPositionError | Error | any, context: string = ''): GeolocationError => {
    let code = 0;
    let message = 'Error desconocido al obtener la ubicación';
    let details = '';

    if (nativeError && typeof nativeError === 'object') {
      // Handle native GeolocationPositionError
      if ('code' in nativeError && typeof nativeError.code === 'number') {
        code = nativeError.code;
        message = getErrorMessage(nativeError.code);
        details = nativeError.message || '';
      } 
      // Handle generic Error objects
      else if ('message' in nativeError) {
        code = 0;
        message = nativeError.message || 'Error genérico';
        details = nativeError.toString();
      }
      // Handle unknown error objects
      else {
        code = 0;
        message = 'Error de formato desconocido';
        details = JSON.stringify(nativeError);
      }
    } else if (typeof nativeError === 'string') {
      code = 0;
      message = nativeError;
      details = nativeError;
    } else {
      code = 0;
      message = 'Error sin información disponible';
      details = String(nativeError);
    }

    const geolocationError: GeolocationError = {
      code,
      message,
      details: details || undefined,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    // Enhanced logging with context
    console.error(`Geolocation Error${context ? ` (${context})` : ''}:`, {
      error: geolocationError,
      originalError: nativeError,
      navigator: {
        geolocation: !!navigator.geolocation,
        permissions: !!navigator.permissions,
        userAgent: navigator.userAgent,
      },
      options: positionOptions
    });

    return geolocationError;
  }, [positionOptions]);

  // Check permission status with enhanced error handling
  const checkPermission = useCallback(async () => {
    if (!('permissions' in navigator)) {
      console.warn('Permissions API not supported in this browser');
      return null;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionState(permission.state);
      
      // Listen for permission changes
      permission.addEventListener('change', () => {
        console.log('Geolocation permission changed to:', permission.state);
        setPermissionState(permission.state);
      });
      
      return permission.state;
    } catch (error) {
      const geolocationError = createGeolocationError(error, 'permission check');
      console.warn('Error checking geolocation permission:', geolocationError);
      return null;
    }
  }, [createGeolocationError]);

  // Request permission explicitly with better error handling
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    return new Promise((resolve, reject) => {
      if (!supported) {
        const error = createGeolocationError(new Error('Geolocation not supported'), 'request permission');
        reject(error);
        return;
      }

      console.log('Requesting geolocation permission...');

      // Try to get current position to trigger permission prompt
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Permission granted via getCurrentPosition');
          setPermissionState('granted');
          resolve('granted');
        },
        (error) => {
          console.log('Permission request error:', error);
          if (error.code === 1) { // PERMISSION_DENIED
            setPermissionState('denied');
            resolve('denied');
          } else {
            setPermissionState('denied');
            const geolocationError = createGeolocationError(error, 'permission request');
            reject(geolocationError);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: Infinity
        }
      );
    });
  }, [supported, createGeolocationError]);

  // Get current position once with enhanced error handling
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!supported) {
        const error = createGeolocationError(
          new Error('Geolocation is not supported by this browser'), 
          'getCurrentPosition - unsupported'
        );
        setError(error);
        reject(error);
        return;
      }

      console.log('Getting current position with options:', positionOptions);
      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('Position obtained successfully:', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });

          const position: GeolocationPosition = {
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            },
            timestamp: pos.timestamp,
          };
          
          setPosition(position);
          setLoading(false);
          setError(null);
          resolve(position);
        },
        (error) => {
          console.error('Failed to get current position:', error);
          const geolocationError = createGeolocationError(error, 'getCurrentPosition');
          setError(geolocationError);
          setLoading(false);
          reject(geolocationError);
        },
        positionOptions
      );
    });
  }, [supported, positionOptions, createGeolocationError]);

  // Clear watch if active
  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      console.log('Clearing geolocation watch:', watchId.current);
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setLoading(false);
  }, []);

  // Start watching position with enhanced error handling
  const startWatch = useCallback(() => {
    if (!supported || watchId.current !== null) {
      console.warn('Cannot start watch: supported=', supported, 'existing watchId=', watchId.current);
      return;
    }

    console.log('Starting geolocation watch with options:', positionOptions);
    setLoading(true);
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        console.log('Watch position update:', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        });

        const position: GeolocationPosition = {
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp,
        };
        
        setPosition(position);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Watch position error:', error);
        const geolocationError = createGeolocationError(error, 'watchPosition');
        setError(geolocationError);
        setLoading(false);
      },
      positionOptions
    );

    console.log('Started geolocation watch with ID:', watchId.current);
  }, [supported, positionOptions, createGeolocationError]);

  // Effect to handle initial setup and cleanup
  useEffect(() => {
    console.log('useGeolocation effect triggered with options:', {
      immediate: options.immediate,
      watch: options.watch,
      supported
    });

    checkPermission();

    if (options.immediate && supported) {
      getCurrentPosition().catch((error) => {
        console.error('Failed to get initial position:', error);
      });
    } else if (options.watch && supported) {
      startWatch();
    }

    return () => {
      console.log('useGeolocation cleanup');
      clearWatch();
    };
  }, [checkPermission, getCurrentPosition, clearWatch, startWatch, options.immediate, options.watch, supported]);

  return {
    position,
    error,
    loading,
    supported,
    permissionState,
    getCurrentPosition,
    clearWatch,
    requestPermission,
  };
}

// Helper function to get human-readable error messages
function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Permisos de ubicación denegados. Por favor, habilita el acceso a tu ubicación en las configuraciones del navegador.';
    case 2:
      return 'Ubicación no disponible. Verifica que tu dispositivo tenga GPS habilitado y que tengas conexión a internet.';
    case 3:
      return 'Tiempo de espera agotado. La búsqueda de ubicación tardó demasiado. Intenta nuevamente.';
    default:
      return 'Error desconocido al obtener la ubicación. Verifica los permisos y configuraciones de tu dispositivo.';
  }
}

// Hook para verificar si la ubicación está disponible y es precisa
export function useLocationAccuracy(position: GeolocationPosition | null, minAccuracy: number = 50) {
  const [isAccurate, setIsAccurate] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (position) {
      const currentAccuracy = position.coords.accuracy;
      setAccuracy(currentAccuracy);
      setIsAccurate(currentAccuracy <= minAccuracy);
    } else {
      setAccuracy(null);
      setIsAccurate(false);
    }
  }, [position, minAccuracy]);

  const getAccuracyLevel = useCallback((accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 20) return 'good';
    if (accuracy <= 50) return 'fair';
    return 'poor';
  }, []);

  const getAccuracyColor = useCallback((level: string): string => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }, []);

  const getAccuracyText = useCallback((accuracy: number): string => {
    const level = getAccuracyLevel(accuracy);
    switch (level) {
      case 'excellent': return `Excelente (±${accuracy.toFixed(0)}m)`;
      case 'good': return `Buena (±${accuracy.toFixed(0)}m)`;
      case 'fair': return `Regular (±${accuracy.toFixed(0)}m)`;
      case 'poor': return `Pobre (±${accuracy.toFixed(0)}m)`;
    }
  }, [getAccuracyLevel]);

  return {
    isAccurate,
    accuracy,
    getAccuracyLevel: accuracy ? getAccuracyLevel(accuracy) : null,
    getAccuracyColor: accuracy ? getAccuracyColor(getAccuracyLevel(accuracy)) : 'text-gray-500',
    getAccuracyText: accuracy ? getAccuracyText(accuracy) : 'Sin datos de precisión',
  };
}