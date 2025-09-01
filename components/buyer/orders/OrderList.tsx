import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { OrderCard } from './OrderCard';

// Tipos para las ordenes (reutilizando de OrderCard)
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

interface OrderListProps {
  orders: Order[];
  isHistory?: boolean;
  loading?: boolean;
  onViewOrder: (orderId: string) => void;
  onDeleteOrder?: (orderId: string, sellerName: string) => void;
  onConfirmReceived?: (orderId: string, sellerName: string) => void;
  onReorderFn?: (orderId: string) => void;
  deletingOrderId?: string | null;
  confirmingOrderId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function OrderList({
  orders,
  isHistory = false,
  loading = false,
  onViewOrder,
  onDeleteOrder,
  onConfirmReceived,
  onReorderFn,
  deletingOrderId,
  confirmingOrderId,
  emptyTitle,
  emptyDescription
}: OrderListProps) {

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 w-10 h-10 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="bg-gray-200 h-5 w-32 rounded"></div>
                    <div className="bg-gray-200 h-4 w-24 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-200 h-6 w-20 rounded-full"></div>
                  <div className="bg-gray-200 h-4 w-16 rounded"></div>
                </div>
              </div>
              
              {!isHistory && (
                <div className="space-y-2 mb-4">
                  <div className="bg-gray-200 h-4 w-full rounded"></div>
                  <div className="bg-gray-200 h-2 w-full rounded"></div>
                </div>
              )}
              
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-200 h-4 w-24 rounded"></div>
                  <div className="bg-gray-200 h-4 w-20 rounded"></div>
                  <div className="bg-gray-200 h-4 w-28 rounded"></div>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <div className="bg-gray-200 w-10 h-10 rounded"></div>
                    <div className="space-y-1">
                      <div className="bg-gray-200 h-3 w-20 rounded"></div>
                      <div className="bg-gray-200 h-3 w-12 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="bg-gray-200 h-6 w-20 rounded"></div>
                <div className="flex gap-2">
                  <div className="bg-gray-200 h-8 w-24 rounded"></div>
                  <div className="bg-gray-200 h-8 w-28 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    const defaultTitle = isHistory ? "No hay pedidos en el historial" : "No tienes pedidos activos";
    const defaultDescription = isHistory 
      ? "Tus pedidos completados, cancelados o rechazados aparecerán aquí"
      : "Tus pedidos en proceso aparecerán aquí";

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-gray-100 rounded-full p-6 mb-6">
          <ShoppingCart className="w-16 h-16 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          {emptyTitle || defaultTitle}
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          {emptyDescription || defaultDescription}
        </p>
        
        {!isHistory && (
          <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-center">
              <p className="text-orange-700 font-medium text-sm mb-2">
                💡 ¿Quieres hacer tu primer pedido?
              </p>
              <p className="text-orange-600 text-sm">
                Explora los productos disponibles y agrega algunos al carrito
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isHistory={isHistory}
          onViewOrder={onViewOrder}
          onDeleteOrder={onDeleteOrder}
          onConfirmReceived={onConfirmReceived}
          onReorderFn={onReorderFn}
          deletingOrderId={deletingOrderId}
          confirmingOrderId={confirmingOrderId}
        />
      ))}
    </div>
  );
}
