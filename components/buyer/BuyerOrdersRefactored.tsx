import React, { useState, useEffect, useMemo } from 'react';
import { useOrder } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { OrderTracking } from './OrderTracking';
import { toast } from 'sonner';

// Importar componentes refactorizados
import { OrderFilters } from './orders/OrderFilters';
import { OrderList } from './orders/OrderList';
import { OrderStats } from './orders/OrderStats';

interface BuyerOrdersProps {
  onViewOrder?: (orderId: string) => void;
}

export function BuyerOrders({ onViewOrder }: BuyerOrdersProps) {
  const { orders, loading, refreshOrders, deleteUnconfirmedOrder } = useOrder();
  const { user } = useAuth();
  
  // Estados para filtros y búsqueda
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

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
        await refreshOrders();
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

  const handleConfirmReceived = async (orderId: string, sellerName: string) => {
    if (!user?.id) return;
    
    setConfirmingOrderId(orderId);
    
    try {
      // Actualizar estado de la orden a 'completed'
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      // Enviar notificación al vendedor
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          recipient_id: (await supabase.from('orders').select('seller_id').eq('id', orderId).single()).data?.seller_id,
          type: 'order_completed_by_buyer',
          title: '✅ Comprador confirmó recepción',
          message: `El comprador confirmó que recibió su pedido #${orderId.slice(0, 8)}. ¡Pedido completado exitosamente!`,
          data: {
            order_id: orderId,
            buyer_id: user.id
          },
          created_at: new Date().toISOString()
        }]);

      if (notificationError) {
        console.error('Error enviando notificación:', notificationError);
      }

      toast.success('¡Orden confirmada!', {
        description: `Has confirmado que recibiste tu pedido de ${sellerName}.`,
        duration: 4000,
      });
      
      await refreshOrders();
    } catch (error) {
      console.error('Error confirming order received:', error);
      toast.error('Error', {
        description: 'No se pudo confirmar la recepción de la orden.',
        duration: 5000,
      });
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleReorder = async (orderId: string) => {
    // TODO: Implementar funcionalidad de reordenar
    toast.info('Función en desarrollo', {
      description: 'La funcionalidad de volver a pedir estará disponible pronto.',
      duration: 3000,
    });
  };

  // Función para filtrar por fecha
  const filterByDate = (order: any) => {
    if (dateFilter === 'all') return true;
    
    const orderDate = new Date(order.created_at);
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return orderDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= monthAgo;
      case '3months':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return orderDate >= threeMonthsAgo;
      default:
        return true;
    }
  };

  // Filtrar órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filtro de búsqueda
      const matchesSearch = !searchQuery || 
        order.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items?.some(item => 
          item.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      // Filtro de tipo de entrega
      const matchesDeliveryType = deliveryTypeFilter === 'all' || 
        order.delivery_type === deliveryTypeFilter;

      // Filtro de fecha
      const matchesDate = filterByDate(order);

      return matchesSearch && matchesStatus && matchesDeliveryType && matchesDate;
    });
  }, [orders, searchQuery, statusFilter, deliveryTypeFilter, dateFilter]);

  // Separar órdenes activas y historial
  const activeOrders = filteredOrders.filter(order => 
    !['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status)
  );

  const historyOrders = filteredOrders.filter(order => 
    ['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status)
  );

  // Calcular estadísticas
  const orderStats = useMemo(() => {
    const totalOrders = orders.length;
    const activeCount = orders.filter(order => 
      !['delivered', 'completed', 'cancelled', 'rejected'].includes(order.status)
    ).length;
    const completedCount = orders.filter(order => 
      ['delivered', 'completed'].includes(order.status)
    ).length;
    const cancelledCount = orders.filter(order => 
      ['cancelled', 'rejected'].includes(order.status)
    ).length;
    
    const totalSpent = orders
      .filter(order => ['delivered', 'completed'].includes(order.status))
      .reduce((sum, order) => sum + order.total, 0);
    
    const averageOrderValue = completedCount > 0 ? totalSpent / completedCount : 0;
    
    // Calcular calificación promedio (placeholder - implementar cuando esté disponible)
    const averageRating = 0; // TODO: Calcular desde ratings reales
    
    // Pedidos de este mes
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthOrders = orders.filter(order => 
      new Date(order.created_at) >= thisMonth
    ).length;
    
    // Distribución por tipo de entrega
    const deliveryOrders = orders.filter(order => order.delivery_type === 'delivery').length;
    const pickupOrders = orders.filter(order => order.delivery_type === 'pickup').length;
    const dineInOrders = orders.filter(order => order.delivery_type === 'dine-in').length;

    return {
      totalOrders,
      activeOrders: activeCount,
      completedOrders: completedCount,
      cancelledOrders: cancelledCount,
      totalSpent,
      averageOrderValue,
      averageRating,
      thisMonthOrders,
      deliveryOrders,
      pickupOrders,
      dineInOrders
    };
  }, [orders]);

  // Mostrar tracking de orden si está seleccionada
  if (selectedOrderId) {
    return (
      <OrderTracking 
        orderId={selectedOrderId} 
        onBack={() => setSelectedOrderId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <OrderFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        deliveryTypeFilter={deliveryTypeFilter}
        setDeliveryTypeFilter={setDeliveryTypeFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
        activeOrdersCount={activeOrders.length}
        historyOrdersCount={historyOrders.length}
        filteredCount={filteredOrders.length}
      />

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mx-auto bg-white border border-orange-200">
          <TabsTrigger 
            value="orders" 
            className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
          >
            Pedidos ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700"
          >
            Historial ({historyOrders.length})
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Tab de pedidos activos */}
        <TabsContent value="orders" className="space-y-4">
          <OrderList
            orders={activeOrders}
            isHistory={false}
            loading={loading}
            onViewOrder={handleViewOrder}
            onDeleteOrder={handleDeleteOrder}
            onConfirmReceived={handleConfirmReceived}
            deletingOrderId={deletingOrderId}
            confirmingOrderId={confirmingOrderId}
            emptyTitle="No tienes pedidos activos"
            emptyDescription="Tus pedidos en proceso aparecerán aquí"
          />
        </TabsContent>

        {/* Tab de historial */}
        <TabsContent value="history" className="space-y-4">
          <OrderList
            orders={historyOrders}
            isHistory={true}
            loading={loading}
            onViewOrder={handleViewOrder}
            onReorderFn={handleReorder}
            emptyTitle="No hay pedidos en el historial"
            emptyDescription="Tus pedidos completados, cancelados o rechazados aparecerán aquí"
          />
        </TabsContent>

        {/* Tab de estadísticas */}
        <TabsContent value="stats" className="space-y-6">
          <OrderStats 
            stats={orderStats}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
