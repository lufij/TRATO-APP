import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bell, 
  Clock, 
  MapPin, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  Activity,
  TrendingUp
} from 'lucide-react';

interface TestNotification {
  id: string;
  type: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export function NotificationTester() {
  const { user } = useAuth();
  const [testNotifications, setTestNotifications] = useState<TestNotification[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 🚨 SIMULADORES DE NOTIFICACIONES CRÍTICAS
  
  const simulateStockAlert = () => {
    const notification: TestNotification = {
      id: Date.now().toString(),
      type: 'stock_low',
      message: `⚠️ Stock bajo: Tostadas Francesas (3 unidades restantes)`,
      urgency: 'critical',
      timestamp: new Date()
    };
    
    setTestNotifications(prev => [notification, ...prev.slice(0, 9)]);
    console.log('🚨 SIMULANDO: Alerta de stock bajo');
  };

  const simulateTimeoutAlert = () => {
    const notification: TestNotification = {
      id: Date.now().toString(),
      type: 'order_timeout',
      message: `⏰ Orden #ABC123 pendiente por 15 minutos`,
      urgency: 'high',
      timestamp: new Date()
    };
    
    setTestNotifications(prev => [notification, ...prev.slice(0, 9)]);
    console.log('🚨 SIMULANDO: Alerta de timeout de orden');
  };

  const simulateLocationAlert = () => {
    const notification: TestNotification = {
      id: Date.now().toString(),
      type: 'driver_nearby',
      message: `📍 Tu repartidor está a 300 metros de tu ubicación`,
      urgency: 'medium',
      timestamp: new Date()
    };
    
    setTestNotifications(prev => [notification, ...prev.slice(0, 9)]);
    console.log('🚨 SIMULANDO: Repartidor cerca');
  };

  const simulateSystemAlert = () => {
    const notification: TestNotification = {
      id: Date.now().toString(),
      type: 'no_drivers',
      message: `🚨 CRÍTICO: No hay repartidores disponibles`,
      urgency: 'critical',
      timestamp: new Date()
    };
    
    setTestNotifications(prev => [notification, ...prev.slice(0, 9)]);
    console.log('🚨 SIMULANDO: Alerta de sistema crítica');
  };

  const runFullTest = async () => {
    setIsRunning(true);
    console.log('🧪 INICIANDO PRUEBA COMPLETA DE NOTIFICACIONES');
    
    // Simular secuencia de notificaciones
    simulateStockAlert();
    
    setTimeout(() => {
      simulateTimeoutAlert();
    }, 2000);
    
    setTimeout(() => {
      simulateLocationAlert();
    }, 4000);
    
    setTimeout(() => {
      simulateSystemAlert();
    }, 6000);
    
    setTimeout(() => {
      setIsRunning(false);
      console.log('✅ PRUEBA COMPLETA FINALIZADA');
    }, 8000);
  };

  const clearNotifications = () => {
    setTestNotifications([]);
    console.log('🧹 Notificaciones de prueba limpiadas');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <Zap className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Solo mostrar en desarrollo
  }

  return (
    <Card className="max-w-2xl mx-auto my-4">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <span>Tester de Notificaciones Críticas</span>
          <Badge variant="outline">Dev Only</Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Usuario actual: <strong>{user?.email}</strong> | Rol: <strong>{user?.role}</strong>
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Botones de simulación */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={simulateStockAlert}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
            disabled={isRunning}
          >
            <Package className="w-4 h-4 mr-2" />
            Stock Bajo
          </Button>
          
          <Button 
            onClick={simulateTimeoutAlert}
            variant="outline"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
            disabled={isRunning}
          >
            <Clock className="w-4 h-4 mr-2" />
            Timeout
          </Button>
          
          <Button 
            onClick={simulateLocationAlert}
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
            disabled={isRunning}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Ubicación
          </Button>
          
          <Button 
            onClick={simulateSystemAlert}
            variant="outline"
            className="text-purple-600 border-purple-300 hover:bg-purple-50"
            disabled={isRunning}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Sistema
          </Button>
        </div>
        
        {/* Botones de control */}
        <div className="flex space-x-2">
          <Button 
            onClick={runFullTest}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Prueba Completa
              </>
            )}
          </Button>
          
          <Button 
            onClick={clearNotifications}
            variant="outline"
            disabled={isRunning}
          >
            Limpiar
          </Button>
        </div>
        
        {/* Lista de notificaciones de prueba */}
        {testNotifications.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Notificaciones Simuladas:</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {testNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-3 ${getUrgencyColor(notification.urgency)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getUrgencyIcon(notification.urgency)}
                      <div>
                        <p className="font-medium">{notification.message}</p>
                        <p className="text-xs opacity-75">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {notification.urgency}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Información adicional */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <strong>💡 Instrucciones:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Haz clic en los botones para simular diferentes tipos de alertas</li>
            <li>• Observa la consola del navegador para logs detallados</li>
            <li>• "Prueba Completa" ejecuta todos los tipos en secuencia</li>
            <li>• Este componente solo aparece en modo desarrollo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
