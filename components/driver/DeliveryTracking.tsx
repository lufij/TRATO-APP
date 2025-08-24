import React from 'react';
import { DeliveryOrder } from '../../hooks/useDeliverySystem';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Navigation,
  CheckCircle,
  AlertCircle,
  Timer
} from 'lucide-react';

interface DeliveryTrackingProps {
  delivery: DeliveryOrder;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<boolean>;
  onOpenMap: (address: string) => void;
  onCallCustomer: (phone: string) => void;
  isProcessing: boolean;
}

export function DeliveryTracking({
  delivery,
  onUpdateStatus,
  onOpenMap,
  onCallCustomer,
  isProcessing
}: DeliveryTrackingProps) {
  
  // Determinar el siguiente paso en el flujo
  const getNextAction = () => {
    switch (delivery.status) {
      case 'assigned':
        return {
          action: 'picked_up',
          label: 'Marcar como Recogido',
          icon: Package,
          color: 'bg-orange-500 hover:bg-orange-600',
          description: 'He recogido el pedido y salgo hacia el cliente'
        };
      case 'picked_up':
        return {
          action: 'in_transit',
          label: 'En Camino al Cliente',
          icon: Truck,
          color: 'bg-blue-500 hover:bg-blue-600',
          description: 'Voy en camino hacia la dirección de entrega'
        };
      case 'in_transit':
        return {
          action: 'delivered',
          label: 'Marcar como Entregado',
          icon: CheckCircle,
          color: 'bg-green-500 hover:bg-green-600',
          description: 'He entregado el pedido al cliente'
        };
      default:
        return null;
    }
  };

  // Calcular el tiempo transcurrido
  const getTimeElapsed = () => {
    const startTime = delivery.assigned_at || delivery.created_at;
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
    return elapsed;
  };

  // Determinar el progreso del estado
  const getStatusProgress = () => {
    const steps = ['assigned', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = steps.indexOf(delivery.status);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const nextAction = getNextAction();
  const timeElapsed = getTimeElapsed();
  const progress = getStatusProgress();

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">
              Pedido #{delivery.order_id.slice(0, 8)}
            </CardTitle>
            <p className="text-sm text-gray-600 font-medium">{delivery.business_name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              Q{delivery.delivery_fee.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600">Tu ganancia</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Progreso de entrega</span>
            <span>{Math.round(progress)}% completado</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between mt-3">
          <Badge className={`px-3 py-1 font-medium ${
            delivery.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
            delivery.status === 'picked_up' ? 'bg-orange-100 text-orange-800' :
            delivery.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
            'bg-green-100 text-green-800'
          }`}>
            {delivery.status === 'assigned' ? '📋 Asignado' :
             delivery.status === 'picked_up' ? '📦 Recogido' :
             delivery.status === 'in_transit' ? '🚚 En Tránsito' :
             '✅ Entregado'}
          </Badge>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Timer className="w-4 h-4" />
            <span>{timeElapsed} min</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información de Recogida y Entrega */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pickup */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-600 font-medium">
              <Package className="w-4 h-4" />
              <span>Recoger en:</span>
            </div>
            <p className="text-sm text-gray-700 pl-6">{delivery.pickup_address}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-6 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
              onClick={() => onOpenMap(delivery.pickup_address)}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Ir a recoger
            </Button>
          </div>

          {/* Delivery */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <MapPin className="w-4 h-4" />
              <span>Entregar en:</span>
            </div>
            <p className="text-sm text-gray-700 pl-6">{delivery.delivery_address}</p>
            <div className="flex items-center gap-2 pl-6">
              <User className="w-3 h-3 text-gray-500" />
              <span className="text-sm text-gray-600">{delivery.customer_name}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-6 text-xs border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => onOpenMap(delivery.delivery_address)}
            >
              <Navigation className="w-3 h-3 mr-1" />
              Ir a entregar
            </Button>
          </div>
        </div>

        {/* Información del Pedido */}
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Total del pedido:</span>
              <span className="font-semibold text-gray-900">Q{delivery.total_amount.toFixed(2)}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              onClick={() => onCallCustomer(delivery.customer_phone)}
            >
              <Phone className="w-3 h-3 mr-1" />
              Llamar cliente
            </Button>
          </div>
        </div>

        {/* Instrucciones según el estado */}
        {delivery.status === 'assigned' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Siguiente paso:</h4>
                <p className="text-sm text-blue-700">
                  Ve al negocio, recoge el pedido y confirma cuando lo tengas listo.
                </p>
              </div>
            </div>
          </div>
        )}

        {delivery.status === 'picked_up' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">Pedido recogido:</h4>
                <p className="text-sm text-orange-700">
                  Dirígete hacia el cliente y marca cuando estés en camino.
                </p>
              </div>
            </div>
          </div>
        )}

        {delivery.status === 'in_transit' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">En camino:</h4>
                <p className="text-sm text-purple-700">
                  Entrega el pedido al cliente y confirma cuando haya sido entregado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de Acción Principal */}
        {nextAction && (
          <Button 
            onClick={() => onUpdateStatus(delivery.id, nextAction.action)}
            disabled={isProcessing}
            className={`w-full h-12 text-base font-semibold ${nextAction.color} text-white`}
          >
            <nextAction.icon className="w-5 h-5 mr-2" />
            {isProcessing ? 'Procesando...' : nextAction.label}
          </Button>
        )}

        {/* Información adicional */}
        <div className="text-xs text-gray-500 text-center">
          <p>Tiempo estimado: {delivery.estimated_time || 30} minutos</p>
          {delivery.assigned_at && (
            <p>Asignado: {new Date(delivery.assigned_at).toLocaleTimeString('es-GT')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
