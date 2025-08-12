import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export function QuickDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostic = async () => {
      const diagnostics: DiagnosticResult[] = [];

      // Test database connection
      try {
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === 'PGRST205') {
            diagnostics.push({
              name: 'Base de Datos',
              status: 'error',
              message: 'Tablas no encontradas - ejecutar setup SQL'
            });
          } else {
            diagnostics.push({
              name: 'Base de Datos',
              status: 'error',
              message: `Error: ${error.message}`
            });
          }
        } else {
          diagnostics.push({
            name: 'Base de Datos',
            status: 'success',
            message: 'Conexión exitosa'
          });
        }
      } catch (error) {
        diagnostics.push({
          name: 'Base de Datos',
          status: 'error',
          message: 'Error de conexión'
        });
      }

      // Test auth
      try {
        const { data: { session } } = await supabase.auth.getSession();
        diagnostics.push({
          name: 'Autenticación',
          status: session ? 'success' : 'warning',
          message: session ? `Usuario: ${session.user?.email}` : 'Sin sesión activa'
        });
      } catch (error) {
        diagnostics.push({
          name: 'Autenticación',
          status: 'error',
          message: 'Error en auth'
        });
      }

      setResults(diagnostics);
      setLoading(false);
    };

    runDiagnostic();
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">ERROR</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">WARN</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">?</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasErrors = results.some(r => r.status === 'error');

  if (!hasErrors) return null;

  return (
    <Card className="mb-4 border-red-200 bg-red-50">
      <CardContent className="p-4">
        <h4 className="font-semibold text-red-800 mb-3">Diagnóstico del Sistema</h4>
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getIcon(result.status)}
                <span className="text-sm">{result.name}</span>
                <span className="text-xs text-gray-600">{result.message}</span>
              </div>
              {getBadge(result.status)}
            </div>
          ))}
        </div>
        {hasErrors && (
          <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-800">
            <strong>Acción requerida:</strong> Ejecuta el setup de base de datos en Supabase SQL Editor
          </div>
        )}
      </CardContent>
    </Card>
  );
}