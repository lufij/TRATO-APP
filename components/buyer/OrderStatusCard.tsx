import React from 'react';
import { Order } from '../../contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { AlertCircle, Clock } from 'lucide-react';
import { getStatusInfo, getDeliveryTypeInfo, getEstimatedTime } from '../../utils/orderUtils';
import { getOrderSteps, getProgressPercentage } from '../../utils/orderSteps';

interface OrderStatusCardProps {
  order: Order;
}

export function OrderStatusCard({ order }: OrderStatusCardProps) {
  const statusInfo = getStatusInfo(order.status);
  const deliveryInfo = getDeliveryTypeInfo(order.delivery_type);
  const steps = getOrderSteps(order);
  const progress = getProgressPercentage(steps);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {deliveryInfo.icon}
            Estado del Pedido
          </CardTitle>
          <Badge variant={statusInfo.color as any}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progreso</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Delivery Type Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {deliveryInfo.icon}
            <span className="font-medium">{deliveryInfo.label}</span>
          </div>
          <p className="text-sm text-gray-600">{deliveryInfo.description}</p>
          {order.estimated_time && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Tiempo estimado: {getEstimatedTime(order.delivery_type)}</span>
            </div>
          )}
        </div>

        {/* Rejection/Cancellation Reason */}
        {(order.status === 'rejected' || order.status === 'cancelled') && order.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">
                {order.status === 'rejected' ? 'Razón del rechazo' : 'Razón de cancelación'}
              </span>
            </div>
            <p className="text-sm text-red-700">{order.rejection_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}