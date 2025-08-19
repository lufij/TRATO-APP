import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  User,
  RefreshCw,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function OrphanedUserDiagnostic() {
  const { orphanedUser, signOut } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: DiagnosticResult[] = [];

    try {
      // Test 1: Check if users table exists
      try {
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === 'PGRST205') {
            results.push({
              name: 'Tabla users',
              status: 'error',
              message: 'La tabla users no existe',
              details: 'Necesitas ejecutar el script de configuración de la base de datos'
            });
          } else {
            results.push({
              name: 'Tabla users',
              status: 'error',
              message: 'Error accediendo a la tabla users',
              details: error.message
            });
          }
        } else {
          results.push({
            name: 'Tabla users',
            status: 'success',
            message: 'La tabla users existe y es accesible'
          });
        }
      } catch (error: any) {
        results.push({
          name: 'Tabla users',
          status: 'error',
          message: 'Error de conexión con la base de datos',
          details: error.message
        });
      }

      // Test 2: Check if sellers table exists
      try {
        const { error } = await supabase.from('sellers').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === 'PGRST205') {
            results.push({
              name: 'Tabla sellers',
              status: 'error',
              message: 'La tabla sellers no existe',
              details: 'Tabla necesaria para vendedores'
            });
          } else {
            results.push({
              name: 'Tabla sellers',
              status: 'warning',
              message: 'Problema accediendo a la tabla sellers',
              details: error.message
            });
          }
        } else {
          results.push({
            name: 'Tabla sellers',
            status: 'success',
            message: 'La tabla sellers existe'
          });
        }
      } catch (error) {
        // Sellers table is not critical for diagnosis
      }

      // Test 3: Check if drivers table exists
      try {
        const { error } = await supabase.from('drivers').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === 'PGRST205') {
            results.push({
              name: 'Tabla drivers',
              status: 'error',
              message: 'La tabla drivers no existe',
              details: 'Tabla necesaria para repartidores'
            });
          } else {
            results.push({
              name: 'Tabla drivers',
              status: 'warning',
              message: 'Problema accediendo a la tabla drivers',
              details: error.message
            });
          }
        } else {
          results.push({
            name: 'Tabla drivers',
            status: 'success',
            message: 'La tabla drivers existe'
          });
        }
      } catch (error) {
        // Drivers table is not critical for diagnosis
      }

      // Test 4: Check if orphaned user exists in auth
      if (orphanedUser) {
        results.push({
          name: 'Usuario autenticado',
          status: 'success',
          message: `Usuario ${orphanedUser.email} está autenticado en Supabase Auth`,
          details: `ID: ${orphanedUser.id}`
        });

        // Test 5: Check if user profile exists in users table
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', orphanedUser.id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              results.push({
                name: 'Perfil de usuario',
                status: 'error',
                message: 'El usuario no tiene perfil en la tabla users',
                details: 'Esta es la causa del problema de usuario huérfano'
              });
            } else {
              results.push({
                name: 'Perfil de usuario',
                status: 'error',
                message: 'Error al buscar el perfil del usuario',
                details: error.message
              });
            }
          } else if (data) {
            results.push({
              name: 'Perfil de usuario',
              status: 'warning',
              message: 'El usuario SÍ tiene perfil (inconsistencia detectada)',
              details: `Rol: ${data.role}, Nombre: ${data.name}`
            });
          }
        } catch (error: any) {
          results.push({
            name: 'Perfil de usuario',
            status: 'error',
            message: 'Error verificando perfil del usuario',
            details: error.message
          });
        }
      } else {
        results.push({
          name: 'Usuario autenticado',
          status: 'error',
          message: 'No hay usuario huérfano detectado',
          details: 'Esto es extraño, debería haber un usuario autenticado'
        });
      }

      // Test 6: Check RLS policies
      try {
        const { data, error } = await supabase
          .from('pg_policies')
          .select('*')
          .eq('schemaname', 'public')
          .eq('tablename', 'users');

        if (error) {
          results.push({
            name: 'Políticas RLS',
            status: 'warning',
            message: 'No se pudieron verificar las políticas RLS',
            details: 'Esto podría afectar el acceso a los datos'
          });
        } else {
          results.push({
            name: 'Políticas RLS',
            status: 'success',
            message: 'Políticas RLS verificadas'
          });
        }
      } catch (error) {
        // RLS check is not critical
      }

    } catch (error: any) {
      results.push({
        name: 'Conexión general',
        status: 'error',
        message: 'Error general de conexión',
        details: error.message
      });
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">ADVERTENCIA</Badge>;
    }
  };

  const getRecommendations = () => {
    const hasTableErrors = diagnostics.some(d => d.name.includes('Tabla') && d.status === 'error');
    const hasUserProfileError = diagnostics.some(d => d.name === 'Perfil de usuario' && d.status === 'error');

    if (hasTableErrors) {
      return {
        title: 'Base de datos no configurada',
        message: 'Necesitas configurar las tablas en Supabase',
        action: 'Configurar Base de Datos',
        priority: 'high'
      };
    }

    if (hasUserProfileError) {
      return {
        title: 'Perfil de usuario faltante',
        message: 'El usuario está autenticado pero no tiene perfil',
        action: 'Recuperar Perfil',
        priority: 'medium'
      };
    }

    return {
      title: 'Todo parece estar bien',
      message: 'Los diagnósticos no muestran problemas evidentes',
      action: 'Recargar Aplicación',
      priority: 'low'
    };
  };

  const recommendations = getRecommendations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Diagnóstico de Usuario Huérfano</h1>
                <p className="text-sm text-gray-600">Analizando el problema de autenticación</p>
              </div>
            </div>
            <Button variant="outline" onClick={signOut}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* User Info */}
        {orphanedUser && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Usuario Detectado</h3>
                  <p className="text-gray-600">Email: <strong>{orphanedUser.email}</strong></p>
                  <p className="text-sm text-gray-500">ID: {orphanedUser.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        <Card className={`mb-6 border-2 ${
          recommendations.priority === 'high' ? 'border-red-300' :
          recommendations.priority === 'medium' ? 'border-yellow-300' :
          'border-green-300'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                recommendations.priority === 'high' ? 'bg-red-100' :
                recommendations.priority === 'medium' ? 'bg-yellow-100' :
                'bg-green-100'
              }`}>
                {recommendations.priority === 'high' ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : recommendations.priority === 'medium' ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">{recommendations.title}</h3>
                <p className="text-gray-700 mb-4">{recommendations.message}</p>
                <div className="flex gap-3">
                  {recommendations.priority === 'high' && (
                    <Button asChild>
                      <a 
                        href="https://supabase.com/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ir a Supabase Dashboard
                      </a>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={runDiagnostics}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Volver a Diagnosticar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostic Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Resultados del Diagnóstico
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Ejecutando diagnósticos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {diagnostics.map((diagnostic, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(diagnostic.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{diagnostic.name}</h4>
                        {getStatusBadge(diagnostic.status)}
                      </div>
                      <p className="text-gray-700 text-sm mb-1">{diagnostic.message}</p>
                      {diagnostic.details && (
                        <p className="text-xs text-gray-500">{diagnostic.details}</p>
                      )}
                    </div>
                  </div>
                ))}

                {diagnostics.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se pudieron ejecutar los diagnósticos
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        {recommendations.priority === 'high' && (
          <Card className="mt-6 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Pasos para Solucionar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 font-medium px-2 py-1 rounded text-xs">1</span>
                  <p>Ve a <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 font-medium px-2 py-1 rounded text-xs">2</span>
                  <p>Ejecuta el script completo de <code className="bg-gray-100 px-1 rounded">/database/fix_setup.sql</code></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 font-medium px-2 py-1 rounded text-xs">3</span>
                  <p>Ve a <strong>Authentication → Settings</strong> y desactiva email confirmations</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-red-100 text-red-800 font-medium px-2 py-1 rounded text-xs">4</span>
                  <p>Recarga esta página y prueba nuevamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}