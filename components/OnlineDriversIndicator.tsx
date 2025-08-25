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
          event: '*',
          schema: 'public',
          table: 'drivers',
          filter: 'is_online=eq.true'
        },
        () => {
          loadOnlineDriversCount();
        }
      )
      .subscribe();

    // Actualizar cada 30 segundos como respaldo
    const interval = setInterval(loadOnlineDriversCount, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadOnlineDriversCount = async () => {
    try {
      // Contar repartidores en línea usando la vista que creamos
      const { count, error } = await supabase
        .from('public_drivers')
        .select('id', { count: 'exact', head: true })
        .eq('is_online', true);

      if (error) {
        console.error('Error loading online drivers count:', error);
        return;
      }

      setOnlineCount(count || 0);
    } catch (error) {
      console.error('Error loading online drivers count:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // No mostrar nada mientras carga
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <Badge 
        variant="default" 
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium"
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
    </div>
  );
}
