import React from 'react';
import { Order } from '../contexts/OrderContext';
import { Store, Utensils, Truck } from 'lucide-react';

// Order status configuration
export const ORDER_STATUS_CONFIG = {
  pending: { 
    label: 'Pendiente', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Esperando confirmación del vendedor'
  },
  accepted: { 
    label: 'Aceptado', 
    color: 'bg-blue-100 text-blue-800',
    description: 'El vendedor está preparando tu pedido'
  },
  ready: { 
    label: 'Listo', 
    color: 'bg-green-100 text-green-800',
    description: 'Tu pedido está listo'
  },
  assigned: { 
    label: 'Repartidor asignado', 
    color: 'bg-purple-100 text-purple-800',
    description: 'Un repartidor fue asignado'
  },
  'picked-up': { 
    label: 'En camino', 
    color: 'bg-orange-100 text-orange-800',
    description: 'El repartidor está en camino'
  },
  'in-transit': { 
    label: 'En tránsito', 
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Tu pedido está siendo entregado'
  },
  delivered: { 
    label: 'Entregado', 
    color: 'bg-green-100 text-green-800',
    description: 'Tu pedido fue entregado'
  },
  completed: { 
    label: 'Completado', 
    color: 'bg-gray-100 text-gray-800',
    description: 'Pedido completado exitosamente'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800',
    description: 'El pedido fue cancelado'
  },
  rejected: { 
    label: 'Rechazado', 
    color: 'bg-red-100 text-red-800',
    description: 'El vendedor rechazó tu pedido'
  }
} as const;

// Delivery type configuration
export const DELIVERY_TYPE_CONFIG = {
  pickup: { 
    label: 'Recoger en tienda', 
    icon: <Store className="w-4 h-4" />,
    color: 'text-blue-600',
    description: 'Recoge tu pedido en el establecimiento'
  },
  'dine-in': { 
    label: 'Comer en el lugar', 
    icon: <Utensils className="w-4 h-4" />,
    color: 'text-purple-600',
    description: 'Tu pedido será servido en tu mesa'
  },
  delivery: { 
    label: 'Servicio a domicilio', 
    icon: <Truck className="w-4 h-4" />,
    color: 'text-green-600',
    description: 'Tu pedido será entregado a tu dirección'
  }
} as const;

// Progress mapping for different statuses
export const ORDER_PROGRESS_MAP = {
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
} as const;

// Helper functions
export function getStatusInfo(status: Order['status']) {
  return ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG] || ORDER_STATUS_CONFIG.pending;
}

export function getDeliveryTypeInfo(type: Order['delivery_type']) {
  return DELIVERY_TYPE_CONFIG[type as keyof typeof DELIVERY_TYPE_CONFIG] || DELIVERY_TYPE_CONFIG.pickup;
}

export function getOrderProgress(status: Order['status']) {
  return ORDER_PROGRESS_MAP[status as keyof typeof ORDER_PROGRESS_MAP] || 0;
}

export function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('es-GT', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString('es-GT');
}

export function canRateOrder(order: Order) {
  return order.status === 'delivered' || order.status === 'completed';
}

export function isActiveOrder(order: Order) {
  return !['completed', 'cancelled', 'rejected'].includes(order.status);
}

export function getEstimatedTime(deliveryType: Order['delivery_type']) {
  switch (deliveryType) {
    case 'pickup': return '15-25 min';
    case 'dine-in': return '20-30 min';
    case 'delivery': return '30-45 min';
    default: return '20-30 min';
  }
}
