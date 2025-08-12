import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useOrder } from '../../contexts/OrderContext';
import { supabase } from '../../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  ShoppingCart, 
  User, 
  Package,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface DiagnosticResult {
  category: string;
  checks: {
    name: string;
    status: 'success' | 'warning' | 'error';
    message: string;
    details?: string;
  }[];
}

export function CheckoutDiagnostic() {
  const { user } = useAuth();
  const { items, loading: cartLoading, getCartTotal } = useCart();
  const { loading: orderLoading } = useOrder();
  
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<'unknown' | 'configured' | 'needs-setup'>('unknown');

  const runDiagnostic = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      // 1. Auth Diagnostic
      const authChecks = [];
      if (user) {
        authChecks.push({
          name: 'Usuario autenticado',
          status: 'success' as const,
          message: `Logueado como ${user.name} (${user.role})`,
          details: `ID: ${user.id}, Email: ${user.email}`
        });
      } else {
        authChecks.push({
          name: 'Usuario autenticado',
          status: 'error' as const,
          message: 'No hay usuario autenticado'
        });
      }

      results.push({
        category: 'Autenticación',
        checks: authChecks
      });

      // 2. Cart Diagnostic
      const cartChecks = [];
      
      if (cartLoading) {
        cartChecks.push({
          name: 'Estado del carrito',
          status: 'warning' as const,
          message: 'Carrito cargando...'
        });
      } else {
        cartChecks.push({
          name: 'Estado del carrito',
          status: 'success' as const,
          message: `${items.length} productos en carrito`,
          details: `Total: Q${getCartTotal().toFixed(2)}`
        });

        if (items.length === 0) {
          cartChecks.push({
            name: 'Productos en carrito',
            status: 'warning' as const,
            message: 'Carrito vacío - agrega productos primero'
          });
        } else {
          // Validate cart items
          const validItems = items.filter(item => 
            item.product_id && 
            item.product_name && 
            item.product_price && 
            item.quantity > 0
          );

          if (validItems.length === items.length) {
            cartChecks.push({
              name: 'Validez de productos',
              status: 'success' as const,
              message: 'Todos los productos son válidos'
            });
          } else {
            cartChecks.push({
              name: 'Validez de productos',
              status: 'error' as const,
              message: `${items.length - validItems.length} productos inválidos detectados`
            });
          }

          // Check seller consistency
          const sellerIds = [...new Set(items.map(item => item.seller_id).filter(Boolean))];
          if (sellerIds.length <= 1) {
            cartChecks.push({
              name: 'Consistencia de vendedor',
              status: 'success' as const,
              message: 'Todos los productos son del mismo vendedor'
            });
          } else {
            cartChecks.push({
              name: 'Consistencia de vendedor',
              status: 'error' as const,
              message: 'Productos de múltiples vendedores detectados',
              details: 'Solo puedes comprar de un vendedor a la vez'
            });
          }
        }
      }

      results.push({
        category: 'Carrito de Compras',
        checks: cartChecks
      });

      // 3. Database Tables Diagnostic
      const dbChecks = [];
      
      try {
        // Check essential tables
        const tables = [
          'users',
          'products', 
          'cart_items',
          'orders',
          'order_items',
          'user_addresses'
        ];

        let configuredTablesCount = 0;

        for (const table of tables) {
          try {
            const { error } = await supabase
              .from(table)
              .select('count', { count: 'exact', head: true });

            if (error) {
              if (error.code === 'PGRST205') {
                dbChecks.push({
                  name: `Tabla ${table}`,
                  status: 'error' as const,
                  message: `Tabla ${table} no existe`
                });
              } else {
                dbChecks.push({
                  name: `Tabla ${table}`,
                  status: 'warning' as const,
                  message: `Error accediendo tabla ${table}`,
                  details: error.message
                });
              }
            } else {
              dbChecks.push({
                name: `Tabla ${table}`,
                status: 'success' as const,
                message: `Tabla ${table} accesible`
              });
              configuredTablesCount++;
            }
          } catch (tableError) {
            dbChecks.push({
              name: `Tabla ${table}`,
              status: 'error' as const,
              message: `Error crítico en tabla ${table}`,
              details: String(tableError)
            });
          }
        }

        // Determine overall Supabase status
        if (configuredTablesCount === tables.length) {
          setSupabaseStatus('configured');
        } else if (configuredTablesCount === 0) {
          setSupabaseStatus('needs-setup');
        } else {
          setSupabaseStatus('needs-setup'); // Partial setup still needs completion
        }

        // Check RPC functions
        try {
          const { error: rpcError } = await supabase.rpc('add_to_cart_safe', {
            p_user_id: 'test',
            p_product_id: 'test',
            p_quantity: 1,
            p_product_type: 'regular'
          });

          if (rpcError && rpcError.code !== '23503') { // 23503 is expected (invalid foreign key)
            dbChecks.push({
              name: 'Función add_to_cart_safe',
              status: 'error' as const,
              message: 'Función RPC no disponible',
              details: rpcError.message
            });
          } else {
            dbChecks.push({
              name: 'Función add_to_cart_safe',
              status: 'success' as const,
              message: 'Función RPC disponible'
            });
          }
        } catch (rpcError) {
          dbChecks.push({
            name: 'Función add_to_cart_safe',
            status: 'warning' as const,
            message: 'No se pudo verificar función RPC'
          });
        }

      } catch (dbError) {
        dbChecks.push({
          name: 'Conexión a base de datos',
          status: 'error' as const,
          message: 'Error conectando a la base de datos',
          details: String(dbError)
        });
        setSupabaseStatus('needs-setup');
      }

      results.push({
        category: 'Base de Datos',
        checks: dbChecks
      });

      // 4. Order System Diagnostic
      const orderChecks = [];

      if (orderLoading) {
        orderChecks.push({
          name: 'Sistema de órdenes',
          status: 'warning' as const,
          message: 'Sistema de órdenes cargando...'
        });
      } else {
        orderChecks.push({
          name: 'Sistema de órdenes',
          status: 'success' as const,
          message: 'Sistema de órdenes disponible'
        });
      }

      // Check if user can create orders
      if (user && items.length > 0) {
        const validItems = items.filter(item => item.product_id && item.product_name && item.product_price);
        const sellerIds = [...new Set(validItems.map(item => item.seller_id).filter(Boolean))];

        if (validItems.length > 0 && sellerIds.length === 1) {
          orderChecks.push({
            name: 'Capacidad de crear orden',
            status: 'success' as const,
            message: 'Listo para crear orden'
          });
        } else {
          orderChecks.push({
            name: 'Capacidad de crear orden',
            status: 'error' as const,
            message: 'No se puede crear orden',
            details: validItems.length === 0 ? 'No hay productos válidos' : 'Múltiples vendedores'
          });
        }
      } else {
        orderChecks.push({
          name: 'Capacidad de crear orden',
          status: 'warning' as const,
          message: 'Necesita usuario autenticado y productos en carrito'
        });
      }

      results.push({
        category: 'Sistema de Órdenes',
        checks: orderChecks
      });

    } catch (error) {
      results.push({
        category: 'Error General',
        checks: [{
          name: 'Diagnóstico',
          status: 'error' as const,
          message: 'Error ejecutando diagnóstico',
          details: String(error)
        }]
      });
    }

    setDiagnosticResults(results);
    setLastRun(new Date());
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Auto-run on mount
  useEffect(() => {
    runDiagnostic();
  }, []);

  const overallStatus = diagnosticResults.length > 0 
    ? diagnosticResults.some(category => 
        category.checks.some(check => check.status === 'error')
      ) ? 'error'
      : diagnosticResults.some(category => 
          category.checks.some(check => check.status === 'warning')
        ) ? 'warning' 
        : 'success'
    : 'unknown';

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Diagnóstico del Sistema de Checkout
            </CardTitle>
            <Badge className={getStatusColor(overallStatus)}>
              {overallStatus === 'success' && 'Sistema OK'}
              {overallStatus === 'warning' && 'Advertencias'}
              {overallStatus === 'error' && 'Errores Detectados'}
              {overallStatus === 'unknown' && 'Sin Evaluar'}
            </Badge>
          </div>
          {lastRun && (
            <p className="text-sm text-muted-foreground">
              Última ejecución: {lastRun.toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button
              onClick={runDiagnostic}
              disabled={isRunning}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
            </Button>
          </div>

          {/* Supabase Status Alert */}
          {supabaseStatus === 'needs-setup' && (
            <Alert variant="destructive">
              <Database className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">⚠️ Tu base de datos Supabase necesita configuración</p>
                  <p className="text-sm">
                    Para solucionarlo:
                  </p>
                  <ol className="text-sm space-y-1 ml-4">
                    <li>1. Ve a Supabase Dashboard → SQL Editor</li>
                    <li>2. Ejecuta <code className="bg-muted px-1 rounded">/database/fix_setup.sql</code></li>
                    <li>3. Desactiva email confirmations en Auth Settings</li>
                    <li>4. Recarga la aplicación</li>
                  </ol>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Abrir Supabase
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {diagnosticResults.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                {category.category === 'Autenticación' && <User className="w-4 h-4" />}
                {category.category === 'Carrito de Compras' && <ShoppingCart className="w-4 h-4" />}
                {category.category === 'Base de Datos' && <Database className="w-4 h-4" />}
                {category.category === 'Sistema de Órdenes' && <Package className="w-4 h-4" />}
                {category.category}
              </h3>
              
              <div className="space-y-2">
                {category.checks.map((check, checkIndex) => (
                  <div key={checkIndex} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    {getStatusIcon(check.status)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{check.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(check.status)}`}
                        >
                          {check.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{check.message}</p>
                      {check.details && (
                        <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                          {check.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {categoryIndex < diagnosticResults.length - 1 && <Separator />}
            </div>
          ))}

          {diagnosticResults.length === 0 && !isRunning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No se ha ejecutado el diagnóstico aún. Haz clic en "Ejecutar Diagnóstico" para comenzar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}