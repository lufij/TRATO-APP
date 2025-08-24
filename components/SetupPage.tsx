import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const setupTestData = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('🚀 Iniciando setup de datos de prueba...');
      
      // 1. Crear usuarios
      addResult('👤 Creando usuarios...');
      const usersData = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Pizzería Test',
          email: 'vendor@test.com',
          role: 'vendedor',
          address: 'Buenos Aires'
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Conductor Test', 
          email: 'driver@test.com',
          role: 'repartidor',
          address: 'Buenos Aires'
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Cliente Test',
          email: 'buyer@test.com', 
          role: 'comprador',
          address: 'Buenos Aires'
        }
      ];
      
      for (const user of usersData) {
        const { error } = await supabase.from('users').upsert(user);
        if (error && !error.message.includes('duplicate')) {
          addResult(`❌ Error creando usuario ${user.name}: ${error.message}`);
        } else {
          addResult(`✅ Usuario ${user.name} creado`);
        }
      }
      
      // 2. Crear vendedor con coordenadas
      addResult('🏪 Creando vendedor con Google Maps...');
      const { error: sellerError } = await supabase.from('sellers').upsert({
        user_id: '11111111-1111-1111-1111-111111111111',
        business_name: 'Pizzería Test',
        business_address: 'Avenida Corrientes 1500, Buenos Aires, Argentina',
        latitude: -34.6037,
        longitude: -58.3816,
        location_verified: true,
        is_open_now: true,
        category: 'restaurant'
      });
      
      if (sellerError && !sellerError.message.includes('duplicate')) {
        addResult(`❌ Error creando vendedor: ${sellerError.message}`);
      } else {
        addResult('✅ Vendedor creado con coordenadas Google Maps (-34.6037, -58.3816)');
      }
      
      // 3. Crear orden
      addResult('📦 Creando orden de prueba...');
      const { error: orderError } = await supabase.from('orders').upsert({
        id: '44444444-4444-4444-4444-444444444444',
        buyer_id: '33333333-3333-3333-3333-333333333333',
        seller_id: '11111111-1111-1111-1111-111111111111',
        driver_id: '22222222-2222-2222-2222-222222222222',
        status: 'assigned',
        total_amount: 25.50,
        delivery_address: 'Palermo, Buenos Aires',
        customer_name: 'Cliente Test',
        customer_phone: '+54 11 1234-5678'
      });
      
      if (orderError && !orderError.message.includes('duplicate')) {
        addResult(`❌ Error creando orden: ${orderError.message}`);
      } else {
        addResult('✅ Orden creada y asignada al repartidor');
      }
      
      // 4. Verificar datos
      addResult('🔍 Verificando datos creados...');
      const { data: vendedor } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', '11111111-1111-1111-1111-111111111111')
        .single();
        
      const { data: orden } = await supabase
        .from('orders')
        .select('*')
        .eq('id', '44444444-4444-4444-4444-444444444444')
        .single();
      
      if (vendedor) {
        addResult(`📍 Vendedor: ${vendedor.business_name} en ${vendedor.business_address}`);
        addResult(`🗺️ Coordenadas: ${vendedor.latitude}, ${vendedor.longitude}`);
      }
      
      if (orden) {
        addResult(`📦 Orden ${orden.id}: ${orden.status} - $${orden.total_amount}`);
        addResult(`👤 Cliente: ${orden.customer_name}`);
      }
      
      addResult('');
      addResult('🎉 ¡Setup completado! Ahora puedes:');
      addResult('1. Ir a la página de login');
      addResult('2. Entrar como repartidor: driver@test.com');
      addResult('3. Ver la orden asignada con botones mejorados');
      addResult('4. Probar "Ir a recoger" con Google Maps');
      
    } catch (err) {
      addResult(`❌ Error general: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              🛠️ Setup de Datos de Prueba - Sistema de Repartidores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Button 
                onClick={setupTestData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                size="lg"
              >
                {loading ? '⏳ Configurando...' : '🚀 Crear Datos de Prueba'}
              </Button>
            </div>
            
            {results.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Resultados del Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div key={index}>{result}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                📋 Este setup creará:
              </h3>
              <ul className="text-blue-700 space-y-1">
                <li>• 3 usuarios de prueba (vendedor, repartidor, comprador)</li>
                <li>• 1 vendedor con coordenadas reales de Google Maps</li>
                <li>• 1 orden asignada al repartidor para probar</li>
                <li>• Botones "Ir a recoger" e "Ir al cliente" funcionando</li>
                <li>• Integración con Google Maps para navegación</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
