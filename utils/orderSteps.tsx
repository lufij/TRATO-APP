import React from 'react';
import { Order } from '../contexts/OrderContext';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Store
} from 'lucide-react';

export interface OrderStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

export function getOrderSteps(order: Order): OrderStep[] {
  const baseSteps = [
    {
      key: 'pending',
      label: 'Pedido realizado',
      icon: <Package className="w-4 h-4" />,
      completed: true,
      current: order.status === 'pending',
      timestamp: (order as any).created_at
    },
    {
      key: 'accepted',
      label: 'Pedido aceptado',
      icon: <CheckCircle className="w-4 h-4" />,
      completed: ['accepted', 'ready', 'assigned', 'picked-up', 'in-transit', 'delivered', 'completed'].includes(order.status),
      current: order.status === 'accepted',
      timestamp: (order as any).accepted_at
    },
    {
      key: 'ready',
      label: order.delivery_type === 'pickup' ? 'Listo para recoger' : 'Pedido listo',
      icon: order.delivery_type === 'pickup' ? <Store className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />,
      completed: ['ready', 'assigned', 'picked-up', 'in-transit', 'delivered', 'completed'].includes(order.status),
      current: order.status === 'ready',
      timestamp: (order as any).ready_at
    }
  ];

  if (order.delivery_type === 'delivery') {
    baseSteps.push(
      {
        key: 'assigned',
        label: 'Repartidor asignado',
        icon: <Truck className="w-4 h-4" />,
        completed: ['assigned', 'picked-up', 'in-transit', 'delivered', 'completed'].includes(order.status),
        current: order.status === 'assigned',
        timestamp: order.status === 'assigned' ? (order as any).updated_at : undefined
      },
      {
        key: 'picked-up',
        label: 'Pedido recogido',
        icon: <Package className="w-4 h-4" />,
        completed: ['picked-up', 'in-transit', 'delivered', 'completed'].includes(order.status),
        current: order.status === 'picked-up',
        timestamp: (order as any).picked_up_at
      },
      {
        key: 'in-transit',
        label: 'En camino',
        icon: <Truck className="w-4 h-4" />,
        completed: ['in-transit', 'delivered', 'completed'].includes(order.status),
        current: order.status === 'in-transit',
        timestamp: order.status === 'in-transit' ? (order as any).updated_at : undefined
      }
    );
  }

  baseSteps.push({
    key: 'delivered',
    label: order.delivery_type === 'pickup' ? 'Recogido' : 'Entregado',
    icon: <CheckCircle className="w-4 h-4" />,
    completed: ['delivered', 'completed'].includes(order.status),
    current: order.status === 'delivered',
    timestamp: (order as any).delivered_at
  });

  return baseSteps;
}

export function getProgressPercentage(steps: OrderStep[]) {
  const completedSteps = steps.filter(step => step.completed).length;
  return Math.round((completedSteps / steps.length) * 100);
}
