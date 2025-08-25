import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Badge } from './ui/badge';
import { Truck, Users } from 'lucide-react';

interface OnlineDriversIndicatorProps {
  className?: string;
}

export function OnlineDriversIndicator({ className = '' }: OnlineDriversIndicatorProps) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar cantidad inicial
    loadOnlineDriversCount();

    // Suscripción en tiempo real a cambios en drivers
    const subscription = supabase
      .channel('online-drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todos los eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('🔄 Driver status change detected:', payload);
          // Recargar el conteo cuando hay cualquier cambio en drivers
          loadOnlineDriversCount();
        }
      )
      .subscribe();

    // Actualizar cada 15 segundos como respaldo (más frecuente)
    const interval = setInterval(() => {
      console.log('⏰ Actualizando conteo de repartidores (intervalo)');
      loadOnlineDriversCount();
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadOnlineDriversCount = async () => {
    try {
      console.log('🔍 Cargando cantidad de repartidores en línea...');
      
      // Primero verificar todos los repartidores para debug
      const { data: allDrivers, error: allError } = await supabase
        .from('drivers')
        .select('id, is_online, is_active, updated_at');

      if (allError) {
        console.error('❌ Error obteniendo todos los drivers:', allError);
      } else {
        console.log('📊 Total drivers en tabla:', allDrivers?.length || 0);
        allDrivers?.forEach((driver, i) => {
          console.log(`  ${i+1}. ID: ${driver.id.substring(0,8)}... Online: ${driver.is_online} Active: ${driver.is_active}`);
        });
      }
      
      // Contar repartidores en línea directamente de la tabla drivers
      const { count, error } = await supabase
        .from('drivers')
        .select('id', { count: 'exact', head: true })
        .eq('is_online', true);

      if (error) {
        console.error('❌ Error loading online drivers count:', error);
        
        // Fallback: intentar con consulta alternativa
        const { data: driversData, error: fallbackError } = await supabase
          .from('drivers')
          .select('id, is_online')
          .eq('is_online', true);

        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          return;
        }

        console.log('✅ Fallback query successful, drivers found:', driversData?.length || 0);
        setOnlineCount(driversData?.length || 0);
        return;
      }

      console.log('✅ Online drivers count loaded:', count);
      setOnlineCount(count || 0);
    } catch (error) {
      console.error('❌ Error loading online drivers count:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // No mostrar nada mientras carga
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="flex flex-col gap-2">
        <Badge 
          variant="default" 
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium cursor-pointer"
          onClick={loadOnlineDriversCount} // Click para refrescar manualmente
        >
          <div className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            <Users className="w-4 h-4" />
          </div>
          <span>
            {onlineCount} repartidor{onlineCount !== 1 ? 'es' : ''} en línea
          </span>
          {onlineCount > 0 && (
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse ml-1" />
          )}
        </Badge>
        
        {/* Debug info - solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <Badge 
            variant="outline" 
            className="text-xs text-gray-600 cursor-pointer"
            onClick={() => {
              console.log('🔄 Refrescando conteo manualmente...');
              loadOnlineDriversCount();
            }}
          >
            Click para refrescar
          </Badge>
        )}
      </div>
    </div>
  );
}
