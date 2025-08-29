import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

export function SimpleOrderDebug() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => `${prev}\n[${timestamp}] ${message}`);
    console.log(`[OrderDebug] ${message}`);
  };

  useEffect(() => {
    if (user?.id) {
      addDebugLog(`Usuario detectado: ${user.id}`);
      loadOrdersSimple();
    } else {
      addDebugLog('No hay usuario activo');
    }
  }, [user?.id]);

  const loadOrdersSimple = async () => {
    setLoading(true);
    setError('');
    
    try {
      addDebugLog('Iniciando carga de órdenes...');
      
      // Paso 1: Verificar conexión básica
      addDebugLog('Paso 1: Verificando conexión...');
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);
        
      if (testError) {
        throw new Error(`Error de conexión: ${testError.message}`);
      }
      addDebugLog('✅ Conexión exitosa');

      // Paso 2: Consulta simple de órdenes
      addDebugLog('Paso 2: Consultando órdenes...');
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw new Error(`Error consultando órdenes: ${ordersError.message}`);
      }
      
      addDebugLog(`✅ Órdenes encontradas: ${ordersData?.length || 0}`);
      
      if (ordersData && ordersData.length > 0) {
        addDebugLog(`Primera orden: ${JSON.stringify(ordersData[0], null, 2)}`);
      }

      // Paso 3: Consultar order_items separadamente
      addDebugLog('Paso 3: Consultando items de órdenes...');
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(order => order.id);
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) {
          addDebugLog(`⚠️ Error consultando items: ${itemsError.message}`);
        } else {
          addDebugLog(`✅ Items encontrados: ${itemsData?.length || 0}`);
        }

        // Combinar datos manualmente
        const ordersWithItems = ordersData.map(order => ({
          ...order,
          items: itemsData?.filter(item => item.order_id === order.id) || []
        }));

        setOrders(ordersWithItems);
      } else {
        setOrders([]);
      }

      // Paso 4: Verificar usuarios (buyers)
      addDebugLog('Paso 4: Verificando información de compradores...');
      if (ordersData && ordersData.length > 0) {
        const buyerIds = [...new Set(ordersData.map(order => order.buyer_id).filter(Boolean))];
        
        if (buyerIds.length > 0) {
          const { data: buyersData, error: buyersError } = await supabase
            .from('users')
            .select('id, name, phone')
            .in('id', buyerIds);

          if (buyersError) {
            addDebugLog(`⚠️ Error consultando compradores: ${buyersError.message}`);
          } else {
            addDebugLog(`✅ Compradores encontrados: ${buyersData?.length || 0}`);
          }
        }
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Error desconocido';
      setError(errorMessage);
      addDebugLog(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      addDebugLog('Carga completada');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Debug de Órdenes</span>
            <Button 
              onClick={loadOrdersSimple} 
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="font-semibold mb-2">Información del Usuario</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded">
                ID: {user?.id || 'No disponible'}
                Email: {user?.email || 'No disponible'}
                Rol: {(user as any)?.user_type || 'No disponible'}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Órdenes Cargadas</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded">
                Total: {orders.length}
                Estado: {loading ? 'Cargando...' : 'Completado'}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Órdenes Encontradas</h3>
            {orders.length === 0 ? (
              <p className="text-gray-500">No se encontraron órdenes</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {orders.map((order: any) => (
                  <div key={order.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">#{order.order_number || order.id.slice(0, 8)}</span>
                      <span className="text-sm text-gray-500">Q{order.total}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>Estado: {order.status}</p>
                      <p>Comprador ID: {order.buyer_id}</p>
                      <p>Items: {order.items?.length || 0}</p>
                      <p>Creado: {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Log de Debug</h3>
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
              {debugInfo || 'Ejecuta la carga para ver logs...'}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
