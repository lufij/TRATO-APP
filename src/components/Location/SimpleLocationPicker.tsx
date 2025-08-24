import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Check, AlertTriangle } from 'lucide-react';

interface SimpleLocationProps {
  onLocationConfirmed: (address: string, latitude?: number, longitude?: number) => void;
  currentAddress?: string;
}

export const SimpleLocationPicker: React.FC<SimpleLocationProps> = ({ 
  onLocationConfirmed, 
  currentAddress = '' 
}) => {
  const [address, setAddress] = useState(currentAddress);
  const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const getMyLocation = async () => {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no tiene GPS disponible');
      return;
    }

    setIsGettingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });

      setGpsLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      alert('📍 ¡Ubicación GPS obtenida! Ahora escribe tu dirección exacta.');
      
    } catch (error) {
      console.error('Error getting location:', error);
      alert('No se pudo obtener la ubicación GPS. Asegúrate de permitir el acceso a la ubicación.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const confirmLocation = () => {
    if (!address.trim()) {
      alert('Por favor escribe tu dirección');
      return;
    }

    if (!gpsLocation) {
      alert('Por favor obtén tu ubicación GPS primero');
      return;
    }

    setLocationConfirmed(true);
    onLocationConfirmed(address.trim(), gpsLocation.lat, gpsLocation.lng);
    alert('✅ ¡Ubicación confirmada! Los repartidores podrán encontrarte fácilmente.');
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 max-w-md mx-auto">
      <div className="text-center mb-6">
        <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Mi Ubicación para Entregas</h3>
        <p className="text-gray-600 text-sm">Ayuda a los repartidores a encontrarte fácilmente</p>
      </div>

      {/* Paso 1: Obtener GPS */}
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border-2 ${gpsLocation ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <div className="flex items-center gap-3 mb-3">
            <Navigation className={`w-5 h-5 ${gpsLocation ? 'text-green-600' : 'text-orange-600'}`} />
            <span className={`font-semibold ${gpsLocation ? 'text-green-800' : 'text-orange-800'}`}>
              {gpsLocation ? 'GPS Obtenido' : 'Obtener mi GPS'}
            </span>
          </div>
          
          {gpsLocation ? (
            <div className="text-sm text-green-700">
              <p>✅ Ubicación GPS guardada</p>
              <p className="text-xs mt-1">Lat: {gpsLocation.lat.toFixed(6)}, Lng: {gpsLocation.lng.toFixed(6)}</p>
            </div>
          ) : (
            <button
              onClick={getMyLocation}
              disabled={isGettingLocation}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGettingLocation ? 'Obteniendo GPS...' : '📍 Obtener Mi Ubicación'}
            </button>
          )}
        </div>

        {/* Paso 2: Escribir dirección */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Escribe tu dirección exacta:
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ejemplo: Barrio El Centro, 2 cuadras al norte de la iglesia, casa color verde con portón negro"
          />
          <p className="text-xs text-gray-500">
            💡 Incluye referencias como: color de casa, cerca de qué lugares está, etc.
          </p>
        </div>

        {/* Paso 3: Confirmar */}
        <button
          onClick={confirmLocation}
          disabled={!address.trim() || !gpsLocation || locationConfirmed}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {locationConfirmed ? (
            <>
              <Check className="w-5 h-5" />
              Ubicación Confirmada
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              Confirmar Mi Ubicación
            </>
          )}
        </button>

        {locationConfirmed && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="w-5 h-5" />
              <span className="font-semibold">¡Perfecto!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Tu ubicación está guardada. Los repartidores podrán navegar directamente hasta tu casa.
            </p>
          </div>
        )}

        {/* Ayuda */}
        <div className="text-center space-y-2 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4" />
            <span>¿Por qué necesitamos tu GPS?</span>
          </div>
          <p className="text-xs text-gray-500">
            El GPS ayuda a los repartidores a llegar exactamente a tu ubicación usando Google Maps o Waze, 
            incluso si tu dirección no aparece en los mapas.
          </p>
        </div>
      </div>
    </div>
  );
};
