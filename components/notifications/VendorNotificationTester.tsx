import React from 'react';
import { VendorNotificationSystem } from './VendorNotificationSystem';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

/**
 * 🧪 COMPONENTE DE PRUEBA RÁPIDA PARA NOTIFICACIONES DE VENDEDOR
 * 
 * Este componente permite probar específicamente el sistema unificado
 * de notificaciones para vendedores.
 */
export function VendorNotificationTester() {
  const testNewOrder = async () => {
    console.log('🧪 Iniciando prueba de notificación de vendedor...');
    
    // Simular nueva orden con datos realistas
    const mockOrder = {
      id: `test-${Date.now()}`,
      customer_name: 'María González',
      buyer_name: 'María González',
      total: 125.75,
      total_amount: 125.75,
      notes: 'Sin cebolla en la hamburguesa, extra queso',
      items: [
        { name: 'Hamburguesa Clásica', quantity: 2, price: 45.00 },
        { name: 'Papas Fritas', quantity: 2, price: 20.00 },
        { name: 'Coca Cola', quantity: 2, price: 15.75 }
      ],
      status: 'pending',
      created_at: new Date().toISOString(),
      seller_id: 'current-vendor'
    };

    // Disparar evento personalizado
    const event = new CustomEvent('vendor-test-order', {
      detail: { new: mockOrder }
    });
    
    window.dispatchEvent(event);
    
    toast.success('🧪 Prueba de Vendedor', {
      description: 'Se simuló una nueva orden para el vendedor'
    });
  };

  const testNotificationFlow = async () => {
    // Simular el flujo completo
    console.log('🔄 Probando flujo completo...');
    
    // 1. Verificar permisos
    const permission = await Notification.requestPermission();
    console.log('1️⃣ Permisos:', permission);
    
    // 2. Probar sonido
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContext.resume();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      console.log('2️⃣ Sonido reproducido');
    } catch (error) {
      console.error('Error de sonido:', error);
    }
    
    // 3. Mostrar notificación
    if (permission === 'granted') {
      new Notification('🧪 Prueba Completa', {
        body: 'Flujo de notificación funcionando correctamente',
        icon: '/icon-192x192.png',
        requireInteraction: true
      });
      console.log('3️⃣ Notificación mostrada');
    }
    
    // 4. Simular orden
    setTimeout(() => {
      testNewOrder();
      console.log('4️⃣ Orden simulada');
    }, 1000);
    
    toast.success('🔄 Flujo Completo', {
      description: 'Ejecutando prueba de todos los componentes'
    });
  };

  return (
    <>
      {/* Sistema de notificaciones activo */}
      <VendorNotificationSystem 
        testMode={true}
        onNewOrder={(orderData) => {
          console.log('🎯 Orden de prueba procesada:', orderData);
          toast.info('✅ Sistema Respondió', {
            description: `Orden de ${orderData.customer_name || 'Cliente'} procesada`
          });
        }}
      />

      {/* Panel de pruebas específico para vendedor */}
      <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            🧪 Pruebas de Vendedor
            <span className="text-xs text-orange-600">Testing Mode</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={testNewOrder}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="sm"
          >
            🛒 Nueva Orden de Prueba
          </Button>
          
          <Button
            onClick={testNotificationFlow}
            variant="outline"
            className="w-full border-orange-300"
            size="sm"
          >
            🔄 Flujo Completo
          </Button>
          
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Panel de pruebas para el sistema unificado de notificaciones de vendedores
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Componente condicional para desarrollo
export function DevVendorNotificationTester() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return <VendorNotificationTester />;
}
