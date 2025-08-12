import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Settings,
  Info,
  Globe,
  Lock,
  Unlock
} from 'lucide-react';

export function GeolocationDiagnostic() {
  const [diagnosticStep, setDiagnosticStep] = useState<string>('Iniciando diagnóstico...');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const {
    position,
    error: locationError,
    loading: locationLoading,
    supported: locationSupported,
    permissionState,
    getCurrentPosition,
    requestPermission
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    immediate: false
  });

  const addTestResult = (test: string, status: 'success' | 'error' | 'warning', message: string, details?: any) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setTestResults([]);
    setDiagnosticStep('Ejecutando diagnóstico completo...');

    try {
      // Test 1: Check browser support
      setDiagnosticStep('Verificando soporte del navegador...');
      if (locationSupported) {
        addTestResult('Browser Support', 'success', 'Geolocation API soportada');
      } else {
        addTestResult('Browser Support', 'error', 'Geolocation API no soportada en este navegador');
        setIsRunning(false);
        return;
      }

      // Test 2: Check permissions API
      setDiagnosticStep('Verificando API de permisos...');
      if ('permissions' in navigator) {
        addTestResult('Permissions API', 'success', 'API de permisos disponible');
        
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          addTestResult('Permission State', 'success', `Estado: ${permission.state}`, { state: permission.state });
        } catch (error) {
          addTestResult('Permission Query', 'error', 'Error al consultar permisos', error);
        }
      } else {
        addTestResult('Permissions API', 'warning', 'API de permisos no disponible (navegador antiguo)');
      }

      // Test 3: Check HTTPS context
      setDiagnosticStep('Verificando contexto de seguridad...');
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      if (isSecure) {
        addTestResult('Security Context', 'success', 'Contexto seguro (HTTPS/localhost)');
      } else {
        addTestResult('Security Context', 'warning', 'Contexto no seguro - Geolocation puede no funcionar', {
          protocol: location.protocol,
          hostname: location.hostname
        });
      }

      // Test 4: Browser info
      setDiagnosticStep('Recopilando información del navegador...');
      addTestResult('Browser Info', 'success', 'Información del navegador recopilada', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        platform: navigator.platform
      });

      // Test 5: Test permission request
      setDiagnosticStep('Probando solicitud de permisos...');
      try {
        const permissionResult = await requestPermission();
        addTestResult('Permission Request', 'success', `Permisos: ${permissionResult}`);
      } catch (error) {
        addTestResult('Permission Request', 'error', 'Error al solicitar permisos', error);
      }

      // Test 6: Test position retrieval
      setDiagnosticStep('Probando obtención de posición...');
      try {
        const position = await getCurrentPosition();
        addTestResult('Position Retrieval', 'success', 'Posición obtenida exitosamente', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      } catch (error) {
        addTestResult('Position Retrieval', 'error', 'Error al obtener posición', error);
      }

      setDiagnosticStep('Diagnóstico completado');
    } catch (error) {
      addTestResult('Diagnostic', 'error', 'Error durante el diagnóstico', error);
      setDiagnosticStep('Error en diagnóstico');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800">Exitoso</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Advertencia</Badge>;
      default: return <Badge variant="outline">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Diagnóstico de Geolocalización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Soporte</span>
              </div>
              <div className="flex items-center gap-1">
                {locationSupported ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm">
                  {locationSupported ? 'Soportado' : 'No soportado'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                {permissionState === 'granted' ? (
                  <Unlock className="w-4 h-4 text-green-600" />
                ) : (
                  <Lock className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm font-medium">Permisos</span>
              </div>
              <div className="text-sm">
                {permissionState || 'Desconocido'}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Posición</span>
              </div>
              <div className="text-sm">
                {position ? 'Disponible' : 'No disponible'}
              </div>
            </div>
          </div>

          {/* Current Position Info */}
          {position && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                <strong>Posición actual:</strong><br />
                Lat: {position.coords.latitude.toFixed(6)}<br />
                Lng: {position.coords.longitude.toFixed(6)}<br />
                Precisión: ±{position.coords.accuracy.toFixed(0)}m
              </AlertDescription>
            </Alert>
          )}

          {/* Current Error */}
          {locationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error actual:</strong><br />
                Código: {locationError.code}<br />
                Mensaje: {locationError.message}
                {locationError.details && (
                  <>
                    <br />
                    Detalles: {locationError.details}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Diagnostic Controls */}
          <div className="flex gap-2">
            <Button
              onClick={runFullDiagnostic}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Ejecutar Diagnóstico Completo
            </Button>

            <Button
              onClick={getCurrentPosition}
              disabled={locationLoading || isRunning}
              variant="outline"
            >
              Probar Ubicación
            </Button>
          </div>

          {/* Diagnostic Status */}
          {isRunning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800">{diagnosticStep}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados del Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{result.test}</span>
                      {getStatusBadge(result.status)}
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Ver detalles
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Guía de Solución de Problemas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium text-red-800">Si los permisos están denegados:</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                <li>• Haz clic en el ícono de ubicación en la barra de direcciones</li>
                <li>• Selecciona "Permitir" para este sitio</li>
                <li>• Recarga la página</li>
              </ul>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium text-yellow-800">Si la ubicación no está disponible:</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Verifica que el GPS esté habilitado en tu dispositivo</li>
                <li>• Asegúrate de tener conexión a internet</li>
                <li>• Intenta mover el dispositivo al aire libre</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-blue-800">Si el tiempo de espera se agota:</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Espera un momento y vuelve a intentar</li>
                <li>• Verifica tu conexión de red</li>
                <li>• Considera usar entrada manual de dirección</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}