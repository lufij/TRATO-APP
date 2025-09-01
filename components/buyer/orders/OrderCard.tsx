import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../ui/alert-dialog';
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Star, 
  Package,
  Store,
  Utensils,
  Eye,
  RotateCcw,
  XCircle,
  ThumbsUp,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { processImageUrl } from '../../../utils/imageUtils';

// Tipos para las ordenes
interface OrderItem {
  id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  seller_name?: string;
  status: string;
  delivery_type: string;
  total: number;
  created_at: string;
  estimated_time?: number;
  items?: OrderItem[];
  seller_rating?: number;
  driver_rating?: number;
}

interface OrderCardProps {
  order: Order;
  isHistory?: boolean;
  onViewOrder: (orderId: string) => void;
  onDeleteOrder?: (orderId: string, sellerName: string) => void;
  onConfirmReceived?: (orderId: string, sellerName: string) => void;
  onReorderFn?: (orderId: string) => void;
  deletingOrderId?: string | null;
  confirmingOrderId?: string | null;
}

export function OrderCard({ 
  order, 
  isHistory = false, 
  onViewOrder, 
  onDeleteOrder,
  onConfirmReceived, 
  onReorderFn,
  deletingOrderId,
  confirmingOrderId 
}: OrderCardProps) {
  
  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { 
        label: 'Pendiente', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock,
        description: 'Esperando confirmación del vendedor'
      },
      accepted: { 
        label: 'Aceptado', 
        color: 'bg-blue-100 text-blue-800', 
        icon: CheckCircle,
        description: 'El vendedor está preparando tu pedido'
      },
      ready: { 
        label: 'Listo', 
        color: 'bg-green-100 text-green-800', 
        icon: Package,
        description: 'Tu pedido está listo'
      },
      assigned: { 
        label: 'Repartidor asignado', 
        color: 'bg-purple-100 text-purple-800', 
        icon: Truck,
        description: 'Un repartidor fue asignado'
      },
      'picked_up': { 
        label: 'En camino', 
        color: 'bg-orange-100 text-orange-800', 
        icon: Truck,
        description: 'El repartidor está en camino'
      },
      'in-transit': { 
        label: 'En tránsito', 
        color: 'bg-indigo-100 text-indigo-800', 
        icon: Truck,
        description: 'Tu pedido está siendo entregado'
      },
      delivered: { 
        label: 'Entregado', 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle,
        description: 'Tu pedido fue entregado'
      },
      completed: { 
        label: 'Completado', 
        color: 'bg-gray-100 text-gray-800', 
        icon: ThumbsUp,
        description: 'Pedido completado exitosamente'
      },
      cancelled: { 
        label: 'Cancelado', 
        color: 'bg-red-100 text-red-800', 
        icon: XCircle,
        description: 'El pedido fue cancelado'
      },
      rejected: { 
        label: 'Rechazado', 
        color: 'bg-red-100 text-red-800', 
        icon: XCircle,
        description: 'El vendedor rechazó tu pedido'
      }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const getDeliveryTypeInfo = (type: string) => {
    const typeMap = {
      pickup: { label: 'Recoger en tienda', icon: Store, color: 'text-blue-600' },
      'dine-in': { label: 'Comer dentro', icon: Utensils, color: 'text-purple-600' },
      delivery: { label: 'Servicio a domicilio', icon: Truck, color: 'text-green-600' }
    };
    return typeMap[type as keyof typeof typeMap] || typeMap.pickup;
  };

  const getOrderProgress = (status: string) => {
    const progressMap = {
      pending: 10,
      accepted: 25,
      ready: 50,
      assigned: 60,
      'picked_up': 75,
      'in_transit': 85,
      delivered: 95,
      completed: 100,
      cancelled: 0,
      rejected: 0
    };
    return progressMap[status as keyof typeof progressMap] || 0;
  };

  const canDeleteOrder = (status: string) => {
    return status === 'pending';
  };

  const canConfirmReceived = (status: string) => {
    return status === 'delivered';
  };

  const statusInfo = getStatusInfo(order.status);
  const deliveryInfo = getDeliveryTypeInfo(order.delivery_type);
  const progress = getOrderProgress(order.status);
  const StatusIcon = statusInfo.icon;
  const DeliveryIcon = deliveryInfo.icon;
  const canDelete = canDeleteOrder(order.status);
  const canConfirm = canConfirmReceived(order.status);
  const isDeleting = deletingOrderId === order.id;
  const isConfirming = confirmingOrderId === order.id;

  const cardClassName = isHistory 
    ? "border-gray-200 hover:shadow-md transition-shadow"
    : "border-orange-200 shadow-lg hover:shadow-xl transition-shadow";

  const iconBgClassName = isHistory 
    ? "bg-gray-100"
    : "bg-orange-100";

  const iconClassName = isHistory 
    ? "text-gray-600"
    : "text-orange-600";

  return (
    <Card className={cardClassName}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${iconBgClassName} p-2 rounded-lg`}>
              <StatusIcon className={`w-5 h-5 ${iconClassName}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{order.seller_name || 'Vendedor'}</h3>
              <p className="text-sm text-gray-600">
                Pedido #{order.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="text-right flex flex-col items-end gap-2">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <p className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleDateString('es-GT')}
            </p>
            
            {/* Delete Button for Pending Orders */}
            {canDelete && onDeleteOrder && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-8 px-2"
                    disabled={isDeleting}
                    title="Eliminar pedido no confirmado"
                  >
                    {isDeleting ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      ¿Eliminar pedido no confirmado?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Estás a punto de eliminar tu pedido de <strong>{order.seller_name}</strong> por un total de <strong>Q{order.total.toFixed(2)}</strong>.
                      <br /><br />
                      Esta acción no se puede deshacer. El pedido será eliminado permanentemente y no podrás recuperarlo.
                      <br /><br />
                      <span className="text-yellow-600 font-medium">💡 Tip:</span> También puedes esperar a que el vendedor responda a tu pedido.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Mantener pedido
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDeleteOrder(order.id, order.seller_name || 'Vendedor')}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Sí, eliminar pedido
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Progress Bar - Solo para pedidos activos */}
          {!isHistory && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{statusInfo.description}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Delete Warning for Pending Orders */}
          {canDelete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="text-yellow-700 font-medium">
                  Pedido pendiente de confirmación
                </p>
                <p className="text-yellow-600 text-xs mt-1">
                  Si el vendedor no acepta tu pedido o demora mucho en responder, puedes eliminarlo usando el botón 🗑️ arriba.
                </p>
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DeliveryIcon className={`w-4 h-4 ${deliveryInfo.color}`} />
              <span className="text-sm font-medium">{deliveryInfo.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{order.items?.length || 0} productos</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{order.estimated_time || 30} min estimado</span>
            </div>
          </div>

          {/* Order Items Preview */}
          {order.items && order.items.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {order.items.slice(0, isHistory ? 4 : 3).map((item) => (
                <div key={item.id} className="flex-shrink-0 flex items-center gap-2 bg-white border rounded-lg p-2">
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-100">
                    <ImageWithFallback
                      src={processImageUrl(item.product_image) || ''}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium truncate w-24">{item.product_name}</div>
                    <div className="text-gray-500">{item.quantity}x Q{item.price?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              ))}
              {order.items.length > (isHistory ? 4 : 3) && (
                <div className="flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-lg w-16 h-16">
                  <span className="text-sm text-gray-600">+{order.items.length - (isHistory ? 4 : 3)}</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-green-600">
                Q{order.total.toFixed(2)}
              </span>
              
              {/* Show ratings if available (history only) */}
              {isHistory && (order.seller_rating || order.driver_rating) && (
                <div className="flex items-center gap-2">
                  {order.seller_rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm">{order.seller_rating}</span>
                    </div>
                  )}
                  {order.driver_rating && (
                    <div className="flex items-center gap-1">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-sm">{order.driver_rating}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewOrder(order.id)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </Button>

              {/* Confirm Received Button for Delivered Orders */}
              {canConfirm && onConfirmReceived && (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => onConfirmReceived(order.id, order.seller_name || 'Vendedor')}
                  disabled={isConfirming}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar recibido
                    </>
                  )}
                </Button>
              )}

              {/* Reorder Button for History */}
              {isHistory && onReorderFn && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onReorderFn(order.id)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Volver a pedir
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
