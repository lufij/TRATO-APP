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
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Truck, 
  Store, 
  MapPin, 
  Clock, 
  DollarSign,
  Package,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Navigation,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface AvailableDelivery {
  order_id: string;
  seller_name: string;
  seller_address: string;
  delivery_address: string;
  total: number;
  estimated_time: number;
  created_at: string;
  distance_km?: number;
}

interface AssignedOrder {
  id: string;
  customer_name: string;
  phone_number: string;
  delivery_address: string;
  total: number;
  status: string;
  seller_name: string;
  seller_address: string;
  created_at: string;
  picked_up_at?: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
  }>;
  seller_business?: {
    business_name: string;
    business_address: string;
    latitude?: number;
    longitude?: number;
    location_verified?: boolean;
  };
}

export function DriverDashboard() {
  const { user } = useAuth();
  const [availableDeliveries, setAvailableDeliveries] = useState<AvailableDelivery[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const fetchAvailableDeliveries = async () => {
    try {
      console.log('Fetching available deliveries...');
      const { data, error } = await supabase
        .rpc('get_available_deliveries');

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      console.log('Available deliveries data:', data);
      setAvailableDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching available deliveries:', error);
      toast.error('Error al cargar entregas disponibles');
      // En caso de error, asegurar que no hay entregas demo
      setAvailableDeliveries([]);
    }
  };

  const fetchAssignedOrders = async () => {
    if (!user) return;

    try {
      console.log('Fetching assigned orders for driver:', user.id);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Orders fetch error:', error);
        throw error;
      }
      
      console.log('Assigned orders data:', data);
      
      // Buscar información adicional por separado
      const formattedData = await Promise.all(data?.map(async (order) => {
        // Buscar info del comprador
        const { data: buyer } = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', order.buyer_id)
          .single();

        // Buscar info del vendedor
        const { data: seller } = await supabase
          .from('users')
          .select('name, business_name, address, latitude, longitude')
          .eq('id', order.seller_id)
          .single();

        return {
          ...order,
          customer_name: buyer?.name || 'Cliente',
          phone_number: buyer?.phone || 'No disponible',
          seller_name: seller?.business_name || seller?.name || 'Vendedor',
          seller_address: seller?.address || 'Dirección no disponible',
          seller_business: {
            business_name: seller?.business_name || seller?.name || 'Vendedor',
            business_address: seller?.address || 'Dirección no disponible',
            latitude: seller?.latitude,
            longitude: seller?.longitude,
            location_verified: true
          }
        };
      }) || []);

      setAssignedOrders(formattedData);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      toast.error('Error al cargar órdenes asignadas');
      // En caso de error, asegurar que no hay órdenes demo
      setAssignedOrders([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAvailableDeliveries(),
      fetchAssignedOrders()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('driver_orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const acceptDelivery = async (orderId: string) => {
    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    setProcessingOrderId(orderId);
    
    try {
      console.log('Accepting delivery:', orderId, 'for driver:', user.id);
      
      const { data, error } = await supabase
        .rpc('assign_driver_to_order', {
          p_order_id: orderId,
          p_driver_id: user.id
        });

      if (error) {
        console.error('RPC Error accepting delivery:', error);
        throw error;
      }

      console.log('Accept delivery response:', data);

      if (data?.[0]?.success) {
        toast.success(data[0].message || 'Entrega asignada exitosamente');
        // Refrescar datos inmediatamente
        await fetchData();
      } else {
        toast.error(data?.[0]?.message || 'Error al aceptar entrega');
      }
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Error al aceptar la entrega. Verifica tu conexión.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const openInMaps = (order: AssignedOrder) => {
    const { seller_business } = order;
    
    // Si tenemos coordenadas verificadas de Google Maps, usarlas
    if (seller_business?.latitude && seller_business?.longitude && seller_business?.location_verified) {
      const coords = `${seller_business.latitude},${seller_business.longitude}`;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_place_id=${encodeURIComponent(seller_business.business_name)}`;
      window.open(url, '_blank');
      console.log('🗺️ Navegando con coordenadas Google Maps:', coords);
    } 
    // Fallback a dirección de texto si no hay coordenadas
    else {
      const address = encodeURIComponent(seller_business?.business_address || order.seller_address || '');
      if (address) {
        window.open(`https://www.google.com/maps/search/${address}`, '_blank');
        console.log('🗺️ Navegando con dirección de texto:', address);
      } else {
        toast.error('No hay dirección disponible para navegar');
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    setProcessingOrderId(orderId);
    
    try {
      console.log('Updating order status:', orderId, 'to:', newStatus, 'by driver:', user.id);
      
      // Actualización directa con formato correcto de status
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus, // Usar formato con underscore: picked_up, in_transit
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('driver_id', user.id)
        .select();

      if (error) {
        console.error('Error updating status:', error);
        throw error;
      }

      console.log('Status updated successfully:', data);

      const messages = {
        'picked_up': 'Pedido marcado como recogido',
        'in_transit': 'Pedido en camino al cliente', 
        'delivered': 'Pedido entregado exitosamente'
      };
      toast.success(messages[newStatus as keyof typeof messages] || 'Estado actualizado');
      
      // Refrescar datos inmediatamente
      await fetchData();
      
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado. Verifica tu conexión.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      assigned: { 
        label: 'Asignado', 
        color: 'bg-blue-100 text-blue-800', 
        icon: Truck,
        description: 'Ve a recoger el pedido'
      },
      'picked-up': { 
        label: 'Recogido', 
        color: 'bg-orange-100 text-orange-800', 
        icon: Package,
        description: 'En camino al cliente'
      },
      'in-transit': { 
        label: 'En camino', 
        color: 'bg-purple-100 text-purple-800', 
        icon: Navigation,
        description: 'Entregando al cliente'
      }
    };

    return statusMap[status as keyof typeof statusMap] || statusMap.assigned;
  };

  const renderAvailableDeliveryCard = (delivery: AvailableDelivery) => {
    const isProcessing = processingOrderId === delivery.order_id;
    const timeAgo = new Date(delivery.created_at).toLocaleString('es-GT');

    return (
      <Card key={delivery.order_id} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="w-4 h-4" />
              {delivery.seller_name}
            </CardTitle>
            <Badge className="bg-green-100 text-green-800 border border-green-200">
              <DollarSign className="w-3 h-3 mr-1" />
              Q{delivery.total.toFixed(2)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Recoger en:</p>
                <p className="text-sm text-gray-600">{delivery.seller_address || 'Dirección del vendedor'}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Navigation className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Entregar en:</p>
                <p className="text-sm text-gray-600">{delivery.delivery_address}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-3 h-3" />
                Hace {timeAgo}
              </div>
              {delivery.distance_km && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Navigation className="w-3 h-3" />
                  ~{delivery.distance_km} km
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => acceptDelivery(delivery.order_id)}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    Aceptar entrega
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // Abrir en Google Maps para navegar
                  const address = encodeURIComponent(delivery.seller_address || '');
                  window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                }}
                className="flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Ver ruta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAssignedOrderCard = (order: AssignedOrder) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = statusInfo.icon;
    const isProcessing = processingOrderId === order.id;
    
    const canPickup = order.status === 'assigned';
    const canMarkInTransit = order.status === 'picked-up';
    const canDeliver = order.status === 'in-transit';

    return (
      <Card key={order.id} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-lg">{order.customer_name}</CardTitle>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {order.phone_number}
              </p>
            </div>
            <Badge className={statusInfo.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Store className="w-4 h-4 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Recoger en:</p>
                <p className="text-sm text-gray-600">{order.seller_name}</p>
                <p className="text-sm text-gray-500">{order.seller_address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Entregar en:</p>
                <p className="text-sm text-gray-600">{order.delivery_address}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Productos:</p>
            <div className="space-y-1">
              {order.order_items?.slice(0, 3).map((item, index) => (
                <p key={index} className="text-sm text-gray-600">
                  {item.quantity}x {item.product_name}
                </p>
              ))}
              {(order.order_items?.length || 0) > 3 && (
                <p className="text-sm text-gray-500">
                  +{(order.order_items?.length || 0) - 3} productos más
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-green-600">Q{order.total.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{statusInfo.description}</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {canPickup && (
                <>
                  <Button
                    onClick={() => openInMaps(order)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Ir a recoger
                  </Button>
                  
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'picked_up')}
                    disabled={isProcessing}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Package className="w-4 h-4 mr-1" />
                    )}
                    Marcar recogido
                  </Button>
                </>
              )}

              {canMarkInTransit && (
                <Button
                  onClick={() => updateOrderStatus(order.id, 'in_transit')}
                  disabled={isProcessing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-1" />
                  )}
                  En camino
                </Button>
              )}

              {canDeliver && (
                <>
                  <Button
                    onClick={() => {
                      const address = encodeURIComponent(order.delivery_address || '');
                      if (address) {
                        window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                      } else {
                        toast.error('No hay dirección de entrega disponible');
                      }
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Ir al cliente
                  </Button>
                  
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    Marcar entregado
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando entregas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Repartidor</h1>
        <Button 
          variant="outline" 
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Órdenes asignadas */}
      {assignedOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Tus entregas activas ({assignedOrders.length})
          </h2>
          {assignedOrders.map(renderAssignedOrderCard)}
        </div>
      )}

      {/* Entregas disponibles */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Entregas disponibles ({availableDeliveries.length})
        </h2>
        
        {availableDeliveries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay entregas disponibles
              </h3>
              <p className="text-gray-600">
                Las nuevas entregas aparecerán aquí cuando estén listas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {availableDeliveries.map(renderAvailableDeliveryCard)}
          </div>
        )}
      </div>
    </div>
  );
}
