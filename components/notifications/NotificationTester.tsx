import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToastNotifications } from './MobileToastNotifications';

export function NotificationTester() {
  const { addToast } = useToastNotifications();

  const testNotifications = [
    {
      type: 'new_order' as const,
      title: '🛒 Nueva Orden',
      message: 'Pedido de Q45.50 recibido de María García',
      autoRemove: true
    },
    {
      type: 'success' as const,
      title: '✅ Orden Confirmada',
      message: 'Orden #123 confirmada exitosamente',
      autoRemove: true
    },
    {
      type: 'warning' as const,
      title: '⚠️ Orden Cancelada',
      message: 'El cliente canceló la orden #124',
      autoRemove: true
    },
    {
      type: 'order_update' as const,
      title: '📦 Orden Lista',
      message: 'Orden #125 lista para entrega',
      autoRemove: true
    }
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Probar Notificaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {testNotifications.map((notification, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start"
            onClick={() => addToast(notification)}
          >
            {notification.title}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
