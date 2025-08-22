import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  MapPin, 
  Target, 
  RotateCcw, 
  CheckCircle, 
  Loader2,
  Satellite,
  Map as MapIcon,
  Navigation,
  Crosshair
} from 'lucide-react';
import { toast } from 'sonner';

interface MapSelectorProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    source: 'map_selection' | 'gps_confirmation';
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  className?: string;
}

interface GoogleMapsInstance {
  map: any;
  marker: any;
  geocoder: any;
}

export function MapSelector({ onLocationSelect, initialLocation, className }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapsRef = useRef<GoogleMapsInstance | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isGeolocating, setIsGeolocating] = useState(false);

  // Default location (Gualán, Zacapa)
  const defaultLocation = { latitude: 15.1167, longitude: -89.3667 };

  // Initialize Google Maps
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const location = selectedLocation || defaultLocation;
      
      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: location.latitude, lng: location.longitude },
        zoom: 15,
        mapTypeId: mapType,
        mapTypeControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      // Create marker
      const marker = new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        draggable: true,
        title: 'Arrastra para seleccionar ubicación exacta'
      });

      // Create geocoder
      const geocoder = new window.google.maps.Geocoder();

      // Store references
      googleMapsRef.current = { map, marker, geocoder };

      // Handle marker drag
      marker.addListener('dragend', async () => {
        const position = marker.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          setSelectedLocation({ latitude: lat, longitude: lng });
          await reverseGeocodeLocation(lat, lng);
        }
      });

      // Handle map click
      map.addListener('click', async (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        marker.setPosition({ lat, lng });
        setSelectedLocation({ latitude: lat, longitude: lng });
        await reverseGeocodeLocation(lat, lng);
      });

      // Initial reverse geocoding
      if (location) {
        await reverseGeocodeLocation(location.latitude, location.longitude);
      }

      setIsLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Error al cargar el mapa');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, mapType]);

  // Reverse geocode location
  const reverseGeocodeLocation = async (lat: number, lng: number) => {
    const { geocoder } = googleMapsRef.current || {};
    if (!geocoder) return;

    try {
      const result = await new Promise<any>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          if (status === 'OK' && results?.[0]) {
            resolve(results[0]);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      setCurrentAddress(result.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setCurrentAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  // Get current GPS location
  const getCurrentLocation = async () => {
    setIsGeolocating(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      const newLocation = { latitude, longitude };
      
      setSelectedLocation(newLocation);
      
      // Update map and marker
      if (googleMapsRef.current) {
        const { map, marker } = googleMapsRef.current;
        const latLng = { lat: latitude, lng: longitude };
        
        map.setCenter(latLng);
        map.setZoom(17); // Closer zoom for GPS location
        marker.setPosition(latLng);
        
        await reverseGeocodeLocation(latitude, longitude);
      }
      
      toast.success('Ubicación GPS detectada');
    } catch (error) {
      console.error('Geolocation error:', error);
      toast.error('No se pudo obtener la ubicación GPS');
    } finally {
      setIsGeolocating(false);
    }
  };

  // Reset to default location
  const resetToDefault = () => {
    setSelectedLocation(defaultLocation);
    
    if (googleMapsRef.current) {
      const { map, marker } = googleMapsRef.current;
      const latLng = { lat: defaultLocation.latitude, lng: defaultLocation.longitude };
      
      map.setCenter(latLng);
      map.setZoom(15);
      marker.setPosition(latLng);
      
      reverseGeocodeLocation(defaultLocation.latitude, defaultLocation.longitude);
    }
  };

  // Toggle map type
  const toggleMapType = () => {
    const newType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(newType);
    
    if (googleMapsRef.current?.map) {
      googleMapsRef.current.map.setMapTypeId(newType);
    }
  };

  // Confirm location selection
  const confirmLocation = () => {
    if (!selectedLocation) {
      toast.error('Selecciona una ubicación primero');
      return;
    }

    onLocationSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: currentAddress,
      accuracy: 5, // Map selection is considered high accuracy
      source: 'map_selection'
    });

    toast.success('Ubicación confirmada');
  };

  // Initialize when Google Maps loads
  useEffect(() => {
    if (window.google?.maps && !isLoaded) {
      initializeMap();
    }

    const handleMapsLoaded = () => {
      if (window.google?.maps && !isLoaded) {
        initializeMap();
      }
    };

    window.addEventListener('google-maps-loaded', handleMapsLoaded);
    return () => window.removeEventListener('google-maps-loaded', handleMapsLoaded);
  }, [initializeMap, isLoaded]);

  if (!window.google?.maps && isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cargando Google Maps...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-blue-500" />
          Seleccionar Ubicación en Mapa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Container */}
        <div className="relative">
          <div 
            ref={mapRef} 
            className="w-full h-64 rounded-lg border border-gray-200"
            style={{ minHeight: '300px' }}
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Cargando mapa...</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={isGeolocating}
            className="flex items-center gap-2"
          >
            {isGeolocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            Mi ubicación GPS
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleMapType}
            className="flex items-center gap-2"
          >
            {mapType === 'roadmap' ? (
              <Satellite className="w-4 h-4" />
            ) : (
              <MapIcon className="w-4 h-4" />
            )}
            {mapType === 'roadmap' ? 'Satélite' : 'Mapa'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </Button>
        </div>

        {/* Location Info */}
        {selectedLocation && (
          <Alert>
            <MapPin className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Ubicación seleccionada:</p>
                <p className="text-sm">{currentAddress}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Lat: {selectedLocation.latitude.toFixed(6)}</span>
                  <span>Lng: {selectedLocation.longitude.toFixed(6)}</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Haz clic en el mapa para seleccionar una ubicación</p>
          <p>• Arrastra el marcador para ajustar la posición</p>
          <p>• Usa "Mi ubicación GPS" para detectar tu posición actual</p>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={confirmLocation}
          disabled={!selectedLocation}
          className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Confirmar Ubicación Seleccionada
        </Button>
      </CardContent>
    </Card>
  );
}
