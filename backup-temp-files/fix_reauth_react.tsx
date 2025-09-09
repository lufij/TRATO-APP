// MEJORA DE REACT PARA PREVENIR BUCLES INFINITOS EN RE-AUTENTICACIÓN
// ARCHIVO: contexts/AuthContext.tsx (REEMPLAZAR LÍNEAS 800-870)

// Agregar estas variables de control al inicio del archivo
const AUTH_RETRY_LIMIT = 3;
const AUTH_COOLDOWN_TIME = 5000; // 5 segundos

// Agregar estos refs después de los refs existentes
const authRetryCountRef = React.useRef(0);
const lastAuthAttemptRef = React.useRef(0);
const authCooldownTimerRef = React.useRef<NodeJS.Timeout | null>(null);

// REEMPLAZAR el useEffect de autenticación con esta versión mejorada:
useEffect(() => {
  // Si no hay configuración válida de Supabase, no intentar autenticación
  if (!supabaseEnvDiagnostics.hasEnv) {
    console.warn('Configuración de Supabase no válida, saltando autenticación');
    setLoading(false);
    setUser(null);
    setSession(null);
    setOrphanedUser(null);
    return;
  }

  if (MISCONFIGURED) {
    console.log('Supabase está mal configurado, saltando inicialización');
    setLoading(false);
    return;
  }

  console.log('Iniciando efecto de autenticación');
  
  // Función para manejar cambios de autenticación con protección contra bucles
  const handleAuthChange = async (event: string, session: Session | null) => {
    const now = Date.now();
    
    // Verificar cooldown
    if (now - lastAuthAttemptRef.current < AUTH_COOLDOWN_TIME) {
      console.log('En período de cooldown, ignorando cambio de autenticación');
      return;
    }
    
    // Verificar límite de reintentos
    if (authRetryCountRef.current >= AUTH_RETRY_LIMIT) {
      console.log('Límite de reintentos alcanzado, pausando autenticación');
      pushAuthLog('Límite de reintentos alcanzado, pausando...');
      
      // Resetear después del cooldown
      if (authCooldownTimerRef.current) {
        clearTimeout(authCooldownTimerRef.current);
      }
      authCooldownTimerRef.current = setTimeout(() => {
        authRetryCountRef.current = 0;
        console.log('Cooldown terminado, reintentos reseteados');
      }, AUTH_COOLDOWN_TIME * 2);
      
      setLoading(false);
      return;
    }

    console.log('Cambio de autenticación:', event, session?.user?.id);
    pushAuthLog(`Cambio de autenticación: ${event} (intento ${authRetryCountRef.current + 1})`);
    
    lastAuthAttemptRef.current = now;
    authRetryCountRef.current++;

    // Actualizar estado de sesión
    setSession(session);

    // Limpiar estado en cierre de sesión
    if (event === 'SIGNED_OUT') {
      console.log('Usuario cerró sesión');
      setUser(null);
      setOrphanedUser(null);
      lastUserIdRef.current = null;
      setLoading(false);
      authRetryCountRef.current = 0; // Resetear contador en logout
      return;
    }

    // Si no hay usuario en la sesión, no hacer nada más
    if (!session?.user) {
      console.log('No hay usuario en la sesión');
      setLoading(false);
      return;
    }

    const currentUser = session.user;
    
    // Prevenir procesamiento duplicado del mismo usuario
    if (lastUserIdRef.current === currentUser.id && user) {
      console.log('Usuario ya procesado, saltando');
      setLoading(false);
      authRetryCountRef.current--; // No contar como intento fallido
      return;
    }

    lastUserIdRef.current = currentUser.id;

    try {
      // Solo fetch profile si es un sign in exitoso
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('Obteniendo perfil para usuario autenticado');
        await fetchUserProfile(currentUser);
        authRetryCountRef.current = 0; // Resetear en éxito
      }
    } catch (error) {
      console.error('Error en handleAuthChange:', error);
      pushAuthLog(`Error en cambio de autenticación: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Obtener sesión inicial con protección contra bucles
  const getInitialSession = async () => {
    try {
      console.log('Obteniendo sesión inicial...');
      setLoading(true);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error obteniendo sesión inicial:', error);
        pushAuthLog(`Error en sesión inicial: ${error.message}`);
        setLoading(false);
        return;
      }

      console.log('Sesión inicial obtenida:', session?.user?.id || 'sin sesión');
      
      if (session?.user) {
        await handleAuthChange('SIGNED_IN', session);
      } else {
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error inesperado obteniendo sesión inicial:', error);
      pushAuthLog(`Error inesperado en sesión inicial: ${error}`);
      setLoading(false);
    }
  };

  // Inicializar sesión
  getInitialSession();

  // Configurar listener de cambios de autenticación
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // Debounce para evitar llamadas múltiples rápidas
    setTimeout(() => {
      handleAuthChange(event, session);
    }, 100);
  });

  // Cleanup
  return () => {
    if (authCooldownTimerRef.current) {
      clearTimeout(authCooldownTimerRef.current);
    }
    subscription.unsubscribe();
  };
}, []);

// AGREGAR ESTA FUNCIÓN PARA RESETEAR MANUALMENTE LOS CONTADORES:
const resetAuthRetries = () => {
  authRetryCountRef.current = 0;
  lastAuthAttemptRef.current = 0;
  if (authCooldownTimerRef.current) {
    clearTimeout(authCooldownTimerRef.current);
    authCooldownTimerRef.current = null;
  }
  console.log('Contadores de autenticación reseteados manualmente');
  pushAuthLog('Contadores de autenticación reseteados');
};

// AGREGAR resetAuthRetries AL VALUE DEL CONTEXT PROVIDER:
const value = {
  user,
  session,
  loading,
  signUp,
  signIn,
  signOut,
  updateProfile,
  orphanedUser,
  createMissingProfile,
  isRegistering,
  registrationProgress,
  registrationStep,
  authLogs,
  resetAuthRetries // NUEVA FUNCIÓN
};
