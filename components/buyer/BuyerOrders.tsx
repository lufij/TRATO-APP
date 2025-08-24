import React, { useState } from 'react';
import { useOrder } from '../../contexts/OrderContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { 
  ShoppingCart, 
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
import { processImageUrl } from '../../utils/imageUtils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { OrderTracking } from './OrderTracking';
import { toast } from 'sonner';

interface BuyerOrdersProps {
  onViewOrder?: (orderId: string) => void;
}

export function BuyerOrders({ onViewOrder }: BuyerOrdersProps) {
  const { orders, loading, refreshOrders, deleteUnconfirmedOrder } = useOrder();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (onViewOrder) {
      onViewOrder(orderId);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderName: string) => {
    setDeletingOrderId(orderId);
    
    try {
      const result = await deleteUnconfirmedOrder(orderId);
      
      if (result.success) {
        toast.success('Pedido eliminado', {
          description: `El pedido de ${orderName} ha sido eliminado exitosamente.`,
          duration: 4000,
        });
        await refreshOrders(); // Refresh the orders list
      } else {
        toast.error('Error', {
          description: result.message || 'No se pudo eliminar el pedido.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Error', {
        description: 'Error inesperado al eliminar el pedido.',
        duration: 5000,
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

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
      'picked-up': { 
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
      'picked-up': 75,
      'in-transit': 85,
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

  // Pedidos activos: todos excepto entregados, completados, cancelados o rechazados
  const activeOrders = orders.filter(order => 
    !['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status)
  );

  // Historial: pedidos entregados, completados, cancelados o rechazados
  const historyOrders = orders.filter(order => 
    ['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status)
  );

  // Show order tracking if an order is selected
  if (selectedOrderId) {
    return (
      <OrderTracking 
        orderId={selectedOrderId} 
        onBack={() => setSelectedOrderId(null)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-orange-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              Mis Pedidos
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-96 mx-auto bg-white border border-orange-200">
          <TabsTrigger value="active" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
            Activos ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700">
            Historial ({historyOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Orders */}
        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes pedidos activos
              </h3>
              <p className="text-gray-500">
                Tus pedidos en proceso aparecerán aquí
              </p>
            </Card>
          ) : (
            activeOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const deliveryInfo = getDeliveryTypeInfo(order.delivery_type);
              const progress = getOrderProgress(order.status);
              const StatusIcon = statusInfo.icon;
              const DeliveryIcon = deliveryInfo.icon;
              const canDelete = canDeleteOrder(order.status);
              const isDeleting = deletingOrderId === order.id;

              return (
                <Card key={order.id} className="border-orange-200 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg">
                          <StatusIcon className="w-5 h-5 text-orange-600" />
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
                        {/* Delete Button for Pending Orders - Mini Version */}
                        {canDelete && (
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
                                  onClick={() => handleDeleteOrder(order.id, order.seller_name || 'Vendedor')}
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
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{statusInfo.description}</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

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
                          <span className="text-sm">{order.estimated_time} min estimado</span>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      {order.items && order.items.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {order.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex-shrink-0 flex items-center gap-2 bg-white p-2 rounded border">
                              <div className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                                <ImageWithFallback
                                  src={processImageUrl(item.product_image) || ''}
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="text-xs">
                                <div className="font-medium truncate w-20">{item.product_name}</div>
                                <div className="text-gray-500">{item.quantity}x</div>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="flex-shrink-0 flex items-center justify-center bg-gray-100 rounded w-12 h-12">
                              <span className="text-xs text-gray-600">+{order.items.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection/Cancellation Reason */}
                      {(order.status === 'rejected' || order.status === 'cancelled') && order.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-700">
                            <strong>{order.status === 'rejected' ? 'Rechazado:' : 'Cancelado:'}</strong> {order.rejection_reason}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold text-green-600">
                            Total: Q{order.total.toFixed(2)}
                          </p>
                          {order.delivery_fee > 0 && (
                            <p className="text-sm text-gray-500">
                              Incluye Q{order.delivery_fee.toFixed(2)} de entrega
                            </p>
                          )}
                        </div>
                        <Button 
                          onClick={() => handleViewOrder(order.id)}
                          className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Seguimiento
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Order History */}
        <TabsContent value="history" className="space-y-4">
          {historyOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes historial de pedidos
              </h3>
              <p className="text-gray-500">
                Tus pedidos completados aparecerán aquí
              </p>
            </Card>
          ) : (
            historyOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const deliveryInfo = getDeliveryTypeInfo(order.delivery_type);
              const StatusIcon = statusInfo.icon;
              const DeliveryIcon = deliveryInfo.icon;

              return (
                <Card key={order.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <StatusIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{order.seller_name || 'Vendedor'}</h3>
                          <p className="text-sm text-gray-600">
                            Pedido #{order.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(order.created_at).toLocaleDateString('es-GT')}
                        </p>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    {order.items && order.items.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto mb-4">
                        {order.items.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex-shrink-0 flex items-center gap-2 bg-gray-50 p-2 rounded">
                            <div className="w-8 h-8 rounded overflow-hidden bg-gray-100">
                              <ImageWithFallback
                                src={processImageUrl(item.product_image) || ''}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-xs">
                              <div className="font-medium truncate w-20">{item.product_name}</div>
                              <div className="text-gray-500">{item.quantity}x</div>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className="flex-shrink-0 flex items-center justify-center bg-gray-100 rounded w-12 h-12">
                            <span className="text-xs text-gray-600">+{order.items.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <DeliveryIcon className={`w-4 h-4 ${deliveryInfo.color}`} />
                          <span className="text-sm">{deliveryInfo.label}</span>
                        </div>
                        <span className="text-lg font-semibold text-green-600">
                          Q{order.total.toFixed(2)}
                        </span>
                        
                        {/* Show ratings if available */}
                        {(order.seller_rating || order.driver_rating) && (
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
                          onClick={() => handleViewOrder(order.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalles
                        </Button>

                        <Button variant="outline" size="sm">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Volver a pedir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}