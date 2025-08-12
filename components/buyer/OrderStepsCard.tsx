import React from 'react';
import { Order } from '../../contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { getOrderSteps } from '../../utils/orderSteps';
import { formatTime } from '../../utils/orderUtils';

interface OrderStepsCardProps {
  order: Order;
}

export function OrderStepsCard({ order }: OrderStepsCardProps) {
  const steps = getOrderSteps(order);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimiento del Pedido</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.key} className="relative flex gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step.completed 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : step.current
                  ? 'bg-orange-500 border-orange-500 text-white animate-pulse'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {step.icon}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${
                  step.completed ? 'text-green-700' : step.current ? 'text-orange-700' : 'text-gray-500'
                }`}>
                  {step.label}
                </div>
                {step.timestamp && (
                  <div className="text-sm text-gray-600">
                    {formatTime(step.timestamp)}
                  </div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`absolute left-4 mt-8 w-0.5 h-4 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-300'
                }`} style={{ marginLeft: '15px' }} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}