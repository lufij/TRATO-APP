import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { CredentialChecker } from './CredentialChecker';
import { GeolocationDiagnostic } from './GeolocationDiagnostic';

interface DiagnosticResult {
  component: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function DiagnosticPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'success' | 'error' | 'warning'>('success');

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: DiagnosticResult[] = [];

    try {
      // Test 1: Check Supabase connection
      try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === 'PGRST205') {
            diagnostics.push({
              component: 'Tabla Users',
              status: 'error',
              message: 'Tabla "users" no encontrada',
              details: 'Ejecutar fix_setup.sql en Supabase SQL Editor'
            });
          } else {
            diagnostics.push({
              component: 'Tabla Users',
              status: 'error',
              message: `Error de base de datos: ${error.message}`,
              details: error.code || 'Error desconocido'
            });
          }
        } else {
          diagnostics.push({
            component: 'Tabla Users',
            status: 'success',
            message: `Tabla users existe (${data || 0} registros)`,
            details: 'Configuración correcta'
          });
        }
      } catch (error) {
        diagnostics.push({
          component: 'Conexión Supabase',
          status: 'error',
          message: 'Error de conexión a Supabase',
          details: 'Verificar credenciales en config.ts'
        });
      }

      // Test 2: Check other critical tables
      const tables = ['sellers', 'drivers', 'products', 'cart_items', 'orders'];
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
          if (error) {
            diagnostics.push({
              component: `Tabla ${table}`,
              status: 'error',
              message: `Tabla "${table}" no encontrada o error de acceso`,
              details: error.message
            });
          } else {
            diagnostics.push({
              component: `Tabla ${table}`,
              status: 'success',
              message: `Tabla ${table} existe y es accesible`,
            });
          }
        } catch (error) {
          diagnostics.push({
            component: `Tabla ${table}`,
            status: 'error',
            message: `Error al acceder a tabla ${table}`,
          });
        }
      }

      // Test 3: Check Storage buckets
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
          diagnostics.push({
            component: 'Storage Buckets',
            status: 'error',
            message: 'Error al acceder a Storage',
            details: error.message
          });
        } else {
          const expectedBuckets = ['products', 'avatars', 'business-logos'];
          const existingBuckets = buckets?.map(b => b.name) || [];
          const missingBuckets = expectedBuckets.filter(b => !existingBuckets.includes(b));
          
          if (missingBuckets.length === 0) {
            diagnostics.push({
              component: 'Storage Buckets',
              status: 'success',
              message: 'Todos los buckets existen',
              details: `Buckets: ${existingBuckets.join(', ')}`
            });
          } else {
            diagnostics.push({
              component: 'Storage Buckets',
              status: 'warning',
              message: `Buckets faltantes: ${missingBuckets.join(', ')}`,
              details: 'Ejecutar fix_setup.sql para crear buckets'
            });
          }
        }
      } catch (error) {
        diagnostics.push({
          component: 'Storage Buckets',
          status: 'error',
          message: 'Error al verificar buckets de storage',
        });
      }

      // Test 4: Check Auth configuration
      try {
        // Try to get current session
        const { data: { session } } = await supabase.auth.getSession();
        diagnostics.push({
          component: 'Autenticación',
          status: session ? 'success' : 'warning',
          message: session ? 'Usuario autenticado' : 'Sin sesión activa',
          details: session ? `Usuario: ${session.user?.email}` : 'Estado normal para usuario no logueado'
        });
      } catch (error) {
        diagnostics.push({
          component: 'Autenticación',
          status: 'error',
          message: 'Error en sistema de autenticación',
        });
      }

    } catch (error) {
      diagnostics.push({
        component: 'General',
        status: 'error',
        message: 'Error general en diagnósticos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }

    setResults(diagnostics);
    
    // Determine overall status
    const hasErrors = diagnostics.some(d => d.status === 'error');
    const hasWarnings = diagnostics.some(d => d.status === 'warning');
    
    if (hasErrors) {
      setOverallStatus('error');
    } else if (hasWarnings) {
      setOverallStatus('warning');
    } else {
      setOverallStatus('success');
    }

    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">ERROR</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">WARNING</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Diagnóstico de Configuración - DeliveryApp
          </h1>
          <p className="text-gray-600">
            Esta página verifica que tu configuración de Supabase esté funcionando correctamente.
          </p>
        </div>

        {/* Credential Checker */}
        <div className="mb-6">
          <CredentialChecker />
        </div>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              Estado General
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={loading}
                className="ml-auto"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Nuevamente
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overallStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuración incompleta.</strong> Ejecuta el script <code>fix_setup.sql</code> en Supabase SQL Editor para resolver los errores.
                </AlertDescription>
              </Alert>
            )}
            {overallStatus === 'warning' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuración parcial.</strong> Algunos componentes necesitan atención pero la aplicación debería funcionar.
                </AlertDescription>
              </Alert>
            )}
            {overallStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>¡Configuración completa!</strong> Tu aplicación está lista para usar.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <div className="grid gap-4">
          {results.map((result, index) => (
            <Card key={index} className={`border-l-4 ${
              result.status === 'success' ? 'border-l-green-500' :
              result.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{result.component}</span>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-gray-700">{result.message}</p>
                      {result.details && (
                        <p className="text-sm text-gray-500 mt-1">{result.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        {overallStatus === 'error' && (
          <Card className="mt-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Instrucciones de Reparación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">1</span>
                  <div>
                    <p className="font-medium text-red-800">Abrir Supabase Dashboard</p>
                    <p className="text-red-700">Ve a https://supabase.com/dashboard y selecciona tu proyecto</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">2</span>
                  <div>
                    <p className="font-medium text-red-800">Ejecutar Script SQL</p>
                    <p className="text-red-700">Ve a SQL Editor → New Query → Copia y ejecuta el contenido completo de <code>/database/fix_setup.sql</code></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">3</span>
                  <div>
                    <p className="font-medium text-red-800">Configurar Autenticación</p>
                    <p className="text-red-700">Ve a Authentication → Settings → Desactiva "Enable email confirmations"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">4</span>
                  <div>
                    <p className="font-medium text-red-800">Verificar Resultados</p>
                    <p className="text-red-700">Haz clic en "Verificar Nuevamente" para confirmar que todo esté funcionando</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geolocation Diagnostic */}
        <div className="mt-8">
          <GeolocationDiagnostic />
        </div>

        {/* Project Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Información del Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Proyecto Supabase:</span>
                <p className="text-gray-600">olidxbacfxrijmmtpcoy</p>
              </div>
              <div>
                <span className="font-medium">URL:</span>
                <p className="text-gray-600 break-all">https://olidxbacfxrijmmtpcoy.supabase.co</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}