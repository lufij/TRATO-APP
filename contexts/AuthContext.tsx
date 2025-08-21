import React, { createContext, useContext, useEffect, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MISCONFIGURED = (window as any).__SUPABASE_MISCONFIGURED__ === true;
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, User, UserRole, Seller, Driver } from '../utils/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isRegistering: boolean;
  registrationProgress: number;
  registrationStep: string;
  orphanedUser: SupabaseUser | null; // User authenticated but no profile
  authLogs: string[];
  signUp: (email: string, password: string, userData: {
    name: string;
    role: UserRole;
    phone?: string;
    businessName?: string;
    businessDescription?: string;
    vehicleType?: string;
    licenseNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  createMissingProfile: (userData: {
    name: string;
    role: UserRole;
    phone?: string;
    businessName?: string;
    businessDescription?: string;
    vehicleType?: string;
    licenseNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [registrationStep, setRegistrationStep] = useState('');
  const [orphanedUser, setOrphanedUser] = useState<SupabaseUser | null>(null);
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  // Single-flight guard para signIn para evitar múltiples llamadas concurrentes
  const signInPromiseRef = React.useRef<Promise<{ success: boolean; error?: string }> | null>(null);
  // Control para ignorar resultados obsoletos al cargar el perfil
  const profileReqIdRef = React.useRef(0);
  const lastUserIdRef = React.useRef<string | null>(null);
  // Ref para leer el estado actual de isRegistering dentro de timeouts
  const isRegisteringRef = React.useRef<boolean>(isRegistering);

  const pushAuthLog = (msg: string) => {
    const line = `${new Date().toISOString()} - ${msg}`;
    // console + state
    // eslint-disable-next-line no-console
    console.log('[AuthLog]', line);
    setAuthLogs((s) => [...s.slice(-50), line]); // keep last 50
    // also expose to window for quick inspection in prod
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyW: any = window;
      anyW.__TRATO_AUTH_LOGS__ = anyW.__TRATO_AUTH_LOGS__ || [];
      anyW.__TRATO_AUTH_LOGS__.push(line);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    isRegisteringRef.current = isRegistering;
  }, [isRegistering]);

  // Intenta materializar el perfil en la tabla users en segundo plano
  const ensureProfileExists = async (sbUser: SupabaseUser) => {
    try {
      const minimalProfile: Partial<User> = {
        id: sbUser.id,
        email: sbUser.email || '',
        name: (sbUser.user_metadata as any)?.name || (sbUser.email || 'Usuario').split('@')[0],
        role: (sbUser.user_metadata as any)?.role || 'comprador',
      } as Partial<User>;
      const { error } = await supabase
        .from('users')
        // Upsert para crear si falta; ignorar duplicados por carreras
        .upsert([minimalProfile], { onConflict: 'id', ignoreDuplicates: true } as any);
      if (error) {
        const dup = (error as any)?.code === '23505' || /duplicate key/i.test((error as any)?.message || '');
        if (!dup) console.warn('ensureProfileExists: upsert error (non-fatal):', error);
      }
    } catch (e) {
      console.warn('ensureProfileExists: exception (non-fatal):', e);
    }
  };

  useEffect(() => {
    // If Supabase env is misconfigured in prod, continue anyway using fallback config.
    // We'll still show a toast elsewhere (App.tsx) but we won't block auth here.
    let isMounted = true;

    // Get initial session with error handling
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        const session = data?.session ?? null;
        setSession(session);
        if (session?.user) {
          // Kick off profile fetch but don't block the UI; we'll show skeletons
          fetchUserProfile(session.user);
          // Optimistic: allow UI to render while profile resolves
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al obtener la sesión inicial:', err);
        if (isMounted) setLoading(false);
      }
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (!isMounted) return;
      setSession(session ?? null);
      
        if (session?.user) {
        // Evitar procesar eventos duplicados para el mismo usuario en ráfaga
          pushAuthLog(`Auth state change: ${event} for ${session.user.email}`);
        if (lastUserIdRef.current === session.user.id && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
          return;
        }
        lastUserIdRef.current = session.user.id;
        // If we're not currently registering, fetch the profile immediately
          if (!isRegistering) {
            // ensure UI does not stay in loading state while profile fetches
            setLoading(false);
            await fetchUserProfile(session.user);
          }
      } else {
        setUser(null);
        setOrphanedUser(null);
        setLoading(false);
        setIsRegistering(false);
        setRegistrationProgress(0);
        setRegistrationStep('');
      }
    });

    // Safety timeout to avoid infinite loading
    const safety = setTimeout(() => {
      if (isMounted) setLoading((prev) => (prev ? false : prev));
    }, 7000);

    return () => {
      isMounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [isRegistering]);

  const fetchUserProfile = async (supabaseUser: SupabaseUser, retryCount = 0) => {
  try {
      // Incrementar id de solicitud y capturar el actual para ignorar resultados tardíos
      const reqId = ++profileReqIdRef.current;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

  if (error) {
        if (error.code === 'PGRST116') {
          // User doesn't exist in our users table
          if (isRegistering && retryCount < 2) {
            // During registration, retry a few times with shorter delay
            console.log(`User profile not found during registration, retrying in 800ms... (attempt ${retryCount + 1}/2)`);
            setRegistrationStep('Sincronizando datos...');
            setTimeout(() => fetchUserProfile(supabaseUser, retryCount + 1), 800);
            return;
          } else if (isRegistering && retryCount >= 2) {
            // Final fallback during registration: ensure a minimal profile exists so the app can proceed
            try {
              const guessedName = (supabaseUser.email || 'Usuario').split('@')[0];
              const minimalProfile: Partial<User> = {
                id: supabaseUser.id,
                email: supabaseUser.email || '',
                name: guessedName,
                role: 'comprador',
              } as Partial<User>;
              console.log('Final fallback: auto-creating minimal user profile after registration retries:', minimalProfile);
              const { error: createErr } = await supabase
                .from('users')
                .insert([minimalProfile]);
              if (createErr) {
                // Tolerar duplicados por carrera (23505 o "duplicate key") y reintentar fetch
                const dup = (createErr as any)?.code === '23505' || /duplicate key/i.test((createErr as any)?.message || '');
                if (!dup) {
                  console.warn('Final fallback auto-create profile failed:', createErr);
                  // Marcar como huérfano para guiar recuperación
                  setOrphanedUser(supabaseUser);
                  setUser(null);
                  setIsRegistering(false);
                  setRegistrationStep('No se pudo sincronizar el perfil. Usa la recuperación.');
                  return;
                }
              }
              // En éxito o duplicado, reintentar obtener el perfil
              setTimeout(() => fetchUserProfile(supabaseUser, retryCount + 1), 500);
              return;
            } catch (autoErr) {
              console.warn('Final fallback auto-create profile threw:', autoErr);
              setOrphanedUser(supabaseUser);
              setUser(null);
              setIsRegistering(false);
              setRegistrationStep('No se pudo sincronizar el perfil. Usa la recuperación.');
              return;
            }
          } else if (!isRegistering) {
            // Check if this is the admin user
            if (supabaseUser.email === 'trato.app1984@gmail.com') {
              console.log('Admin user detected as orphaned, creating admin profile automatically...');
              await createAdminProfile(supabaseUser);
              return;
            } else {
              // Try to auto-create a minimal profile for first sign-in to avoid blocking login
              if (retryCount < 1) {
                try {
                  const guessedName = (supabaseUser.email || 'Usuario').split('@')[0];
                  const minimalProfile: Partial<User> = {
                    id: supabaseUser.id,
                    email: supabaseUser.email || '',
                    name: guessedName,
                    role: 'comprador',
                  } as Partial<User>;
                  console.log('Auto-creating minimal user profile for first sign-in:', minimalProfile);
                  const { error: createErr } = await supabase
                    .from('users')
                    .insert([minimalProfile]);
                  if (createErr) {
                    const dup = (createErr as any)?.code === '23505' || /duplicate key/i.test((createErr as any)?.message || '');
                    if (!dup) {
                      console.warn('Auto-create profile failed:', createErr);
                      // Fallback a flujo de huérfano
                      setOrphanedUser(supabaseUser);
                      setUser(null);
                    } else {
                      console.warn('Auto-create profile duplicate detected; retrying fetch');
                    }
                  }
                  // En éxito o duplicado, reintentar obtener el perfil
                  setTimeout(() => fetchUserProfile(supabaseUser, retryCount + 1), 500);
                  return;
                } catch (autoErr) {
                  console.warn('Auto-create profile threw:', autoErr);
                  setOrphanedUser(supabaseUser);
                  setUser(null);
                }
              } else {
                // Not during registration - this is an orphaned user
                console.warn('User authenticated but profile not found in users table - orphaned user detected');
                setOrphanedUser(supabaseUser);
                setUser(null);
              }
            }
          }
  } else if (
          error.code === '42501' || // insufficient_privilege
          error.code === 'PGRST403' || // forbidden
          error.code === 'PGRST401' || // unauthorized
          (error.message && (
            error.message.toLowerCase().includes('permission denied') ||
            error.message.toLowerCase().includes('rls') ||
            error.message.toLowerCase().includes('forbidden')
          ))
        ) {
          pushAuthLog(`RLS/permission error reading users: ${error.code} ${error.message}`);
          console.warn('RLS/permisos impiden leer perfil en users; continuando con un perfil temporal.');
          // Construir un usuario temporal desde el token para no bloquear el login
          const tempUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: (supabaseUser.user_metadata as any)?.name || (supabaseUser.email || 'Usuario').split('@')[0],
            role: (supabaseUser.user_metadata as any)?.role || 'comprador',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User;
          setUser(tempUser);
          setOrphanedUser(null);
          setIsRegistering(false);
          setRegistrationProgress(100);
          setRegistrationStep('¡Completado!');
          // Intentar materializar el perfil real en segundo plano
          void ensureProfileExists(supabaseUser);
          // ensure loading cleared so UI proceeds
          setLoading(false);
        } else if (error.code === 'PGRST205') {
          // Table doesn't exist
          console.error('Users table does not exist. Please run the database setup.');
          pushAuthLog('Users table missing (PGRST205)');
          setUser(null);
        } else {
          console.error('Error fetching user profile:', error);
          if (isRegistering) {
            // Fallback suave: construir un perfil temporal y completar el registro
            const tempUser: User = {
              id: supabaseUser.id,
              email: supabaseUser.email || '',
              name: (supabaseUser.user_metadata as any)?.name || (supabaseUser.email || 'Usuario').split('@')[0],
              role: (supabaseUser.user_metadata as any)?.role || 'comprador',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User;
            pushAuthLog(`Unexpected error fetching profile during register: ${(error as any)?.message}`);
            console.warn('Using temporary profile after unexpected error to avoid blocking registration');
            setUser(tempUser);
            setOrphanedUser(null);
            setIsRegistering(false);
            setRegistrationProgress(100);
            setRegistrationStep('¡Completado!');
            // Intentar materializar el perfil real en segundo plano
            void ensureProfileExists(supabaseUser);
          } else {
            setUser(null);
          }
        }
      } else if (data) {
        // Ignorar si llegó una respuesta obsoleta
        if (reqId === profileReqIdRef.current) {
          console.log('User profile loaded:', data.email, data.role);
          setUser(data);
          setOrphanedUser(null); // Clear orphaned state
          setIsRegistering(false); // Clear registering state when profile is found
          setRegistrationProgress(100);
          setRegistrationStep('¡Completado!');
        } else {
          console.log('Ignored stale profile response');
        }
      } else {
        setUser(null);
      }
  } catch (error) {
  pushAuthLog(`Exception fetching user profile: ${(error as any)?.message}`);
  console.error('Unexpected error fetching user profile:', error);
      if (isRegistering) {
        const tempUser: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: (supabaseUser.user_metadata as any)?.name || (supabaseUser.email || 'Usuario').split('@')[0],
          role: (supabaseUser.user_metadata as any)?.role || 'comprador',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User;
  console.warn('Using temporary profile after exception to avoid blocking registration');
        setUser(tempUser);
        setOrphanedUser(null);
        setIsRegistering(false);
        setRegistrationProgress(100);
        setRegistrationStep('¡Completado!');
  // Intentar materializar el perfil real en segundo plano
  void ensureProfileExists(supabaseUser);
      } else {
        setUser(null);
      }
    } finally {
      // Asegurar que el loading no quede activo indefinidamente
      if (!isRegistering || retryCount >= 2) setLoading(false);
    }
  };

  const createAdminProfile = async (supabaseUser: SupabaseUser) => {
    try {
      setLoading(true);
      setIsRegistering(true);
      setRegistrationProgress(20);
      setRegistrationStep('Configurando perfil de administrador...');

      // Create admin user profile
      const adminProfile: Partial<User> = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: 'Administrador TRATO',
        role: 'comprador', // Use a default role for admin
        phone: '+502 0000-0000',
      };

      console.log('Creating admin profile:', adminProfile);
  pushAuthLog('Creating admin profile');
      setRegistrationProgress(70);

      const { error: profileError } = await supabase
        .from('users')
        .insert([adminProfile]);

      if (profileError) {
        console.error('Admin profile creation error:', profileError);
  pushAuthLog(`Admin profile creation error: ${(profileError as any)?.message}`);
  setIsRegistering(false);
  setLoading(false);
        return;
      }

      console.log('Admin profile created successfully');
      setRegistrationProgress(95);
      setRegistrationStep('Cargando panel de administración...');

      // Fetch the newly created profile
      await fetchUserProfile(supabaseUser);
  setLoading(false);
      
      setRegistrationProgress(100);
      setRegistrationStep('¡Acceso administrativo configurado!');

    } catch (error: any) {
      console.error('Unexpected error creating admin profile:', error);
      setIsRegistering(false);
      setLoading(false);
    }
  };

  const createMissingProfile = async (userData: {
    name: string;
    role: UserRole;
    phone?: string;
    businessName?: string;
    businessDescription?: string;
    vehicleType?: string;
    licenseNumber?: string;
  }) => {
    if (!orphanedUser) {
      return { success: false, error: 'No orphaned user found' };
    }

    try {
      setLoading(true);
      setIsRegistering(true);
      setRegistrationProgress(20);
      setRegistrationStep('Creando perfil faltante...');

      // Create user profile in our users table
      const userProfile: Partial<User> = {
        id: orphanedUser.id,
        email: orphanedUser.email!,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating missing user profile:', userProfile);
      setRegistrationProgress(50);

      const { error: profileError } = await supabase
        .from('users')
        .insert([userProfile]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { success: false, error: `Error creating profile: ${profileError.message}` };
      }

      console.log('User profile created successfully');
      setRegistrationProgress(70);
      setRegistrationStep('Configurando datos específicos...');

      // Create seller profile if needed
      if (userData.role === 'vendedor' && userData.businessName) {
        console.log('Creating seller profile...');
        setRegistrationStep('Configurando perfil de vendedor...');

        const sellerProfile = {
          id: orphanedUser.id,
          business_name: userData.businessName,
          description: userData.businessDescription || null,
          is_active: true,
          is_accepting_orders: true,
          rating: 5.0,
          total_ratings: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: orphanedUser.id
        };

        const { error: sellerError } = await supabase
          .from('sellers')
          .insert([sellerProfile]);

        if (sellerError) {
          console.error('Seller profile creation error:', sellerError);
          // Don't fail completely, but log error and notify user
          const isForeignKeyError = sellerError.message?.includes('foreign key');
          if (isForeignKeyError) {
            return { 
              success: false, 
              error: 'Error de integridad al crear perfil de vendedor. Por favor, intenta de nuevo.' 
            };
          }
        }
      }

      // Create driver profile if needed
      if (userData.role === 'repartidor' && userData.vehicleType) {
        console.log('Creating driver profile...');
        setRegistrationStep('Configurando perfil de repartidor...');

        const driverProfile = {
          id: orphanedUser.id,
          vehicle_type: userData.vehicleType,
          license_number: userData.licenseNumber || 'TEMP-' + Date.now(),
          is_active: false,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating driver profile:', driverProfile);

        const { error: driverError } = await supabase
          .from('drivers')
          .insert([driverProfile]);

        if (driverError) {
          console.error('Driver profile error:', driverError);
          // Check for foreign key violation
          const isForeignKeyError = driverError.message?.includes('foreign key');
          if (isForeignKeyError) {
            return { 
              success: false, 
              error: 'Error de integridad al crear perfil de repartidor. Por favor, intenta de nuevo.' 
            };
          }
          // Other errors will be logged but won't block completion
        }
      }

      setRegistrationProgress(95);
      setRegistrationStep('Cargando perfil...');

      // Fetch the newly created profile
      await fetchUserProfile(orphanedUser);
      
      setRegistrationProgress(100);
      setRegistrationStep('¡Perfil recuperado!');
      
      return { success: true };

    } catch (error: any) {
      console.error('Unexpected error creating missing profile:', error);
      return { success: false, error: 'Error inesperado al crear el perfil' };
    } finally {
      setIsRegistering(false);
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData: {
      name: string;
      role: UserRole;
      phone?: string;
      businessName?: string;
      businessDescription?: string;
      vehicleType?: string;
      licenseNumber?: string;
    }
  ) => {
    try {
      setLoading(true);
      setIsRegistering(true);
      setRegistrationProgress(10);
      setRegistrationStep('Creando cuenta de usuario...');
      
      console.log('Starting signup process for:', email, userData.role);

      // Si ya hay una sesión activa, saltar signUp y continuar con el perfil
      if (session?.user) {
        console.log('Session already present; skipping signUp and fetching profile');
        setRegistrationProgress(30);
        setRegistrationStep('Cargando perfil existente...');
        // Lanzar fetch sin bloquear
        void fetchUserProfile(session.user);
        // Watchdog: si en ~4s seguimos registrando (p.ej. RLS/latencia), completar con perfil temporal
        const existing = session.user;
        setTimeout(() => {
          if (isRegisteringRef.current) {
            const tempUser: User = {
              id: existing.id,
              email: existing.email || '',
              name: (existing.user_metadata as any)?.name || (existing.email || 'Usuario').split('@')[0],
              role: (existing.user_metadata as any)?.role || 'comprador',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User;
            console.warn('Watchdog(session-present): completing registration with temporary profile');
            setUser(tempUser);
            setOrphanedUser(null);
            setIsRegistering(false);
            setRegistrationProgress(100);
            setRegistrationStep('¡Completado!');
            // Materializar el perfil real en background
            void ensureProfileExists(existing);
          }
        }, 4000);
        return { success: true };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          // Store basic metadata to improve fallbacks before profile exists
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone ?? null,
          },
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        // Manejar cuenta ya registrada (422) intentando iniciar sesión
        // @supabase/supabase-js expone AuthApiError con status
        const anyErr: any = authError as any;
        const already = (anyErr?.status === 422) || /already registered/i.test(anyErr?.message || '');
        if (already) {
          console.warn('Email ya registrado; intentando iniciar sesión automáticamente');
          setRegistrationStep('Cuenta ya existe. Iniciando sesión...');
          const res = await signIn(email, password);
          return res;
        }
        setIsRegistering(false);
        setRegistrationProgress(0);
        setRegistrationStep('');
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        setIsRegistering(false);
        setRegistrationProgress(0);
        setRegistrationStep('');
        return { success: false, error: 'Failed to create user' };
      }

      console.log('Auth user created:', authData.user.id);
      setRegistrationProgress(30);
      setRegistrationStep('Configurando perfil...');

      // Wait a shorter time for the auth user to be fully created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create user profile in our users table
      const userProfile: Partial<User> = {
        id: authData.user.id,
        email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
      };

      console.log('Creating user profile:', userProfile);
      setRegistrationProgress(50);

      // No bloquear el flujo por una inserción lenta: intentar insert con timeout corto
      let profileError: any = null;
      try {
        const insertPromise = supabase.from('users').insert([userProfile]);
        const timeoutMs = 2000; // 2s máximo para no colgar UX
        await Promise.race([
          insertPromise.then(({ error }) => { profileError = error; }),
          new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
      } catch (e) {
        // Ignorar excepciones de red transitorias, continuamos y el fetch se encargará
        profileError = e;
      }

      if (profileError) {
        const code = (profileError as any)?.code;
        const msg = (profileError as any)?.message || '';
        const isDuplicate = code === '23505' || /duplicate key/i.test(msg);
        if (isDuplicate) {
          console.warn('Profile already exists (or created concurrently), continuing signup flow');
        } else {
          console.warn('Profile insert not confirmed (will rely on fetch fallback):', profileError);
          // Continuar sin abortar: fetchUserProfile manejará crear/leer el perfil
        }
      }

      console.log('User profile created successfully');
      setRegistrationProgress(70);
      setRegistrationStep('Configurando datos específicos...');

      // Create role-specific profile
      if (userData.role === 'vendedor') {
        const sellerProfile: Partial<Seller> = {
          id: authData.user.id,
          business_name: userData.businessName || 'Mi Negocio',
          business_description: userData.businessDescription,
          is_verified: false,
        };

        console.log('Creating seller profile:', sellerProfile);

        const { error: sellerError } = await supabase
          .from('sellers')
          .insert([sellerProfile]);

        if (sellerError) {
          console.error('Seller profile error:', sellerError);
          // Don't fail the entire signup for this
        } else {
          console.log('Seller profile created successfully');
        }
      } else if (userData.role === 'repartidor') {
        const driverProfile: Partial<Driver> = {
          id: authData.user.id,
          vehicle_type: userData.vehicleType || 'Moto',
          license_number: userData.licenseNumber || '000000',
          is_active: false,
          is_verified: false,
        };

        console.log('Creating driver profile:', driverProfile);

        const { error: driverError } = await supabase
          .from('drivers')
          .insert([driverProfile]);

        if (driverError) {
          console.error('Driver profile error:', driverError);
          // Don't fail the entire signup for this
        } else {
          console.log('Driver profile created successfully');
        }
      }

      setRegistrationProgress(85);
      setRegistrationStep('Finalizando configuración...');

      // Evitar depender de getSession/signIn: usar el usuario retornado por signUp
      const currentUser = authData.user;
      if (currentUser) {
        console.log('Proceeding with user from signUp, fetching profile...');
        setRegistrationProgress(95);
        setRegistrationStep('Cargando dashboard...');
        // Lanzar fetch sin bloquear y aplicar watchdog para evitar quedarnos en 95%
        void fetchUserProfile(currentUser);
    setTimeout(async () => {
          if (isRegisteringRef.current) {
            // Cierre suave: perfil temporal desde metadata del token
            const tempUser: User = {
              id: currentUser.id,
              email: currentUser.email || '',
              name: (currentUser.user_metadata as any)?.name || (currentUser.email || 'Usuario').split('@')[0],
              role: (currentUser.user_metadata as any)?.role || 'comprador',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User;
            console.warn('Watchdog: completing registration with temporary profile');
            setUser(tempUser);
            setOrphanedUser(null);
            setIsRegistering(false);
            setRegistrationProgress(100);
            setRegistrationStep('¡Completado!');
      // Materializar el perfil real en background
      void ensureProfileExists(currentUser);
          }
        }, 4000);
        return { success: true };
      }

      // Fallback extremo: intentar obtener el usuario actual y continuar
      const { data: getUserData } = await supabase.auth.getUser();
      if (getUserData?.user) {
        console.log('Proceeding with user from getUser(), fetching profile...');
        setRegistrationProgress(95);
        setRegistrationStep('Cargando dashboard...');
        void fetchUserProfile(getUserData.user);
    setTimeout(() => {
          if (isRegisteringRef.current) {
            const u = getUserData.user;
            const tempUser: User = {
              id: u.id,
              email: u.email || '',
              name: (u.user_metadata as any)?.name || (u.email || 'Usuario').split('@')[0],
              role: (u.user_metadata as any)?.role || 'comprador',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User;
            console.warn('Watchdog(getUser): completing registration with temporary profile');
            setUser(tempUser);
            setOrphanedUser(null);
            setIsRegistering(false);
            setRegistrationProgress(100);
            setRegistrationStep('¡Completado!');
      // Materializar el perfil real en background
      void ensureProfileExists(u);
          }
        }, 4000);
        return { success: true };
      }

      // Si aún no hay usuario disponible, intentar un inicio de sesión rápido
      console.log('No user available post-signup, attempting quick sign-in');
      setRegistrationStep('Iniciando sesión...');
      const signInResult = await signIn(email, password);
      return signInResult;

    } catch (error) {
      console.error('Unexpected error during signup:', error);
      setIsRegistering(false);
      setRegistrationProgress(0);
      setRegistrationStep('');
      return { success: false, error: 'An unexpected error occurred during registration' };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Single-flight: si ya hay un signIn en curso, reutilizar la misma promesa
    if (signInPromiseRef.current) {
      return signInPromiseRef.current;
    }
    const p = (async () => {
      try {
        setLoading(true);
        console.log('Attempting signin for:', email);

        const { data: { session }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Signin error:', error);
          return { success: false, error: error.message };
        }

        if (session?.user) {
          console.log('Signin successful');
          return { success: true };
        } else {
          return { success: false, error: 'No session created' };
        }
      } catch (error) {
        console.error('Unexpected error during signin:', error);
        return { success: false, error: 'An unexpected error occurred during sign in' };
      } finally {
        setLoading(false);
        // Liberar la promesa para permitir intentos posteriores
        signInPromiseRef.current = null;
      }
    })();
    signInPromiseRef.current = p;
    return p;
  };

  const signOut = async () => {
    console.log('Signing out user');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setUser(null);
      setSession(null);
      setOrphanedUser(null);
      setIsRegistering(false);
      setRegistrationProgress(0);
      setRegistrationStep('');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      console.log('Updating profile for user:', user.id);

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        return { success: false, error: error.message };
      }

      setUser({ ...user, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const value = {
    user,
    session,
    loading,
    isRegistering,
    registrationProgress,
    registrationStep,
    orphanedUser,
  authLogs,
    signUp,
    signIn,
    signOut,
    updateProfile,
    createMissingProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}