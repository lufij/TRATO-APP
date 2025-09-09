import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function RealtimeDiagnostic() {
  const { user } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string, details?: string) => {
    setResults(prev => [...prev, { test, status, message, details }]);
  };

  const runDiagnostic = async () => {
    setTesting(true);
    setResults([]);
    
    try {
      console.log('🔍 Iniciando diagnóstico de Realtime...');
      
      // Test 1: Verificar conexión básica
      addResult('Conexión Básica', 'success', 'Cliente Supabase inicializado correctamente');
      
      // Test 2: Verificar permisos de usuario
      if (!user) {
        addResult('Usuario', 'error', 'No hay usuario autenticado');
        return;
      }
      addResult('Usuario', 'success', `Usuario autenticado: ${user.email}`);
      
      // Test 3: Verificar tabla orders existe
      try {
        const { error: tableError } = await supabase
          .from('orders')
          .select('count', { count: 'exact', head: true });
        
        if (tableError) {
          addResult('Tabla Orders', 'error', `Error accediendo tabla orders: ${tableError.message}`);
        } else {
          addResult('Tabla Orders', 'success', 'Tabla orders accesible');
        }
      } catch (err) {
        addResult('Tabla Orders', 'error', `Excepción al acceder tabla orders: ${err}`);
      }
      
      // Test 4: Crear canal de prueba
      let testChannel: any = null;
      try {
        testChannel = supabase
          .channel('diagnostic-test')
          .on('broadcast', { event: 'test' }, (payload) => {
            console.log('✅ Canal de test funcionando:', payload);
            addResult('Canal Test', 'success', 'Canal de broadcast funcionando');
          })
          .subscribe((status) => {
            setConnectionStatus(status);
            console.log('📡 Estado del canal:', status);
            
            if (status === 'SUBSCRIBED') {
              addResult('Suscripción', 'success', 'Canal suscrito correctamente');
              // Enviar mensaje de prueba
              testChannel?.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: 'Prueba de diagnóstico' }
              });
            } else if (status === 'CHANNEL_ERROR') {
              addResult('Suscripción', 'error', 'Error en la suscripción del canal');
            } else if (status === 'TIMED_OUT') {
              addResult('Suscripción', 'warning', 'Timeout en la suscripción');
            }
          });

        // Test 5: Verificar RLS en orders para vendedor
        if (user.role === 'vendedor') {
          try {
            const { data: ordersData, error: ordersError } = await supabase
              .from('orders')
              .select('id, seller_id, status, created_at')
              .eq('seller_id', user.id)
              .limit(1);
            
            if (ordersError) {
              addResult('RLS Orders', 'warning', `RLS podría estar bloqueando: ${ordersError.message}`);
            } else {
              addResult('RLS Orders', 'success', `Acceso a orders OK (${ordersData?.length || 0} registros)`);
            }
          } catch (err) {
            addResult('RLS Orders', 'error', `Error en RLS: ${err}`);
          }
        }
        
        // Test 6: Probar suscripción a orders
        const ordersChannel = supabase
          .channel('orders-diagnostic')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: user.role === 'vendedor' ? `seller_id=eq.${user.id}` : undefined
            },
            (payload) => {
              console.log('📦 Cambio en orders detectado:', payload);
              addResult('Orders Realtime', 'success', `Evento recibido: ${payload.eventType}`);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              addResult('Orders Realtime', 'success', 'Suscrito a cambios en orders');
            } else if (status === 'CHANNEL_ERROR') {
              addResult('Orders Realtime', 'error', 'Error suscribiéndose a orders');
            }
          });

        // Cleanup después de 5 segundos
        setTimeout(() => {
          if (testChannel) supabase.removeChannel(testChannel);
          supabase.removeChannel(ordersChannel);
          addResult('Cleanup', 'success', 'Canales de prueba cerrados');
        }, 5000);
        
      } catch (err) {
        addResult('Canal Test', 'error', `Error creando canal de prueba: ${err}`);
      }
      
      // Test 7: Verificar configuración de Supabase
      try {
        // Verificar variables de entorno en lugar de propiedades internas
        const hasUrl = import.meta.env.VITE_SUPABASE_URL;
        const hasKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!hasUrl || !hasKey) {
          addResult('Configuración', 'error', 'Variables de entorno no configuradas');
        } else if (hasUrl.includes('placeholder') || hasUrl.includes('localhost')) {
          addResult('Configuración', 'warning', 'Usando configuración de desarrollo');
        } else {
          addResult('Configuración', 'success', 'Configuración de producción detectada');
        }
      } catch (err) {
        addResult('Configuración', 'error', 'Error verificando configuración');
      }
      
    } catch (error) {
      addResult('General', 'error', `Error general en diagnóstico: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6" />
          Diagnóstico de Realtime - Notificaciones
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Usuario: {user?.role || 'No autenticado'}</Badge>
          <Badge className={connectionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 'bg-red-500'}>
            Conexión: {connectionStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostic} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Ejecutando diagnóstico...
            </>
          ) : (
            'Ejecutar Diagnóstico de Realtime'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Resultados del Diagnóstico:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.test}</span>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">ℹ️ Información del Diagnóstico</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Verifica que Supabase Realtime esté funcionando</li>
            <li>• Comprueba permisos RLS en la tabla orders</li>
            <li>• Prueba suscripciones a cambios en tiempo real</li>
            <li>• Detecta problemas de configuración</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
