import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Navigation, Clock, Phone, MessageCircle } from 'lucide-react';

interface DeliveryTrackingProps {
  orderId: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  driver_id: string;
  order_id: string;
}

export function DeliveryTracking({ orderId, onLocationUpdate }: DeliveryTrackingProps) {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);

  // 🚨 NOTIFICACIÓN FALTANTE: Tracking en tiempo real del repartidor
  const startLocationTracking = useCallback(() => {
    if (!user || user.role !== 'repartidor' || !navigator.geolocation) {
      console.warn('Geolocation not supported or user not a driver');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 30 segundos máximo
    };

    const handleLocationUpdate = async (position: GeolocationPosition) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: position.coords.accuracy,
        driver_id: user.id,
        order_id: orderId
      };

      setCurrentLocation(locationData);
      onLocationUpdate?.(locationData.latitude, locationData.longitude);

      try {
        // Guardar ubicación en la base de datos
        await supabase.from('driver_locations').upsert({
          driver_id: user.id,
          order_id: orderId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: locationData.timestamp,
          accuracy: locationData.accuracy
        });

        // 🚨 NUEVA FUNCIONALIDAD: Notificar al comprador cuando esté cerca
        await checkProximityAndNotify(locationData);

      } catch (error) {
        console.error('Error saving location:', error);
      }
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.error('Location error:', error);
      setIsTracking(false);
    };

    const id = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      options
    );

    setWatchId(id);
    setIsTracking(true);
  }, [user, orderId, onLocationUpdate]);

  // 🚨 NUEVA FUNCIONALIDAD: Verificar proximidad y notificar
  const checkProximityAndNotify = async (driverLocation: LocationData) => {
    try {
      // Obtener información de la orden
      const { data: order } = await supabase
        .from('orders')
        .select('delivery_latitude, delivery_longitude, buyer_id, customer_name')
        .eq('id', orderId)
        .single();

      if (!order || !order.delivery_latitude || !order.delivery_longitude) {
        return;
      }

      // Calcular distancia
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        order.delivery_latitude,
        order.delivery_longitude
      );

      setDistance(distance);

      // 🚨 NOTIFICACIÓN CRÍTICA: Repartidor cerca (500m)
      if (distance <= 0.5 && distance > 0.3) {
        try {
          await supabase.from('notifications').insert({
            recipient_id: order.buyer_id,
            type: 'driver_nearby',
            title: 'Repartidor cerca',
            message: 'Tu repartidor está a menos de 500 metros de tu ubicación',
            data: { 
              order_id: orderId,
              distance: Math.round(distance * 1000), // metros
              driver_id: user?.id
            }
          });
          console.log('🔔 Notificación enviada: Repartidor cerca');
        } catch (error) {
          console.error('Error sending proximity notification:', error);
        }
      }

      // 🚨 NOTIFICACIÓN CRÍTICA: Repartidor llegó (100m)
      if (distance <= 0.1) {
        try {
          await supabase.from('notifications').insert({
            recipient_id: order.buyer_id,
            type: 'driver_arrived',
            title: 'Repartidor llegó',
            message: 'Tu repartidor ha llegado a tu ubicación',
            data: { 
              order_id: orderId,
              driver_id: user?.id
            }
          });
          console.log('🔔 Notificación enviada: Repartidor llegó');
        } catch (error) {
          console.error('Error sending arrival notification:', error);
        }
      }

      // Calcular tiempo estimado de llegada
      if (distance > 0.1) {
        const avgSpeed = 25; // 25 km/h promedio en ciudad
        const timeInHours = distance / avgSpeed;
        const timeInMinutes = Math.ceil(timeInHours * 60);
        setEstimatedArrival(`${timeInMinutes} min`);
      } else {
        setEstimatedArrival('Llegando...');
      }

    } catch (error) {
      console.error('Error checking proximity:', error);
    }
  };

  // Calcular distancia entre dos puntos (fórmula Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
  };

  const stopLocationTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  }, [watchId]);

  // 🚨 NUEVA FUNCIONALIDAD: Notificar problemas de ubicación
  const reportLocationIssue = async () => {
    if (!user) return;

    try {
      const { data: order } = await supabase
        .from('orders')
        .select('buyer_id, seller_id, customer_name')
        .eq('id', orderId)
        .single();

      if (order) {
        // Notificar al comprador
        await supabase.from('notifications').insert({
          recipient_id: order.buyer_id,
          type: 'delivery_issue',
          title: 'Problema con la entrega',
          message: 'El repartidor reportó dificultades para encontrar tu ubicación',
          data: { 
            order_id: orderId,
            driver_id: user.id,
            issue_type: 'location_not_found'
          }
        });

        // Notificar al vendedor
        await supabase.from('notifications').insert({
          recipient_id: order.seller_id,
          type: 'delivery_issue',
          title: 'Problema de entrega',
          message: `Problema reportado en entrega para ${order.customer_name}`,
          data: { 
            order_id: orderId,
            driver_id: user.id,
            issue_type: 'location_not_found'
          }
        });

        console.log('🔔 Problema de ubicación reportado');
      }
    } catch (error) {
      console.error('Error reporting location issue:', error);
    }
  };

  useEffect(() => {
    // Auto-iniciar tracking si es repartidor
    if (user?.role === 'repartidor') {
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [user, startLocationTracking, stopLocationTracking]);

  // Suscribirse a actualizaciones de ubicación del repartidor (para compradores)
  useEffect(() => {
    if (!user || user.role === 'repartidor') return;

    const subscription = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const locationData = payload.new as LocationData;
          setCurrentLocation(locationData);
          onLocationUpdate?.(locationData.latitude, locationData.longitude);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, orderId, onLocationUpdate]);

  if (user?.role !== 'repartidor' && !currentLocation) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Esperando ubicación del repartidor...
            </p>
            <p className="text-xs text-blue-600">
              Te notificaremos cuando tu pedido esté en camino
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Tracking en vivo</h3>
        {user?.role === 'repartidor' && (
          <div className="flex items-center space-x-2">
            {isTracking ? (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">Activo</span>
              </div>
            ) : (
              <span className="text-xs text-gray-500">Inactivo</span>
            )}
          </div>
        )}
      </div>

      {currentLocation && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Navigation className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Ubicación actual</p>
              <p className="text-xs text-gray-600">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              {currentLocation.accuracy && (
                <p className="text-xs text-gray-500">
                  Precisión: ±{Math.round(currentLocation.accuracy)}m
                </p>
              )}
            </div>
          </div>

          {distance !== null && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Distancia: {distance.toFixed(2)} km
                </p>
                {estimatedArrival && (
                  <p className="text-xs text-gray-600">
                    Tiempo estimado: {estimatedArrival}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4 text-gray-600" />
            <div>
              <p className="text-xs text-gray-600">
                Última actualización: {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'repartidor' && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={reportLocationIssue}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">Reportar problema</span>
            </button>
            
            <button
              onClick={() => {/* Implementar llamada */}}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">Llamar cliente</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
