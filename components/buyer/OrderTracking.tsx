import React, { useEffect, useState } from 'react';
import { useOrder, Order } from '../../contexts/OrderContext';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { OrderStatusCard } from './OrderStatusCard';
import { OrderStepsCard } from './OrderStepsCard';
import { OrderSummaryCard } from './OrderSummaryCard';
import { formatDate, formatTime } from '../../utils/orderUtils';

interface OrderTrackingProps {
  orderId: string;
  onBack: () => void;
}

export function OrderTracking({ orderId, onBack }: OrderTrackingProps) {
  const { getOrderById, refreshOrders, loading } = useOrder();
  const [order, setOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    const orderData = await getOrderById(orderId);
    setOrder(orderData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshOrders();
    await loadOrder();
    setRefreshing(false);
  };

  if (loading && !order) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Orden no encontrada</h3>
        <p className="text-gray-600 mb-4">No se pudo cargar la información de la orden</p>
        <Button onClick={onBack}>Volver a mis órdenes</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            ← Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              Orden #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-gray-600">
              Realizada el {formatDate(order.created_at)} a las {formatTime(order.created_at)}
            </p>
          </div>
        </div>
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Status and Steps */}
        <div className="lg:col-span-2 space-y-6">
          <OrderStatusCard order={order} />
          <OrderStepsCard order={order} />
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummaryCard order={order} onOrderUpdate={loadOrder} />
        </div>
      </div>
    </div>
  );
}