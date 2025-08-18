import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ChatProvider } from './contexts/ChatContext';
import { UserStatusProvider } from './components/UserStatusIndicator';
import { WelcomeScreen } from './components/WelcomeScreen';
import { RoleSelection } from './components/RoleSelection';
import { RegistrationForm } from './components/RegistrationForm';
import { ProfileRecovery } from './components/ProfileRecovery';
import { OrphanedUserDiagnostic } from './components/OrphanedUserDiagnostic';
import { BuyerDashboard } from './components/BuyerDashboard';
import { SellerDashboard } from './components/SellerDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { DiagnosticPage } from './components/DiagnosticPage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSetup } from './components/AdminSetup';
import { UserRole } from './utils/supabase/client';
import { supabaseEnvDiagnostics } from './utils/supabase/config';
import { supabase } from './utils/supabase/client';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { AlertCircle, Database, Loader2, CheckCircle, Stethoscope, Download, RefreshCw } from 'lucide-react';
import { useServiceWorker } from './hooks/useServiceWorker';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

type AppState = 'welcome' | 'role-selection' | 'register' | 'diagnostic' | 'orphaned-diagnostic';

// PWA Meta Tags Component
function PWAMetaTags() {
  useEffect(() => {
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

    const links = [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'apple-touch-icon', href: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 180 180\'%3E%3Crect width=\'180\' height=\'180\' fill=\'%23f97316\'/%3E%3Ctext x=\'90\' y=\'110\' font-family=\'Arial, sans-serif\' font-size=\'36\' font-weight=\'bold\' text-anchor=\'middle\' fill=\'white\'%3ETRATO%3C/text%3E%3C/svg%3E' }
    ];

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
  const { canInstall, showInstallPrompt, updateAvailable, update, isOnline } = useServiceWorker();

  if (updateAvailable) {
    return (
      <div className="bg-orange-500 text-white p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm font-medium">Nueva actualización disponible</span>
          <Button
            onClick={update}
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

  if (canInstall) {
    return (
      <div className="bg-green-500 text-white p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Download className="h-4 w-4" />
          <span className="text-sm font-medium">Instala TRATO en tu dispositivo</span>
          <Button
            onClick={showInstallPrompt}
            size="sm"
            variant="secondary"
            className="ml-2 bg-white text-green-500 hover:bg-gray-100"
          >
            Instalar
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

  return null;
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

    checkDatabase();
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
      toast.error('Configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel. Usando fallback del repo.');
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
        <OrphanedUserDiagnostic />
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
          <AdminSetup />
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
          <AdminSetup />
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

  // Show diagnostic page
  if (currentState === 'diagnostic') {
    return (
      <div>
        <PWABanner />
        <DiagnosticPage />
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
            <AdminDashboard />
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
                <PWABanner />
                <BuyerDashboard />
                <Toaster />
              </ChatProvider>
            </CartProvider>
          </UserStatusProvider>
        );
      case 'vendedor':
        return (
          <UserStatusProvider>
            <ChatProvider>
              <PWABanner />
              <SellerDashboard />
              <Toaster />
            </ChatProvider>
          </UserStatusProvider>
        );
      case 'repartidor':
        return (
          <UserStatusProvider>
            <ChatProvider>
              <PWABanner />
              <DriverDashboard />
              <Toaster />
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
        <RoleSelection
          onSelectRole={handleRoleSelection}
          onBack={handleBackToWelcome}
        />
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
        <RegistrationForm
          role={selectedRole}
          onBack={handleBackFromRegister}
        />
        <Toaster />
      </div>
    );
  }

  // Welcome screen with login
  return (
    <div>
      <PWABanner />
      <WelcomeScreen 
        onRegisterClick={() => setCurrentState('role-selection')}
      />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PWAMetaTags />
      <AppContent />
    </AuthProvider>
  );
}