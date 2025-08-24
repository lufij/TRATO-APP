import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Store, 
  UtensilsCrossed,
  User,
  Phone,
  MapPin,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Package,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  buyer_id: string;
  customer_name: string;
  customer_phone: string;
  phone_number: string;
  total: number;
  total_amount: number; // Campo adicional para compatibilidad
  subtotal: number;
  delivery_fee: number;
  delivery_type: 'pickup' | 'dine-in' | 'delivery';
  delivery_address?: string;
  customer_notes?: string;
  status: string;
  payment_method: string;
  estimated_time: number;
  created_at: string;
  updated_at: string;
  order_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price_per_unit: number;
    total_price: number;
    notes?: string;
  }>;
}

export function SellerOrderManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);

  // Helper function para obtener el total correcto
  const getOrderTotal = (order: Order): number => {
    return order.total_amount || order.total || 0;
  };

  const runDiagnostic = async () => {
    if (!user) return;
    
    console.log('🔍 EJECUTANDO DIAGNÓSTICO DE ÓRDENES');
    console.log('=====================================');
    
    try {
      // 1. Verificar perfil del usuario
      console.log('👤 Usuario actual:', { id: user.id, email: user.email, role: user.role });
      
      // 2. Verificar todas las órdenes recientes
      const { data: allOrders, error: allError } = await supabase
        .from('orders')
        .select('id, seller_id, buyer_id, customer_name, total, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allError) {
        console.error('❌ Error consultando todas las órdenes:', allError);
      } else {
        console.log(`📊 Total órdenes recientes encontradas: ${allOrders?.length || 0}`);
        allOrders?.forEach((order, index) => {
          console.log(`${index + 1}. ID: ${order.id}`);
          console.log(`   Seller: ${order.seller_id || 'NULL'}`);
          console.log(`   Buyer: ${order.buyer_id || 'NULL'}`);
          console.log(`   Customer: ${order.customer_name || 'N/A'}`);
          console.log(`   Status: ${order.status || 'N/A'}`);
          console.log('   ---');
        });
      }
      
      // 3. Verificar órdenes sin seller_id
      const { data: orphanOrders, error: orphanError } = await supabase
        .from('orders')
        .select('*')
        .is('seller_id', null)
        .order('created_at', { ascending: false });
      
      if (orphanError) {
        console.error('❌ Error consultando órdenes huérfanas:', orphanError);
      } else {
        console.log(`🚨 Órdenes sin seller_id: ${orphanOrders?.length || 0}`);
        
        if (orphanOrders && orphanOrders.length > 0) {
          const shouldAssign = confirm(`Se encontraron ${orphanOrders.length} órdenes sin vendedor asignado. ¿Quieres asignarlas a tu cuenta?`);
          
          if (shouldAssign) {
            console.log('🔧 Asignando órdenes huérfanas...');
            
            for (const order of orphanOrders) {
              try {
                const { error: updateError } = await supabase
                  .from('orders')
                  .update({ seller_id: user.id })
                  .eq('id', order.id);
                
                if (updateError) {
                  console.error(`❌ Error asignando orden ${order.id}:`, updateError);
                } else {
                  console.log(`✅ Orden ${order.id} asignada exitosamente`);
                }
              } catch (err) {
                console.error(`❌ Error:`, err);
              }
            }
            
            toast.success(`${orphanOrders.length} órdenes fueron asignadas a tu cuenta`);
            
            // Recargar órdenes
            setTimeout(() => {
              fetchOrders();
            }, 1000);
          }
        }
      }
      
      // 4. Verificar productos del vendedor
      const { data: myProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, seller_id')
        .eq('seller_id', user.id);
      
      if (productsError) {
        console.error('❌ Error consultando productos:', productsError);
      } else {
        console.log(`📦 Mis productos: ${myProducts?.length || 0}`);
      }
      
      console.log('🎉 Diagnóstico completado. Revisa la consola para más detalles.');
      toast.success('Diagnóstico completado. Revisa la consola del navegador.');
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      toast.error('Error durante el diagnóstico');
    }
  };

  const fetchOrders = async () => {
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Cargando órdenes para vendedor:', user.id);
      console.log('👤 Datos del usuario:', { id: user.id, email: user.email, role: user.role });
      
      // Primero verificar TODAS las órdenes (para debug)
      const { data: allOrdersDebug, error: debugError } = await supabase
        .from('orders')
        .select('id, seller_id, buyer_id, customer_name, total, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (debugError) {
        console.error('❌ Error en consulta debug:', debugError);
      } else {
        console.log('🔍 DEBUG - Últimas 10 órdenes en la BD:');
        allOrdersDebug?.forEach((order, index) => {
          console.log(`${index + 1}. ID: ${order.id}`);
          console.log(`   Seller ID: ${order.seller_id || 'NULL'}`);
          console.log(`   Buyer ID: ${order.buyer_id || 'NULL'}`);
          console.log(`   Customer: ${order.customer_name || 'Sin nombre'}`);
          console.log(`   Total: ${order.total_amount || order.total || 0}`);
          console.log(`   Status: ${order.status || 'Sin status'}`);
          console.log('   ---');
        });
      }
      
      // Consulta principal para el vendedor
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            price,
            price_per_unit,
            total_price,
            notes
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error en consulta principal de órdenes:', error);
        throw error;
      }
      
      console.log('✅ Órdenes encontradas para este vendedor:', data?.length || 0);
      
      // Si no hay órdenes, intentar buscar órdenes sin seller_id
      if (!data || data.length === 0) {
        console.log('⚠️  No se encontraron órdenes para este vendedor. Buscando órdenes sin seller_id...');
        
        const { data: orphanOrders, error: orphanError } = await supabase
          .from('orders')
          .select('*')
          .is('seller_id', null)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (orphanError) {
          console.error('❌ Error buscando órdenes huérfanas:', orphanError);
        } else {
          console.log(`🔍 Órdenes sin seller_id encontradas: ${orphanOrders?.length || 0}`);
          if (orphanOrders && orphanOrders.length > 0) {
            console.log('💡 Asignando órdenes huérfanas a este vendedor...');
            
            // Asignar las órdenes huérfanas a este vendedor
            for (const orphanOrder of orphanOrders) {
              try {
                const { error: updateError } = await supabase
                  .from('orders')
                  .update({ seller_id: user.id })
                  .eq('id', orphanOrder.id);
                
                if (updateError) {
                  console.error(`❌ Error asignando orden ${orphanOrder.id}:`, updateError);
                } else {
                  console.log(`✅ Orden ${orphanOrder.id} asignada exitosamente`);
                }
              } catch (err) {
                console.error(`❌ Error en asignación:`, err);
              }
            }
            
            // Volver a cargar las órdenes después de la asignación
            setTimeout(() => {
              fetchOrders();
            }, 1000);
            return;
          }
        }
      }
      
      setOrders(data || []);
    } catch (error) {
      console.error('❌ Error general fetchOrders:', error);
      toast.error('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('seller_orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${user?.id}`
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const updateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setProcessingOrderId(orderId);
    
    try {
      // Actualización directa usando update en lugar de RPC
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Agregar campos específicos según el estado
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (newStatus === 'ready') {
        updateData.ready_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updateData.rejection_reason = notes || 'Rechazado por el vendedor';
        updateData.rejected_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('seller_id', user?.id) // Verificar que pertenece al vendedor
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        let message = '';
        switch (newStatus) {
          case 'accepted':
            message = 'Orden aceptada exitosamente';
            break;
          case 'ready':
            message = 'Orden marcada como lista';
            break;
          case 'rejected':
            message = 'Orden rechazada';
            break;
          default:
            message = 'Estado actualizado exitosamente';
        }
        toast.success(message);
        await fetchOrders();
      } else {
        toast.error('No se pudo actualizar la orden');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado de la orden');
    } finally {
      setProcessingOrderId(null);
      setShowRejectDialog(false);
      setRejectionReason('');
    }
  };

  const acceptOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'accepted');
  };

  const rejectOrder = async (orderId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Ingresa una razón para el rechazo');
      return;
    }
    await updateOrderStatus(orderId, 'rejected', rejectionReason);
  };

  const markOrderReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { 
        label: 'Pendiente', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock,
        description: 'Esperando tu confirmación'
      },
      accepted: { 
        label: 'Aceptado', 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        icon: CheckCircle,
        description: 'En preparación'
      },
      ready: { 
        label: 'Listo', 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: Package,
        description: 'Listo para entrega/recogida'
      },
      assigned: { 
        label: 'Asignado', 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        icon: Truck,
        description: 'Repartidor asignado'
      },
      'picked-up': { 
        label: 'Recogido', 
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200', 
        icon: Truck,
        description: 'En camino al cliente'
      },
      delivered: { 
        label: 'Entregado', 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle,
        description: 'Entregado exitosamente'
      },
      completed: { 
        label: 'Completado', 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: CheckCircle,
        description: 'Orden completada'
      },
      cancelled: { 
        label: 'Cancelado', 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        description: 'Cancelado por el cliente'
      },
      rejected: { 
        label: 'Rechazado', 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        description: 'No se pudo procesar'
      }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const getDeliveryIcon = (type: string) => {
    switch (type) {
      case 'pickup': return Store;
      case 'dine-in': return UtensilsCrossed;
      case 'delivery': return Truck;
      default: return Store;
    }
  };

  const renderOrderCard = (order: Order) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = statusInfo.icon;
    const DeliveryIcon = getDeliveryIcon(order.delivery_type);
    const canAccept = order.status === 'pending';
    const canMarkReady = order.status === 'accepted';
    const isProcessing = processingOrderId === order.id;

    return (
      <Card key={order.id} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                {order.customer_name}
              </CardTitle>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {order.phone_number}
              </p>
            </div>
            <Badge className={`${statusInfo.color} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Información de entrega */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <DeliveryIcon className="w-4 h-4 text-orange-500" />
            <div className="flex-1">
              <span className="font-medium">
                {order.delivery_type === 'pickup' ? 'Recoger en tienda' :
                 order.delivery_type === 'dine-in' ? 'Comer en el lugar' : 'Servicio a domicilio'}
              </span>
              {order.delivery_type === 'delivery' && order.delivery_address && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {order.delivery_address}
                </p>
              )}
            </div>
          </div>

          {/* Resumen de productos */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Productos ({order.order_items?.length || 0})
            </h4>
            <div className="space-y-1">
              {order.order_items?.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>Q{item.total_price.toFixed(2)}</span>
                </div>
              ))}
              {(order.order_items?.length || 0) > 3 && (
                <p className="text-sm text-gray-500">
                  +{(order.order_items?.length || 0) - 3} productos más
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Total y acciones */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">Q{getOrderTotal(order).toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                Hace {new Date(order.created_at).toLocaleString('es-GT')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowOrderDetail(true);
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver detalles
              </Button>

              {canAccept && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectingOrderId(order.id);
                      setShowRejectDialog(true);
                    }}
                    disabled={isProcessing}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => acceptOrder(order.id)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4 mr-1" />
                    )}
                    Aceptar
                  </Button>
                </>
              )}

              {canMarkReady && (
                <Button
                  size="sm"
                  onClick={() => markOrderReady(order.id)}
                  disabled={isProcessing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-1" />
                  )}
                  Marcar listo
                </Button>
              )}
            </div>
          </div>

          {order.customer_notes && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Notas del cliente:</p>
              <p className="text-sm text-blue-600">{order.customer_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando órdenes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Órdenes</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchOrders}
            disabled={loading}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button 
            variant="outline" 
            onClick={runDiagnostic}
            disabled={loading}
            className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Diagnóstico
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes órdenes aún
            </h3>
            <p className="text-gray-600">
              Las órdenes de tus clientes aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(renderOrderCard)}
        </div>
      )}

      {/* Dialog para detalles de la orden */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Orden</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Información del cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información del cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Teléfono:</strong> {selectedOrder.phone_number}</p>
                  {selectedOrder.customer_notes && (
                    <p><strong>Notas:</strong> {selectedOrder.customer_notes}</p>
                  )}
                </CardContent>
              </Card>

              {/* Productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            Q{item.price_per_unit.toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <span className="font-bold">Q{item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>Q{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entrega:</span>
                        <span>{selectedOrder.delivery_fee > 0 ? `Q${selectedOrder.delivery_fee.toFixed(2)}` : 'Gratis'}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span className="text-green-600">Q{getOrderTotal(selectedOrder).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para rechazar orden */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Orden</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual no puedes procesar esta orden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ej: No tenemos los ingredientes disponibles..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => rejectingOrderId && rejectOrder(rejectingOrderId)}
                disabled={!rejectionReason.trim() || processingOrderId === rejectingOrderId}
                className="bg-red-600 hover:bg-red-700"
              >
                {processingOrderId === rejectingOrderId ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                )}
                Rechazar orden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
