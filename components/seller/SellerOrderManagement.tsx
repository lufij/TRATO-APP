import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { updateProductStock } from '../../utils/stockManager';
import { C        // 🔥 CRITICAL: Actualizar stock cuando el vendedor acepta la orden
        console.log('🔄 Orden aceptada, actualizando stock...');
        console.log('📦 Order ID:', orderId);
        
        // Obtener los items de la orden
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, daily_product_id, quantity, product_name, product_type')
          .eq('order_id', orderId);

        console.log('📋 Order Items Query Result:', { orderItems, itemsError });

        if (itemsError) {
          console.error('❌ Error obteniendo items de la orden:', itemsError);ntent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Package,
  Truck,
  MapPin,
  User,
  Phone,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  product_image?: string;
  notes?: string;
}

interface Order {
  id: string;
  order_number: string;
  buyer_id: string; // Required for notifications
  buyer_name: string;
  buyer_phone?: string;
  total: number;
  delivery_fee: number;
  status: 'pending' | 'accepted' | 'ready' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  delivery_method: 'pickup' | 'delivery' | 'dine_in';
  delivery_address?: string;
  notes?: string;
  created_at: string;
  estimated_delivery?: string;
  items: OrderItem[];
  driver_id?: string;
  driver_name?: string;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-purple-100 text-purple-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-green-100 text-green-800',
  in_transit: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',  // 🔧 AGREGADO
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  assigned: 'Asignado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
  delivered: 'Entregado',
  completed: 'Completado',  // 🔧 AGREGADO
  cancelled: 'Cancelado',
  rejected: 'Rechazado'
};

export function SellerOrderManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (user?.id) {
      loadOrders();
      setupRealTimeSubscription();
    }
  }, [user?.id]);

  const setupRealTimeSubscription = () => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('seller-orders-management')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadOrders = async () => {
    // 🐞 FIX: Limpiar el estado de las órdenes antes de recargar para evitar
    // la re-ejecución de la lógica de actualización de stock por efectos
    // secundarios no deseados del renderizado.
    setOrders([]); 

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            product_image,
            notes
          ),
          users!orders_buyer_id_fkey (
            name,
            phone
          ),
          drivers:users!orders_driver_id_fkey (
            name
          )
        `)
        .eq('seller_id', user?.id)
        // 🔧 ARREGLADO: Cargar TODAS las órdenes, no solo las activas
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 🔍 DEBUG: Verificar los datos que llegan
      console.log('📊 Órdenes cargadas:', ordersData?.length || 0);
      console.log('📋 Datos de órdenes:', ordersData);

      const formattedOrders = ordersData?.map(order => {
        console.log(`🔍 Orden ${order.order_number}:`, {
          id: order.id,
          status: order.status,
          delivery_method: order.delivery_method,
          buyer_id: order.buyer_id
        });
        
        return {
          ...order,
          buyer_id: order.buyer_id,
          buyer_name: order.users?.name || 'Cliente',
          buyer_phone: order.users?.phone,
          driver_name: order.drivers?.name,
          items: order.order_items || []
        };
      }) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar las órdenes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (processingOrders.has(orderId)) return;

    // Mapear a estados válidos según el constraint de la BD
    // Estados válidos: 'pending', 'accepted', 'ready', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'
    const validStatuses = {
      'confirmed': 'accepted',   // Aceptar la orden
      'preparing': 'ready',      // Orden lista para recoger
      'ready': 'ready',          // Orden lista para recoger
      'delivered': 'delivered',  // Orden entregada
      'cancelled': 'cancelled'   // Orden cancelada
    };

    const finalStatus = validStatuses[newStatus as keyof typeof validStatuses] || newStatus;

    setProcessingOrders(prev => new Set([...prev, orderId]));

    try {
      // 1. Actualizar el estado de la orden
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: finalStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Database error:', error);
        toast.error('Error al actualizar el estado de la orden');
        // Ensure we stop processing if the update fails
        setProcessingOrders(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
        return; 
      }

      // 🔔 NOTIFICATION LOGIC: Send notification on acceptance
      const order = orders.find(o => o.id === orderId);
      if (order && finalStatus === 'accepted') {
        await supabase.from('notifications').insert({
          user_id: order.buyer_id,
          order_id: order.id,
          message: `Tu orden #${order.order_number} ha sido aceptada.`,
          type: 'order_accepted'
        });
        
        // � CRITICAL: Actualizar stock cuando el vendedor acepta la orden
        console.log('🔄 Orden aceptada, actualizando stock...');
        
        // Obtener los items de la orden
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, daily_product_id, quantity, product_name, product_type')
          .eq('order_id', orderId);

        if (itemsError) {
          console.error('❌ Error obteniendo items de la orden:', itemsError);
          toast.error('Orden aceptada pero error al actualizar stock');
        } else if (orderItems && orderItems.length > 0) {
          console.log('📦 Items encontrados:', orderItems.length);
          orderItems.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.product_name} - Cantidad: ${item.quantity} - Tipo: ${item.product_type}`);
          });
          
          console.log('🚀 Llamando updateProductStock...');
          
          // Llamar al stockManager para actualizar el inventario
          const stockResult = await updateProductStock(orderItems, orderId);
          
          console.log('📊 Resultado del stock manager:', stockResult);
          
          if (stockResult.success) {
            console.log('✅ Stock actualizado exitosamente:', stockResult.updatedProducts);
            toast.success('Orden aceptada y stock actualizado');
          } else {
            console.error('❌ Error actualizando stock:', stockResult.message);
            toast.error(`Orden aceptada pero ${stockResult.message}`);
          }
        } else {
          console.log('⚠️ No se encontraron items en la orden');
          toast.success('Orden aceptada (sin items para actualizar stock)');
        }
      }

      toast.success(`Orden actualizada a ${STATUS_LABELS[finalStatus as keyof typeof STATUS_LABELS] || finalStatus}.`);
      
      // Refrescar la lista de órdenes
      loadOrders();
      
      // Clean up processing state
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });

    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado de la orden');
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const rejectOrder = async (orderId: string, reason: string) => {
    if (processingOrders.has(orderId)) return;

    setProcessingOrders(prev => new Set([...prev, orderId]));

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // 🚀 NOTIFICATION LOGIC: Send notification on rejection
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await supabase.from('notifications').insert({
          user_id: order.buyer_id,
          order_id: order.id,
          message: `Tu orden #${order.order_number} fue rechazada.`,
          type: 'order_rejected'
        });
      }

      toast.success('Orden rechazada');
      loadOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Error al rechazar la orden');
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('es-GT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getOrdersByStatus = (status: string) => {
    if (status === 'active') {
      return orders.filter(order => 
        ['accepted', 'ready', 'assigned', 'picked_up', 'in_transit'].includes(order.status)
      );
    }
    if (status === 'completed') {
      return orders.filter(order => 
        ['delivered', 'completed'].includes(order.status)  // 🔧 ARREGLADO: Incluir 'completed'
      );
    }
    if (status === 'cancelled') {
      return orders.filter(order => 
        ['cancelled', 'rejected'].includes(order.status)
      );
    }
    return orders.filter(order => order.status === status);
  };

  const renderOrderCard = (order: Order) => {
    const isProcessing = processingOrders.has(order.id);
    
    // 🔍 DEBUG: Log DETALLADO de cada orden que se renderiza
    console.log(`🎨 Renderizando orden ${order.order_number}:`, {
      id: order.id,
      status: order.status,
      delivery_method: order.delivery_method,
      buyer_id: order.buyer_id,
      isProcessing,
      orderObject: order
    });
    
    // 🔍 DEBUG: Verificar condiciones específicas
    console.log(`❓ Status actual: "${order.status}" (tipo: ${typeof order.status})`);
    console.log(`❓ Delivery method actual: "${order.delivery_method}" (tipo: ${typeof order.delivery_method})`);
    console.log(`❓ ¿Status === 'pending'? ${order.status === 'pending'}`);
    console.log(`❓ ¿Delivery method === 'delivery'? ${order.delivery_method === 'delivery'}`);
    console.log(`❓ ¿Status incluye pending? ${String(order.status).includes('pending')}`);
    console.log(`❓ ¿Delivery incluye delivery? ${String(order.delivery_method).includes('delivery')}`);
    
    return (
      <Card key={order.id} className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Orden #{order.order_number}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {formatTime(order.created_at)}
              </p>
            </div>
            <Badge className={STATUS_COLORS[order.status]}>
              {STATUS_LABELS[order.status]}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{order.buyer_name}</span>
            {order.buyer_phone && (
              <>
                <Phone className="w-4 h-4 text-gray-500 ml-2" />
                <span className="text-sm text-gray-600">{order.buyer_phone}</span>
              </>
            )}
          </div>

          {/* Delivery Info */}
          <div className={`p-4 rounded-lg border-2 ${
            String(order.delivery_method || '').trim().toLowerCase() === 'delivery' 
              ? 'bg-blue-50 border-blue-300' 
              : String(order.delivery_method || '').trim().toLowerCase() === 'pickup' 
                ? 'bg-green-50 border-green-300' 
                : 'bg-blue-50 border-blue-300'
          }`}>
            <div className="flex items-center gap-3">
              {String(order.delivery_method || '').trim().toLowerCase() === 'delivery' || !order.delivery_method ? (
                <Truck className="w-8 h-8 text-blue-600" />
              ) : String(order.delivery_method || '').trim().toLowerCase() === 'pickup' ? (
                <Package className="w-8 h-8 text-green-600" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                  <path d="M17 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                  <path d="M12 2v20"/>
                  <path d="M6 12h.01"/>
                  <path d="M18 12h.01"/>
                </svg>
              )}
              <div>
                <span className={`text-xl font-bold ${
                  String(order.delivery_method || '').trim().toLowerCase() === 'delivery' || !order.delivery_method
                    ? 'text-blue-800' 
                    : String(order.delivery_method || '').trim().toLowerCase() === 'pickup' 
                      ? 'text-green-800' 
                      : 'text-orange-800'
                }`}>
                  {String(order.delivery_method || '').trim().toLowerCase() === 'delivery' || !order.delivery_method ? 'SERVICIO A DOMICILIO' : 
                   String(order.delivery_method || '').trim().toLowerCase() === 'pickup' ? 'RECOGER EN TIENDA' : 'COMER EN EL LUGAR'}
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Método de entrega: {order.delivery_method || 'No especificado'}
                </p>
              </div>
            </div>
          </div>

          {order.delivery_address && (
            <div className="flex items-start gap-2 mt-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
              <span className="text-sm text-gray-600">{order.delivery_address}</span>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Productos:</h4>
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                <span>{item.quantity}x {item.product_name}</span>
                <span className="font-medium">Q{(item.quantity * item.unit_price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Notas:</p>
                  <p className="text-sm text-blue-700">{order.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total:</span>
              <span className="text-lg font-bold text-green-600">
                Q{order.total.toFixed(2)}
              </span>
            </div>
            {order.delivery_fee > 0 && (
              <p className="text-sm text-gray-500">
                Incluye Q{order.delivery_fee.toFixed(2)} de entrega
              </p>
            )}
          </div>

          {/* Driver Info */}
          {order.driver_name && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Repartidor: {order.driver_name}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {/* Botones solo para órdenes PENDIENTES */}
            {String(order.status).trim().toLowerCase() === 'pending' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Aceptar Orden
                </Button>
                
                {/* 🔴 BOTÓN RECHAZAR FORZADO */}
                <Button
                  onClick={() => rejectOrder(order.id, 'No disponible')}
                  disabled={isProcessing}
                  variant="destructive"
                  size="lg" 
                  className="px-6 bg-red-600 hover:bg-red-700 text-white border-red-600"
                  style={{backgroundColor: '#dc2626', borderColor: '#dc2626'}}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            )}

            {order.status === 'accepted' && (
              <Button
                onClick={() => updateOrderStatus(order.id, 'ready')}
                disabled={isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Marcar Orden Lista
              </Button>
            )}

            {order.status === 'ready' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Orden lista para recoger</p>
                    <p className="text-sm text-blue-600">El repartidor recogerá y entregará esta orden</p>
                  </div>
                </div>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => updateOrderStatus(order.id, 'confirmed')}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Re-procesar
                </Button>
                <Button
                  onClick={() => rejectOrder(order.id, 'Orden rechazada')}
                  disabled={isProcessing}
                  variant="destructive"
                  size="lg"
                  className="px-6"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
              <Package className="w-5 h-5 text-orange-500" />
              Gestión de Órdenes
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={refreshing}
              size="sm"
            >
              {refreshing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pendientes
            {getOrdersByStatus('pending').length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {getOrdersByStatus('pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Activas
            {getOrdersByStatus('active').length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {getOrdersByStatus('active').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completadas
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Canceladas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {getOrdersByStatus('pending').length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes pendientes</p>
              </CardContent>
            </Card>
          ) : (
            getOrdersByStatus('pending').map(renderOrderCard)
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {getOrdersByStatus('active').length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes activas</p>
              </CardContent>
            </Card>
          ) : (
            getOrdersByStatus('active').map(renderOrderCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {getOrdersByStatus('completed').length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes completadas</p>
              </CardContent>
            </Card>
          ) : (
            getOrdersByStatus('completed').map(renderOrderCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {getOrdersByStatus('cancelled').length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay órdenes canceladas</p>
              </CardContent>
            </Card>
          ) : (
            getOrdersByStatus('cancelled').map(renderOrderCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
