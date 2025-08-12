import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Phone,
  MapPin,
  Store,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Star,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PurchaseOrder {
  id: string;
  seller_name: string;
  seller_phone: string;
  seller_business_name: string;
  items: PurchaseOrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  created_at: string;
  estimated_delivery: string;
  notes?: string;
  delivery_type?: string;
  delivery_address?: string;
  seller_id?: string;
}

interface PurchaseOrderItem {
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

export function SellerPurchaseOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadPurchaseOrders();
    }
  }, [user, filterStatus, filterPeriod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        loadPurchaseOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Calculate date range based on filter
      const now = new Date();
      let query = supabase
        .from('orders')
        .select(`
          id,
          seller_id,
          total,
          status,
          created_at,
          updated_at,
          delivery_address,
          delivery_type,
          notes,
          estimated_delivery,
          seller:users!seller_id (
            id,
            name,
            phone,
            business_name
          ),
          order_items (
            id,
            quantity,
            price_per_unit,
            total_price,
            product:products (
              name,
              price
            )
          )
        `)
        .eq('buyer_id', user?.id) // Pedidos donde el usuario actual es el comprador
        .order('created_at', { ascending: false });

      // Apply period filter
      if (filterPeriod === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startOfDay.toISOString());
      } else if (filterPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (filterPeriod === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: ordersData, error } = await query;

      if (error) {
        throw error;
      }

      console.log('Loaded purchase orders:', ordersData);

      // Transform data to match our PurchaseOrder interface
      const transformedOrders: PurchaseOrder[] = (ordersData || []).map(order => ({
        id: order.id,
        seller_name: order.seller?.name || 'Vendedor',
        seller_phone: order.seller?.phone || 'Sin teléfono',
        seller_business_name: order.seller?.business_name || 'Comercio',
        items: (order.order_items || []).map(item => ({
          product_name: item.product?.name || 'Producto',
          quantity: item.quantity || 1,
          price: item.price_per_unit || 0,
          total: item.total_price || 0
        })),
        total_amount: order.total || 0,
        status: order.status || 'pending',
        created_at: order.created_at,
        estimated_delivery: order.estimated_delivery || new Date(Date.now() + 45 * 60000).toISOString(),
        notes: order.notes,
        delivery_type: order.delivery_type,
        delivery_address: order.delivery_address,
        seller_id: order.seller_id
      }));

      setOrders(transformedOrders);

    } catch (error: any) {
      console.error('Error loading purchase orders:', error);
      
      let errorMessage = 'Error al cargar tus pedidos realizados.';
      
      if (error?.code === '42703') {
        errorMessage = 'Error de configuración de base de datos. Algunas columnas no existen.';
      } else if (error?.code === '42P01') {
        errorMessage = 'Tablas de base de datos no encontradas. El sistema no está configurado.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
      toast.error('Error al cargar los pedidos');
      
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      // Only allow cancellation if order is still pending or confirmed
      const order = orders.find(o => o.id === orderId);
      if (!order || !['pending', 'confirmed'].includes(order.status)) {
        toast.error('Este pedido no se puede cancelar');
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('buyer_id', user?.id); // Ensure user owns this order

      if (error) {
        throw error;
      }

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' as const }
            : order
        )
      );

      toast.success('Pedido cancelado exitosamente');

    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar el pedido');
    }
  };

  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'En Preparación';
      case 'ready': return 'Listo';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const renderOrderCard = (order: PurchaseOrder) => (
    <Card key={order.id} className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Pedido #{order.id.slice(-8)}</h3>
            <p className="text-sm text-gray-600">
              {formatDate(order.created_at)} a las {formatTime(order.created_at)}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {getStatusText(order.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seller Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{order.seller_business_name}</span>
          </div>
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
            <span className="font-medium">{order.seller_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-3 h-3" />
            <span>{order.seller_phone}</span>
          </div>
          {order.delivery_type && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Package className="w-3 h-3" />
              <span className="capitalize">{order.delivery_type}</span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div>
          <h4 className="font-medium mb-2">Productos:</h4>
          <div className="space-y-1">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.product_name}</span>
                <span className="font-medium">Q{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span className="text-green-600">Q{order.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Delivery Address */}
        {order.delivery_address && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{order.delivery_address}</span>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Notas:</strong> {order.notes}
            </p>
          </div>
        )}

        {/* Estimated Delivery */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Entrega estimada: {formatTime(order.estimated_delivery)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => cancelOrder(order.id)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancelar Pedido
            </Button>
          )}
          {order.status === 'confirmed' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => cancelOrder(order.id)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          )}
          {order.status === 'delivered' && (
            <Button 
              size="sm" 
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Star className="w-4 h-4 mr-1" />
              Calificar
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Contactar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Mis Pedidos Realizados</h3>
          <p className="text-gray-600">Gestiona los pedidos que has realizado a otros comercios</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadPurchaseOrders}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="preparing">En Preparación</SelectItem>
            <SelectItem value="ready">Listo</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los períodos</SelectItem>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No has realizado pedidos aún
            </h3>
            <p className="text-gray-600">
              Cuando realices pedidos a otros comercios aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map(renderOrderCard)}
        </div>
      )}

      {/* Summary */}
      {orders.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Total de pedidos: {orders.length}</span>
              <span>
                Total gastado: Q{orders
                  .filter(order => order.status === 'delivered')
                  .reduce((sum, order) => sum + order.total_amount, 0)
                  .toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}