import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ImageModalProvider } from './contexts/ImageModalContext';
import { CartProvider } from './contexts/CartContext';
import { ChatProvider } from './contexts/ChatContext';
import { UserStatusProvider } from './components/UserStatusIndicator';
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const RoleSelection = lazy(() => import('./components/RoleSelection').then(m => ({ default: m.RoleSelection })));
const RegistrationForm = lazy(() => import('./components/RegistrationForm').then(m => ({ default: m.RegistrationForm })));
const ProfileRecovery = lazy(() => import('./components/ProfileRecovery').then(m => ({ default: m.ProfileRecovery })));
const OrphanedUserDiagnostic = lazy(() => import('./components/OrphanedUserDiagnostic').then(m => ({ default: m.OrphanedUserDiagnostic })));
const BuyerDashboard = lazy(() => import('./components/BuyerDashboard').then(m => ({ default: m.BuyerDashboard })));
const SellerDashboard = lazy(() => import('./components/SellerDashboard').then(m => ({ default: m.SellerDashboard })));
const DriverDashboard = lazy(() => import('./components/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const DiagnosticPage = lazy(() => import('./components/DiagnosticPage').then(m => ({ default: m.DiagnosticPage })));
const SetupPage = lazy(() => import('./components/SetupPage').then(m => ({ default: m.SetupPage })));
const DiagnosticProbe = lazy(async () => {
  const mod = await import('./components/DiagnosticProbe');
  return { default: mod.default } as { default: React.ComponentType<any> };
});
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminSetup = lazy(() => import('./components/AdminSetup').then(m => ({ default: m.AdminSetup })));
import { SoundNotificationWrapper } from './components/SoundNotificationWrapper';
import { UserRole } from './utils/supabase/client';
import { supabaseEnvDiagnostics, supabaseConfig, environment } from './utils/supabase/config';
import { supabase } from './utils/supabase/client';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { AlertCircle, Database, Loader2, CheckCircle, Stethoscope, Download, RefreshCw } from 'lucide-react';
import { useServiceWorker } from './hooks/useServiceWorker';
import { useSoundNotifications } from './hooks/useSoundNotifications';
import { useAdvancedSoundNotifications } from './hooks/useAdvancedSoundNotifications';
import UniversalPWAInstall from './components/ui/UniversalPWAInstall';
import IOSNotificationSetup from './components/ui/IOSNotificationSetup';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

type AppState = 'welcome' | 'role-selection' | 'register' | 'diagnostic' | 'orphaned-diagnostic' | 'setup';

// PWA Meta Tags Component
function PWAMetaTags() {
  useEffect(() => {
    // Supabase preconnect to speed up TLS/DNS for auth & DB calls
    let supaOrigin = '';
    try {
      supaOrigin = new URL(supabaseConfig.url).origin;
    } catch {
      // ignore
    }
    // Add PWA meta tags to document head
    const meta = [
      { name: 'theme-color', content: '#f97316' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'TRATO' },
      { name: 'msapplication-TileColor', content: '#f97316' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
    ];

    const links: Array<{ rel: string; href: string }> = [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/assets/trato-logo.png' },
      { rel: 'icon', href: '/assets/trato-logo.png' }
    ];
    if (supaOrigin) {
      links.push({ rel: 'preconnect', href: supaOrigin });
      links.push({ rel: 'dns-prefetch', href: supaOrigin });
    }

    // Add meta tags
    meta.forEach(({ name, content }) => {
      let existingMeta = document.querySelector(`meta[name="${name}"]`);
      if (!existingMeta) {
        existingMeta = document.createElement('meta');
        existingMeta.setAttribute('name', name);
        document.head.appendChild(existingMeta);
      }
      existingMeta.setAttribute('content', content);
    });

    // Add link tags
    links.forEach(({ rel, href }) => {
      let existingLink = document.querySelector(`link[rel="${rel}"]`);
      if (!existingLink) {
        existingLink = document.createElement('link');
        existingLink.setAttribute('rel', rel);
        document.head.appendChild(existingLink);
      }
      existingLink.setAttribute('href', href);
    });

    // Cargar script de notificaciones sonoras
    if (!document.querySelector('script[src="/sound-notifications-activator.js"]')) {
      const soundScript = document.createElement('script');
      soundScript.src = '/sound-notifications-activator.js';
      soundScript.async = true;
      document.head.appendChild(soundScript);
      console.log('🔊 Script de notificaciones sonoras cargado');
    }

    // Set document title
    document.title = 'TRATO - Mercado Local Gualán';
  }, []);

  return null;
}

// Error boundary component for handling unexpected errors
function ErrorBoundaryFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-center">
          <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Error Inesperado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-700 text-sm">
            Ocurrió un error inesperado en la aplicación.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600 font-mono">{error.message}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={resetError} variant="outline" className="flex-1">
              Reintentar
            </Button>
            <Button onClick={() => window.location.reload()} className="flex-1">
              Recargar App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// PWA Install/Update Banner Component
function PWABanner() {
  const { serviceWorker, activateUpdate } = useServiceWorker();
  const [showPWAInstall, setShowPWAInstall] = useState(true);
  const [showNotificationSetup, setShowNotificationSetup] = useState(true);
  
  // Temporalmente deshabilitado para evitar falsos positivos
  const isOnline = true; // navigator.onLine;

  if (serviceWorker.hasUpdate) {
    return (
      <div className="bg-orange-500 text-white p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm font-medium">Nueva actualización disponible</span>
          <Button
            onClick={activateUpdate}
            size="sm"
            variant="secondary"
            className="ml-2 bg-white text-orange-500 hover:bg-gray-100"
          >
            Actualizar
          </Button>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-yellow-500 text-white p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Sin conexión - Usando versión offline</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPWAInstall && <UniversalPWAInstall onClose={() => setShowPWAInstall(false)} />}
      {showNotificationSetup && <IOSNotificationSetup onPermissionChange={() => setShowNotificationSetup(false)} />}
    </>
  );
}

function AppContent() {
  const { 
    user, 
    session,
    loading, 
    isRegistering, 
    registrationProgress, 
    registrationStep,
    orphanedUser 
  } = useAuth();
  
  const [currentState, setCurrentState] = useState<AppState>('welcome');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [hasDbError, setHasDbError] = useState(false);
  const [registrationTimeout, setRegistrationTimeout] = useState(false);
  const [appError, setAppError] = useState<Error | null>(null);

  // Check if Supabase is properly configured
  if (!supabaseEnvDiagnostics.hasEnv) {
    return (
      <div>
        <PWABanner />
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-yellow-200">
            <CardHeader className="text-center">
              <div className="bg-yellow-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-yellow-600" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2 text-yellow-800">
                <AlertCircle className="w-5 h-5" />
                Configuración de Supabase Requerida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium mb-2">
                  Variables de entorno no configuradas
                </p>
                <p className="text-yellow-700 text-sm">
                  La aplicación necesita que configures las credenciales de Supabase para funcionar correctamente.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Para desarrollo local:</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">1</span>
                    <p>Edita el archivo <code className="bg-gray-100 px-1 rounded">.env.local</code> en la raíz del proyecto</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">2</span>
                    <p>Agrega tus credenciales de Supabase (URL y ANON_KEY)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">3</span>
                    <p>Reinicia el servidor de desarrollo</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Para producción (Vercel):</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">1</span>
                    <p>Ve a <strong>Vercel Dashboard</strong> → <strong>Project Settings</strong> → <strong>Environment Variables</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">2</span>
                    <p>Agrega <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> y <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">3</span>
                    <p>Redespliega la aplicación</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recargar Aplicación
                </Button>
                <Button 
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  Abrir Supabase
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Consulta <code className="bg-gray-100 px-1 rounded">.env.example</code> para más detalles
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Database error codes that indicate configuration issues
  const DB_ERROR_CODES = useMemo(() => [
    'PGRST205', // table not found
    'PGRST204', // schema not found  
    'PGRST301', // row not found but could indicate table issues
    'PGRST116', // function not found
    'PGRST200', // relationship not found (for chat tables)
    '42P01',    // relation does not exist
    '42883',    // function does not exist
    '42P02',    // parameter does not exist
    '42703',    // column does not exist (for notifications/chat tables)
    '28P01',    // invalid password/auth
    '3D000',    // invalid catalog name
    '28000',    // invalid authorization
  ], []);

  // Check database connectivity on app start with improved error handling
  const checkDatabase = useCallback(async () => {
    try {
      const { error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      
      if (error) {
        // Check if it's a configuration-related error
        const isConfigError = DB_ERROR_CODES.includes(error.code) || 
                             error.message.toLowerCase().includes('table') ||
                             error.message.toLowerCase().includes('relation') ||
                             error.message.toLowerCase().includes('schema') ||
                             error.message.toLowerCase().includes('column');
        
        if (isConfigError) {
          setHasDbError(true);
        }
      } else {
        // If we get here successfully, clear any previous DB errors
        setHasDbError(false);
      }
    } catch (error) {
      console.warn('Database connectivity check failed:', error);
      setHasDbError(true);
    }
  }, [DB_ERROR_CODES]);

  useEffect(() => {
    // Fast path: open diagnostics if ?diag=1 is present
    const params = new URLSearchParams(window.location.search);
    if (params.get('diag') === '1') {
      setCurrentState('diagnostic');
    }
    
    // Fast path: open setup if ?setup=1 is present  
    if (params.get('setup') === '1') {
      setCurrentState('setup');
    }

    // Skip eager DB check in production; run in idle/dev or when diagnostics requested
    const shouldCheck = environment.isDevelopment || params.get('diag') === '1';
    if (shouldCheck) {
      const idle = (cb: () => void) => (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 250);
      idle(() => { void checkDatabase(); });
    }
  }, [checkDatabase]);

  // Improved timeout handling for registration with proper cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isRegistering) {
      setRegistrationTimeout(false);
      
      // Set timeout for 15 seconds
      timeoutId = setTimeout(() => {
        setRegistrationTimeout(true);
      }, 15000);
    } else {
      // Clear timeout when registration stops
      setRegistrationTimeout(false);
    }
    
    // Cleanup function - always clear timeout
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isRegistering]);

  // Error boundary effect to catch and handle unexpected errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      // Only set app error for critical errors, not service worker 404s or DB table errors
      if (event.error && 
          !event.error.message?.includes('ServiceWorker') &&
          !event.error.message?.includes('user_id does not exist') &&
          !event.error.message?.includes('relationship between')) {
        setAppError(event.error);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Only set app error for critical rejections, not service worker or DB table issues
      if (event.reason instanceof Error && 
          !event.reason.message?.includes('ServiceWorker') &&
          !event.reason.message?.includes('user_id does not exist') &&
          !event.reason.message?.includes('relationship between')) {
        setAppError(event.reason);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Show a visible warning toast if Supabase env vars are missing in production
  useEffect(() => {
    if (!supabaseEnvDiagnostics.hasEnv && supabaseEnvDiagnostics.isProd) {
      toast.error('Producción está usando claves de fallback. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel → Project Settings → Environment Variables.');
    }
  }, []);

  // Reset app error handler
  const resetAppError = useCallback(() => {
    setAppError(null);
  }, []);

  // State transition handlers with validation
  const handleRoleSelection = useCallback((role: UserRole) => {
    setSelectedRole(role);
    setCurrentState('register');
  }, []);

  const handleBackFromRegister = useCallback(() => {
    setCurrentState('role-selection');
    setSelectedRole(null);
  }, []);

  const handleBackToWelcome = useCallback(() => {
    setCurrentState('welcome');
    setSelectedRole(null);
  }, []);

  // Show error boundary if there's an app error
  if (appError) {
    return <ErrorBoundaryFallback error={appError} resetError={resetAppError} />;
  }

  // Show orphaned user diagnostic if requested
  if (currentState === 'orphaned-diagnostic') {
    return (
      <div>
        <PWABanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
          <OrphanedUserDiagnostic />
        </Suspense>
      </div>
    );
  }

  // Show admin setup screen when admin is orphaned
  if (orphanedUser && !user && !loading && !isRegistering) {
    // If this is the admin email, show admin setup screen
    if (orphanedUser.email === 'trato.app1984@gmail.com') {
      return (
        <div>
          <PWABanner />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <AdminSetup />
          </Suspense>
        </div>
      );
    }
    
    return (
      <div>
        <PWABanner />
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
          {/* Quick Diagnostic Button */}
          <div className="bg-white border-b border-yellow-200 shadow-sm">
            <div className="container mx-auto px-4 py-2">
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentState('orphaned-diagnostic')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Ver Diagnóstico Detallado
                </Button>
              </div>
            </div>
          </div>
          <ProfileRecovery />
        </div>
      </div>
    );
  }

  // Show enhanced registration loading screen with progress
  if (isRegistering) {
    // Check if this is admin being set up
    if (session?.user?.email === 'trato.app1984@gmail.com') {
      return (
        <div>
          <PWABanner />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <AdminSetup />
          </Suspense>
        </div>
      );
    }

    return (
      <div>
        <PWABanner />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-r from-orange-500 to-green-500 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                {registrationProgress === 100 ? (
                  <CheckCircle className="w-8 h-8 text-white" />
                ) : (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {registrationProgress === 100 ? '¡Registro Completado!' : 'Creando tu cuenta...'}
                </h3>
                
                <p className="text-gray-600">
                  {registrationStep || 'Iniciando proceso de registro...'}
                </p>
                
                {/* Progress Bar with actual progress */}
                <div className="space-y-2">
                  <Progress value={Math.max(0, Math.min(100, registrationProgress || 0))} className="h-3" />
                  <p className="text-sm text-gray-500">
                    {Math.max(0, Math.min(100, registrationProgress || 0))}% completado
                  </p>
                </div>

                {/* Show timeout warning if taking too long */}
                {registrationTimeout && registrationProgress < 100 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ El registro está tomando más tiempo del esperado.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline" 
                        size="sm"
                      >
                        Reintentar
                      </Button>
                      <Button 
                        onClick={() => setCurrentState('orphaned-diagnostic')} 
                        variant="outline" 
                        size="sm"
                        className="text-blue-600"
                      >
                        <Stethoscope className="w-3 h-3 mr-1" />
                        Diagnosticar
                      </Button>
                    </div>
                  </div>
                )}

                {registrationProgress === 100 && (
                  <p className="text-sm text-green-600 font-medium">
                    🎉 Redirigiendo a tu dashboard...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PWABanner />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-green-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show database error screen if there's a configuration issue
  if (hasDbError && currentState !== 'diagnostic') {
    return (
      <div>
        <PWABanner />
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-red-200">
            <CardHeader className="text-center">
              <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                <Database className="w-10 h-10 text-red-600" />
              </div>
              <CardTitle className="flex items-center justify-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                Configuración de Base de Datos Requerida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">
                  Error detectado: Tablas de base de datos no encontradas
                </p>
                <p className="text-red-700 text-sm">
                  Tu base de datos Supabase necesita ser configurada antes de usar la aplicación.
                  Esto es normal en la primera instalación.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Solución rápida (5 minutos):</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">1</span>
                    <p>Ve a <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">2</span>
                    <p>Ejecuta el contenido completo de <code className="bg-gray-100 px-1 rounded">/database/fix_setup.sql</code></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">3</span>
                    <p>Desactiva la verificación de email en <strong>Authentication → Settings</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">4</span>
                    <p>Recarga esta página</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setCurrentState('diagnostic')}
                  variant="outline"
                  className="flex-1"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Ver Diagnóstico Detallado
                </Button>
                <Button 
                  onClick={() => {
                    checkDatabase();
                    window.location.reload();
                  }}
                  className="flex-1"
                >
                  Recargar Aplicación
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Si necesitas ayuda, consulta <code className="bg-gray-100 px-1 rounded">FIX_DATABASE_ERROR.md</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Diagnostic screen (explicit query ?diag=1)
  if (currentState === 'diagnostic') {
    return (
      <div>
        <PWABanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
          {/* Diagnostic UI: existing page + low-level probe */}
          <DiagnosticPage />
          <DiagnosticProbe />
        </Suspense>
      </div>
    );
  }

  // Setup screen (explicit query ?setup=1)
  if (currentState === 'setup') {
    return (
      <div>
        <PWABanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
          <SetupPage />
        </Suspense>
      </div>
    );
  }

  

  // If user is authenticated, show the appropriate dashboard
  if (user) {
    // Check if user is admin by email
    if (user.email === 'trato.app1984@gmail.com') {
      return (
        <UserStatusProvider>
          <ChatProvider>
            <PWABanner />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
              <AdminDashboard />
            </Suspense>
            <Toaster />
          </ChatProvider>
        </UserStatusProvider>
      );
    }

    switch (user.role) {
      case 'comprador':
        return (
          <UserStatusProvider>
            <CartProvider>
              <ChatProvider>
                <SoundNotificationWrapper>
                  <PWABanner />
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
                    <BuyerDashboard />
                  </Suspense>
                  <Toaster />
                </SoundNotificationWrapper>
              </ChatProvider>
            </CartProvider>
          </UserStatusProvider>
        );
      case 'vendedor':
        return (
          <UserStatusProvider>
            <ChatProvider>
              <SoundNotificationWrapper>
                <PWABanner />
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
                  <SellerDashboard />
                </Suspense>
                <Toaster />
              </SoundNotificationWrapper>
            </ChatProvider>
          </UserStatusProvider>
        );
      case 'repartidor':
        return (
          <UserStatusProvider>
            <ChatProvider>
              <SoundNotificationWrapper>
                <PWABanner />
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
                  <DriverDashboard />
                </Suspense>
                <Toaster />
              </SoundNotificationWrapper>
            </ChatProvider>
          </UserStatusProvider>
        );
      default:
        return (
          <div>
            <PWABanner />
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-green-50">
              <div className="text-center">
                <p className="text-gray-600 text-lg">Rol de usuario no reconocido</p>
                <Button 
                  onClick={handleBackToWelcome}
                  className="mt-4"
                >
                  Volver al inicio
                </Button>
              </div>
            </div>
            <Toaster />
          </div>
        );
    }
  }

  // Registration flow
  if (currentState === 'role-selection') {
    return (
      <div>
        <PWABanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
          <RoleSelection
            onSelectRole={handleRoleSelection}
            onBack={handleBackToWelcome}
          />
        </Suspense>
        <Toaster />
      </div>
    );
  }

  // Validate that we have selectedRole when in register state
  if (currentState === 'register') {
    if (!selectedRole) {
      // Invalid state - redirect to role selection
      setCurrentState('role-selection');
      return null;
    }
    
    return (
      <div>
        <PWABanner />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
          <RegistrationForm
            role={selectedRole}
            onBack={handleBackFromRegister}
          />
        </Suspense>
        <Toaster />
      </div>
    );
  }

  // Welcome screen with login
  return (
    <div>
      <PWABanner />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
        <WelcomeScreen 
          onRegisterClick={() => setCurrentState('role-selection')}
        />
      </Suspense>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ImageModalProvider>
          {/* Estilos móviles críticos */}
          <style>{`
          /* ESTILOS MÓVILES CRÍTICOS PARA TRATO APP */
          input, textarea, select {
            background-color: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #d1d5db !important;
            font-size: 16px !important;
            padding: 12px !important;
            border-radius: 8px !important;
            min-height: 44px !important;
          }
          
          input:focus, textarea:focus, select:focus {
            background-color: #ffffff !important;
            color: #000000 !important;
            border-color: #f97316 !important;
            outline: none !important;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1) !important;
          }
          
          input::placeholder, textarea::placeholder {
            color: #6b7280 !important;
            opacity: 1 !important;
          }
          
          @media (max-width: 768px) {
            body {
              font-size: 16px !important;
              line-height: 1.5 !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
            h4 { font-size: 16px !important; }
            
            p, span, div {
              font-size: 16px !important;
            }
            
            button {
              min-height: 44px !important;
              font-size: 16px !important;
              padding: 12px 16px !important;
            }
            
            .text-xs { font-size: 14px !important; }
            .text-sm { font-size: 16px !important; }
            .text-base { font-size: 18px !important; }
          }
          
          .mobile-bottom-nav {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            border-top: 2px solid #e5e7eb !important;
            padding: 12px !important;
            z-index: 50 !important;
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          }
          
          .main-content {
            padding-bottom: 80px !important;
          }
          
          /* Estilos específicos para VerificationAlert */
          @media (max-width: 768px) {
            .verification-alert {
              margin: 16px !important;
              padding: 16px !important;
              border-radius: 12px !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
            }
            
            .verification-alert h4 {
              font-size: 18px !important;
              font-weight: 600 !important;
              line-height: 1.3 !important;
              margin-bottom: 8px !important;
            }
            
            .verification-alert .alert-description {
              font-size: 14px !important;
              line-height: 1.4 !important;
              margin-bottom: 12px !important;
            }
            
            .verification-progress {
              margin-top: 12px !important;
            }
            
            .verification-progress-label {
              font-size: 12px !important;
              font-weight: 500 !important;
              margin-bottom: 6px !important;
            }
            
            .verification-progress-bar {
              height: 8px !important;
              border-radius: 4px !important;
              overflow: hidden !important;
            }
            
            .verification-button {
              width: 100% !important;
              min-height: 48px !important;
              font-size: 16px !important;
              font-weight: 600 !important;
              border-radius: 8px !important;
              margin-top: 16px !important;
            }
            
            /* Estilos específicos para Gestión de Productos */
            .products-section {
              padding: 16px !important;
            }
            
            .products-header h2 {
              font-size: 20px !important;
              line-height: 1.2 !important;
              text-align: center !important;
              margin-bottom: 8px !important;
            }
            
            .products-header p {
              font-size: 14px !important;
              text-align: center !important;
              margin-bottom: 16px !important;
            }
            
            .products-tabs [role="tablist"] {
              height: auto !important;
              padding: 4px !important;
            }
            
            .products-tabs [role="tab"] {
              min-height: 44px !important;
              font-size: 14px !important;
              padding: 8px 4px !important;
              white-space: nowrap !important;
            }
            
            .products-grid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
              padding: 0 8px !important;
            }
            
            /* Estilos específicos para Gestión de Pedidos */
            .orders-section {
              padding: 16px !important;
            }
            
            .orders-header h2 {
              font-size: 20px !important;
              line-height: 1.2 !important;
              text-align: center !important;
              margin-bottom: 8px !important;
            }
            
            .orders-header p {
              font-size: 14px !important;
              text-align: center !important;
              margin-bottom: 16px !important;
            }
            
            .orders-filters select {
              min-height: 44px !important;
              font-size: 14px !important;
              background-color: white !important;
              border: 2px solid #d1d5db !important;
            }
            
            .order-card {
              margin-bottom: 16px !important;
              border-radius: 12px !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
            }
            
            .order-card h3 {
              font-size: 16px !important;
              line-height: 1.3 !important;
            }
            
            .order-card .customer-info {
              background-color: #f9fafb !important;
              border: 1px solid #e5e7eb !important;
              border-radius: 8px !important;
              padding: 12px !important;
            }
            
            .order-actions button {
              min-height: 40px !important;
              font-size: 12px !important;
              font-weight: 600 !important;
              width: 100% !important;
              margin-bottom: 8px !important;
            }
            
            /* Estilos específicos para Perfil del Vendedor */
            .seller-profile {
              padding: 16px !important;
            }
            
            .seller-profile h2,
            .seller-profile h3 {
              font-size: 20px !important;
              line-height: 1.2 !important;
              text-align: center !important;
              margin-bottom: 16px !important;
              color: #1f2937 !important;
              font-weight: 700 !important;
            }
            
            .seller-profile .form-group {
              margin-bottom: 16px !important;
            }
            
            .seller-profile label {
              font-size: 14px !important;
              font-weight: 600 !important;
              color: #374151 !important;
              margin-bottom: 8px !important;
              display: block !important;
              line-height: 1.3 !important;
            }
            
            .seller-profile input,
            .seller-profile textarea,
            .seller-profile select {
              font-size: 16px !important;
              padding: 12px !important;
              border-radius: 8px !important;
              width: 100% !important;
              min-height: 48px !important;
              line-height: 1.4 !important;
              border: 2px solid #d1d5db !important;
            }
            
            .seller-profile button {
              font-size: 14px !important;
              padding: 12px 16px !important;
              border-radius: 8px !important;
              min-height: 48px !important;
              font-weight: 600 !important;
              width: 100% !important;
              margin-top: 12px !important;
            }
            
            .seller-profile .upload-section {
              text-align: center !important;
              padding: 20px !important;
              border: 2px dashed #d1d5db !important;
              border-radius: 12px !important;
              background: #f9fafb !important;
              margin: 16px 0 !important;
            }
            
            .seller-profile .image-preview {
              max-width: 100% !important;
              max-height: 250px !important;
              border-radius: 8px !important;
              margin: 12px auto !important;
              display: block !important;
            }
            
            .seller-profile .error-message {
              font-size: 13px !important;
              color: #dc2626 !important;
              background: #fef2f2 !important;
              padding: 10px 12px !important;
              border-radius: 8px !important;
              border: 1px solid #fecaca !important;
              margin-top: 8px !important;
              line-height: 1.4 !important;
            }
            
            .seller-profile .success-message {
              font-size: 13px !important;
              color: #059669 !important;
              background: #f0fdf4 !important;
              padding: 10px 12px !important;
              border-radius: 8px !important;
              border: 1px solid #bbf7d0 !important;
              margin-top: 8px !important;
              line-height: 1.4 !important;
            }
            
            /* GPS Verification Mobile Styles */
            .gps-verification-card {
              padding: 16px !important;
              margin: 16px 0 !important;
              border-radius: 12px !important;
            }
            
            .gps-verification-card h4 {
              font-size: 18px !important;
              margin-bottom: 12px !important;
              text-align: center !important;
              font-weight: 700 !important;
              line-height: 1.3 !important;
            }
            
            .gps-verification-card p {
              font-size: 13px !important;
              line-height: 1.4 !important;
              margin-bottom: 8px !important;
              text-align: center !important;
            }
            
            .gps-verification-card button {
              font-size: 14px !important;
              padding: 12px 16px !important;
              min-height: 48px !important;
              font-weight: 700 !important;
              border-radius: 8px !important;
              width: 100% !important;
            }
            
            .gps-verification-card .feature-list {
              text-align: left !important;
              margin-top: 16px !important;
            }
            
            .gps-verification-card .feature-list p {
              font-size: 12px !important;
              margin-bottom: 6px !important;
              text-align: left !important;
              line-height: 1.3 !important;
            }
          }
        `}</style>
        <PWAMetaTags />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-green-50"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div><p className="text-gray-600">Cargando…</p></div></div>}>
          <AppContent />
        </Suspense>
      </ImageModalProvider>
    </AuthProvider>
  </Router>
  );
}