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
      
      // Método 1: Usar función RPC simplificada (solo is_online)
      try {
        const { data: countResult, error: countError } = await supabase
          .rpc('get_online_drivers_count');

        if (!countError && typeof countResult === 'number') {
          console.log('✅ Drivers online (función RPC):', countResult);
          setOnlineCount(countResult);
          return;
        } else {
          console.warn('⚠️ Función RPC falló:', countError?.message);
        }
      } catch (rpcError) {
        console.warn('⚠️ Error en RPC:', rpcError);
      }

      // Método 2: Consulta directa solo con is_online
      try {
        const { count, error: directError } = await supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .eq('is_online', true);

        if (!directError) {
          console.log('✅ Drivers online (consulta directa):', count);
          setOnlineCount(count || 0);
          return;
        } else {
          console.warn('⚠️ Consulta directa falló:', directError.message);
        }
      } catch (directError) {
        console.warn('⚠️ Error en consulta directa:', directError);
      }

      // Método 3: Fallback - obtener todos y filtrar solo por is_online
      try {
        const { data: allDrivers, error: fallbackError } = await supabase
          .from('drivers')
          .select('is_online')
          .limit(50); // Limitar para evitar sobrecarga

        if (!fallbackError && allDrivers) {
          const onlineCount = allDrivers.filter(d => d.is_online).length;
          console.log('✅ Drivers online (fallback):', onlineCount);
          setOnlineCount(onlineCount);
          return;
        } else {
          console.error('❌ Fallback también falló:', fallbackError?.message);
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError);
      }

      // Si todo falla, mostrar 0
      console.error('❌ Todos los métodos fallaron, mostrando 0');
      setOnlineCount(0);

    } catch (error) {
      console.error('❌ Error general:', error);
      setOnlineCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // No mostrar nada mientras carga
  }

  return (
    <div className="fixed top-16 right-4 z-50">
      <div className="flex flex-col gap-1">
        <Badge 
          variant="default" 
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 shadow-md flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105"
          onClick={loadOnlineDriversCount} // Click para refrescar manualmente
        >
          <div className="flex items-center gap-0.5">
            <Truck className="w-3 h-3" />
            <Users className="w-3 h-3" />
          </div>
          <span className="text-xs leading-tight">
            {onlineCount} en línea
          </span>
          {onlineCount > 0 && (
            <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse ml-0.5" />
          )}
        </Badge>
        
        {/* Debug info - solo en desarrollo - MÁS PEQUEÑO */}
        {process.env.NODE_ENV === 'development' && (
          <Badge 
            variant="outline" 
            className="text-xs text-gray-500 cursor-pointer px-1.5 py-0.5 h-5"
            onClick={() => {
              console.log('🔄 Refrescando conteo manualmente...');
              loadOnlineDriversCount();
            }}
          >
            ↻
          </Badge>
        )}
      </div>
    </div>
  );
}
