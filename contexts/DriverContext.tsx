import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface DriverLocation {
  id: string;
  name: string;
  profile_image?: string;
  vehicle_type: string;
  latitude: number;
  longitude: number;
  is_online: boolean;
  is_verified: boolean;
  rating?: number;
  total_deliveries?: number;
  last_location_update: string;
}

interface DriverContextType {
  availableDrivers: DriverLocation[];
  onlineDriversCount: number;
  isLoading: boolean;
  refreshDrivers: () => Promise<void>;
}

const DriverContext = createContext<DriverContextType | null>(null);

export function useDrivers() {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDrivers must be used within a DriverProvider');
  }
  return context;
}

interface DriverProviderProps {
  children: ReactNode;
}

export function DriverProvider({ children }: DriverProviderProps) {
  const [availableDrivers, setAvailableDrivers] = useState<DriverLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAvailableDrivers = async () => {
    try {
      setIsLoading(true);

      // Obtener repartidores que están en línea y verificados
      const { data: driversData, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          profile_image,
          vehicle_type,
          latitude,
          longitude,
          is_verified,
          is_active,
          drivers!inner (
            is_online,
            rating,
            total_deliveries,
            last_location_update
          )
        `)
        .eq('role', 'repartidor')
        .eq('is_verified', true)
        .eq('is_active', true)
        .eq('drivers.is_online', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Error fetching drivers:', error);
        throw error;
      }

      // Transformar datos para el formato esperado
      const formattedDrivers: DriverLocation[] = driversData?.map(driver => ({
        id: driver.id,
        name: driver.name || 'Repartidor',
        profile_image: driver.profile_image,
        vehicle_type: driver.vehicle_type || 'No especificado',
        latitude: driver.latitude,
        longitude: driver.longitude,
        is_online: driver.drivers?.[0]?.is_online || false,
        is_verified: driver.is_verified,
        rating: driver.drivers?.[0]?.rating || 0,
        total_deliveries: driver.drivers?.[0]?.total_deliveries || 0,
        last_location_update: driver.drivers?.[0]?.last_location_update || new Date().toISOString()
      })) || [];

      setAvailableDrivers(formattedDrivers);
      console.log('Repartidores disponibles actualizados:', formattedDrivers.length);

    } catch (error) {
      console.error('Error fetching available drivers:', error);
      // No mostrar toast de error aquí para evitar spam
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDrivers = async () => {
    await fetchAvailableDrivers();
  };

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    fetchAvailableDrivers();

    // Configurar realtime subscription para cambios en drivers
    const driversSubscription = supabase
      .channel('drivers-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('Driver update received:', payload);
          fetchAvailableDrivers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.repartidor'
        },
        (payload) => {
          console.log('Driver user update received:', payload);
          fetchAvailableDrivers();
        }
      )
      .subscribe();

    // Actualizar cada 30 segundos para mantener datos frescos
    const interval = setInterval(fetchAvailableDrivers, 30000);

    return () => {
      driversSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const onlineDriversCount = availableDrivers.filter(driver => driver.is_online).length;

  const value: DriverContextType = {
    availableDrivers,
    onlineDriversCount,
    isLoading,
    refreshDrivers
  };

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
}
