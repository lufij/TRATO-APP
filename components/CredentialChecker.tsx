import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle, Key } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { supabaseConfig } from '../utils/supabase/config';

interface CredentialStatus {
  name: string;
  status: 'success' | 'error' | 'info';
  value?: string;
  message: string;
}

export function CredentialChecker() {
  const [credentials, setCredentials] = useState<CredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCredentials = async () => {
      const results: CredentialStatus[] = [];

      // Check Project URL
      if (supabaseConfig.url) {
        const projectId = supabaseConfig.url.split('//')[1]?.split('.')[0];
        results.push({
          name: 'Project URL',
          status: 'success',
          value: supabaseConfig.url,
          message: `Proyecto: ${projectId}`
        });
      } else {
        results.push({
          name: 'Project URL',
          status: 'error',
          message: 'URL del proyecto no configurada'
        });
      }

      // Check Anon Key
      if (supabaseConfig.anonKey) {
        const keyPrefix = supabaseConfig.anonKey.substring(0, 20) + '...';
        results.push({
          name: 'Anon Key',
          status: 'success',
          value: keyPrefix,
          message: 'Clave pública configurada correctamente'
        });
      } else {
        results.push({
          name: 'Anon Key',
          status: 'error',
          message: 'Clave pública no configurada'
        });
      }

      // Test connection
      try {
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === 'PGRST205') {
            results.push({
              name: 'Conexión DB',
              status: 'error',
              message: 'Tablas no creadas - ejecutar fix_setup.sql'
            });
          } else {
            results.push({
              name: 'Conexión DB',
              status: 'error',
              message: `Error de conexión: ${error.message}`
            });
          }
        } else {
          results.push({
            name: 'Conexión DB',
            status: 'success',
            message: 'Conexión a base de datos exitosa'
          });
        }
      } catch (error) {
        results.push({
          name: 'Conexión DB',
          status: 'error',
          message: 'Error al conectar con Supabase'
        });
      }

      // Check Auth
      try {
        const { data: { session } } = await supabase.auth.getSession();
        results.push({
          name: 'Autenticación',
          status: 'info',
          message: session ? `Usuario: ${session.user?.email}` : 'Sistema de auth funcional'
        });
      } catch (error) {
        results.push({
          name: 'Autenticación',
          status: 'error',
          message: 'Error en sistema de autenticación'
        });
      }

      // Check Storage
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
          results.push({
            name: 'Storage',
            status: 'error',
            message: `Error de storage: ${error.message}`
          });
        } else {
          const bucketCount = buckets?.length || 0;
          results.push({
            name: 'Storage',
            status: bucketCount > 0 ? 'success' : 'error',
            message: bucketCount > 0 ? `${bucketCount} buckets configurados` : 'Sin buckets configurados'
          });
        }
      } catch (error) {
        results.push({
          name: 'Storage',
          status: 'error',
          message: 'Error al acceder a storage'
        });
      }

      setCredentials(results);
      setLoading(false);
    };

    checkCredentials();
  }, []);

  const getStatusIcon = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✓ OK</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">✗ ERROR</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">ℹ INFO</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Verificando credenciales...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Estado de Credenciales Supabase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials.map((cred, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              cred.status === 'success' ? 'bg-green-50 border-green-200' :
              cred.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(cred.status)}
              <div>
                <p className="font-medium">{cred.name}</p>
                <p className="text-sm text-gray-600">{cred.message}</p>
                {cred.value && (
                  <p className="text-xs text-gray-500 font-mono">{cred.value}</p>
                )}
              </div>
            </div>
            {getStatusBadge(cred.status)}
          </div>
        ))}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">¿Necesitas más credenciales?</h4>
          <p className="text-sm text-gray-600">
            Para tu aplicación de delivery, las credenciales actuales son <strong>suficientes</strong>. 
            Solo necesitarías credenciales adicionales para funciones avanzadas como operaciones de administrador.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}