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
  orphanedUser: SupabaseUser | null;
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
  
  const signInPromiseRef = React.useRef<Promise<{ success: boolean; error?: string }> | null>(null);
  const profileReqIdRef = React.useRef(0);
  const lastUserIdRef = React.useRef<string | null>(null);
  const isRegisteringRef = React.useRef<boolean>(isRegistering);

  useEffect(() => {
    isRegisteringRef.current = isRegistering;
  }, [isRegistering]);

  const pushAuthLog = (msg: string) => {
    const line = `${new Date().toISOString()} - ${msg}`;
    console.log('[AuthLog]', line);
    setAuthLogs((s) => [...s.slice(-50), line]);
    try {
      const anyW: any = window;
      anyW.__TRATO_AUTH_LOGS__ = anyW.__TRATO_AUTH_LOGS__ || [];
      anyW.__TRATO_AUTH_LOGS__.push(line);
    } catch {/* ignore */}
  };

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    if (!supabaseUser?.id) {
      console.warn('fetchUserProfile: No hay ID de usuario');
      return;
    }

    try {
      console.log('Actualizando perfil para:', supabaseUser.id);
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error al actualizar perfil:', error);
        pushAuthLog(`Error de perfil: ${error.message}`);
        return;
      }

      if (profile) {
        setUser(profile);
        setOrphanedUser(null);
        pushAuthLog('Perfil actualizado');
      } else {
        setOrphanedUser(supabaseUser);
        setUser(null);
        pushAuthLog('Usuario sin perfil');
      }
    } catch (error) {
      console.error('Error en fetchUserProfile:', error);
      pushAuthLog(`Error: ${error}`);
    }
  };

  const ensureProfileExists = async (sbUser: SupabaseUser) => {
    try {
      const minimalProfile: Partial<User> = {
        id: sbUser.id,
        email: sbUser.email || '',
        name: (sbUser.user_metadata as any)?.name || (sbUser.email || 'Usuario').split('@')[0],
        role: (sbUser.user_metadata as any)?.role || 'comprador',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('users')
        .upsert([minimalProfile], { 
          onConflict: 'id', 
          ignoreDuplicates: true 
        });

      if (error) {
        const isDuplicate = error.code === '23505' || /duplicate key/i.test(error.message);
        if (!isDuplicate) {
          console.warn('ensureProfileExists: upsert error:', error);
          pushAuthLog(`Error al asegurar perfil: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.warn('ensureProfileExists: error:', error);
      pushAuthLog(`Error al crear perfil mínimo: ${error.message}`);
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
      setRegistrationStep('Creando cuenta...');
      
      console.log('Starting signup for:', email);
      pushAuthLog('Iniciando registro de usuario...');

      // Si ya hay sesión activa
      if (session?.user) {
        console.log('Session already exists, fetching profile');
        setRegistrationProgress(30);
        setRegistrationStep('Cargando perfil existente...');
        void fetchUserProfile(session.user);
        
        const existing = session.user;
        setTimeout(() => {
          if (isRegisteringRef.current) {
            const tempUser: User = {
              id: existing.id,
              email: existing.email || '',
              name: userData.name,
              role: userData.role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as User;
            
            console.log('Using existing session for registration');
            pushAuthLog('Usando sesión existente');
            
            setUser(tempUser);
            setOrphanedUser(null);
            setIsRegistering(false);
            setRegistrationProgress(100);
            setRegistrationStep('¡Completado!');
            
            void ensureProfileExists(existing);
          }
        }, 4000);
        
        return { success: true };
      }

      // Create auth user with retries
      let authData;
      let authError;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} for auth signup`);
          pushAuthLog(`Reintentando registro (intento ${attempt})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined,
            data: {
              name: userData.name,
              role: userData.role,
              phone: userData.phone ?? null,
            },
          }
        });

        authData = result.data;
        authError = result.error;

        if (!authError || authError?.status === 422) break;
      }

      if (authError) {
        console.error('Auth signup error:', authError);
        pushAuthLog(`Error en registro: ${authError.message}`);
        
        // Handle existing account
        if (authError.status === 422 || /already registered/i.test(authError.message)) {
          console.log('Account exists, attempting sign in');
          pushAuthLog('Cuenta existente, intentando inicio de sesión...');
          setRegistrationStep('Cuenta existe, iniciando sesión...');
          return await signIn(email, password);
        }
        
        setIsRegistering(false);
        setRegistrationProgress(0);
        setRegistrationStep('');
        return { success: false, error: authError.message };
      }

      if (!authData?.user) {
        console.error('No user data returned');
        pushAuthLog('Error: No se recibieron datos de usuario');
        setIsRegistering(false);
        setRegistrationProgress(0);
        setRegistrationStep('');
        return { success: false, error: 'Error al crear usuario' };
      }

      const authUser = authData.user;
      console.log('Auth user created:', authUser.id);
      pushAuthLog('Usuario creado exitosamente');
      setRegistrationProgress(30);
      setRegistrationStep('Configurando perfil...');

      await new Promise(resolve => setTimeout(resolve, 500));

      // Create user profile
      const userProfile: Partial<User> = {
        id: authUser.id,
        email,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating user profile');
      setRegistrationProgress(50);
      pushAuthLog('Creando perfil de usuario...');

      let profileError: any = null;
      try {
        const insertPromise = supabase.from('users').insert([userProfile]);
        const timeoutMs = 2000;
        await Promise.race([
          insertPromise.then(({ error }) => { profileError = error; }),
          new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
      } catch (error: any) {
        profileError = error;
        console.error('Profile creation error:', error);
        pushAuthLog(`Error al crear perfil: ${error.message}`);
      }

      if (profileError) {
        console.warn('Profile creation issue:', profileError);
        pushAuthLog(`Problema al crear perfil: ${profileError.message}`);
        const isDuplicate = profileError.code === '23505' || /duplicate key/i.test(profileError.message);
        if (!isDuplicate) {
          console.error('Non-duplicate profile error:', profileError);
        }
      }

      console.log('User profile stage complete');
      setRegistrationProgress(70);
      setRegistrationStep('Configurando perfil específico...');

      // Create role-specific profile
      if (userData.role === 'vendedor') {
        const sellerProfile: Partial<Seller> = {
          id: authUser.id,
          business_name: userData.businessName || 'Mi Negocio',
          business_description: userData.businessDescription,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating seller profile');
        pushAuthLog('Creando perfil de vendedor...');
        
        let sellerError;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt} for seller profile`);
            pushAuthLog(`Reintentando crear perfil de vendedor (intento ${attempt})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          const result = await supabase
            .from('sellers')
            .insert([sellerProfile]);
            
          sellerError = result.error;
          if (!sellerError) break;
          
          console.error(`Seller profile error (attempt ${attempt}):`, sellerError);
        }

        if (sellerError) {
          console.error('Final seller profile error:', sellerError);
          pushAuthLog(`Error al crear perfil de vendedor: ${sellerError.message}`);
          if (sellerError.message?.includes('foreign key')) {
            return { 
              success: false, 
              error: 'Error al vincular perfil de vendedor. Por favor intenta de nuevo.' 
            };
          }
        }
      } else if (userData.role === 'repartidor') {
        const driverProfile: Partial<Driver> = {
          id: authUser.id,
          vehicle_type: userData.vehicleType || 'Moto',
          license_number: userData.licenseNumber || 'TEMP-' + Date.now(),
          is_active: false,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating driver profile');
        pushAuthLog('Creando perfil de repartidor...');

        let driverError;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt} for driver profile`);
            pushAuthLog(`Reintentando crear perfil de repartidor (intento ${attempt})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          const result = await supabase
            .from('drivers')
            .insert([driverProfile]);
            
          driverError = result.error;
          if (!driverError) break;
          
          console.error(`Driver profile error (attempt ${attempt}):`, driverError);
        }

        if (driverError) {
          console.error('Final driver profile error:', driverError);
          pushAuthLog(`Error al crear perfil de repartidor: ${driverError.message}`);
          if (driverError.message?.includes('foreign key')) {
            return { 
              success: false, 
              error: 'Error al vincular perfil de repartidor. Por favor intenta de nuevo.' 
            };
          }
        }
      }

      setRegistrationProgress(85);
      setRegistrationStep('Finalizando configuración...');

      console.log('Proceeding with authenticated user');
      pushAuthLog('Configurando sesión final...');
      setRegistrationProgress(95);
      setRegistrationStep('Cargando dashboard...');

      void fetchUserProfile(authUser);
      
      setTimeout(() => {
        if (isRegisteringRef.current) {
          const tempUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: userData.name,
            role: userData.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User;
          
          console.log('Completing registration with temp profile');
          pushAuthLog('Completando registro con perfil temporal');
          
          setUser(tempUser);
          setOrphanedUser(null);
          setIsRegistering(false);
          setRegistrationProgress(100);
          setRegistrationStep('¡Completado!');
          
          void ensureProfileExists(authUser);
        }
      }, 4000);

      return { success: true };
      
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      pushAuthLog(`Error inesperado en registro: ${error.message}`);
      return { success: false, error: 'Error inesperado durante el registro' };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (signInPromiseRef.current) {
      return signInPromiseRef.current;
    }

    const p = (async () => {
      try {
        setLoading(true);
        const { data: { user: signedInUser }, error: signInError } = 
          await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          return { success: false, error: signInError.message };
        }

        if (!signedInUser) {
          return { success: false, error: 'Error al iniciar sesión' };
        }

        return { success: true };
      } finally {
        setLoading(false);
        signInPromiseRef.current = null;
      }
    })();

    signInPromiseRef.current = p;
    return p;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setOrphanedUser(null);
      setIsRegistering(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user?.id);

      if (error) return { success: false, error: error.message };
      
      setUser(current => current ? { ...current, ...updates } : null);
      return { success: true };
    } finally {
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
      return { success: false, error: 'No hay usuario huérfano' };
    }

    try {
      setLoading(true);
      setIsRegistering(true);
      setRegistrationProgress(20);
      setRegistrationStep('Creando perfil faltante...');

      const userProfile: Partial<User> = {
        id: orphanedUser.id,
        email: orphanedUser.email!,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating missing profile:', userProfile);
      pushAuthLog('Creando perfil faltante...');
      setRegistrationProgress(50);

      const { error: profileError } = await supabase
        .from('users')
        .insert([userProfile]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        pushAuthLog(`Error al crear perfil: ${profileError.message}`);
        
        if (profileError.message?.includes('violates row-level security')) {
          console.log('RLS error detected, retrying...');
          pushAuthLog('Error RLS detectado, reintentando...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { error: retryError } = await supabase
            .from('users')
            .insert([userProfile]);
            
          if (retryError) {
            console.error('Profile creation retry failed:', retryError);
            return { success: false, error: `Error al crear perfil: ${retryError.message}` };
          }
        } else {
          return { success: false, error: `Error al crear perfil: ${profileError.message}` };
        }
      }

      console.log('User profile created successfully');
      pushAuthLog('Perfil de usuario creado exitosamente');
      setRegistrationProgress(70);
      setRegistrationStep('Configurando datos específicos...');

      // Role-specific profiles
      if (userData.role === 'vendedor' && userData.businessName) {
        const sellerProfile: Partial<Seller> = {
          id: orphanedUser.id,
          business_name: userData.businessName,
          business_description: userData.businessDescription,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating seller profile:', sellerProfile);
        pushAuthLog('Creando perfil de vendedor...');

        const { error: sellerError } = await supabase
          .from('sellers')
          .insert([sellerProfile]);

        if (sellerError) {
          console.error('Seller profile error:', sellerError);
          pushAuthLog(`Error al crear perfil de vendedor: ${sellerError.message}`);
          if (sellerError.message?.includes('foreign key')) {
            return { 
              success: false, 
              error: 'Error al vincular perfil de vendedor' 
            };
          }
        }
      }

      if (userData.role === 'repartidor' && userData.vehicleType) {
        const driverProfile: Partial<Driver> = {
          id: orphanedUser.id,
          vehicle_type: userData.vehicleType,
          license_number: userData.licenseNumber || 'TEMP-' + Date.now(),
          is_active: false,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating driver profile:', driverProfile);
        pushAuthLog('Creando perfil de repartidor...');

        const { error: driverError } = await supabase
          .from('drivers')
          .insert([driverProfile]);

        if (driverError) {
          console.error('Driver profile error:', driverError);
          pushAuthLog(`Error al crear perfil de repartidor: ${driverError.message}`);
          if (driverError.message?.includes('foreign key')) {
            return { 
              success: false, 
              error: 'Error al vincular perfil de repartidor' 
            };
          }
        }
      }

      setRegistrationProgress(95);
      setRegistrationStep('Cargando perfil...');

      await fetchUserProfile(orphanedUser);
      
      setRegistrationProgress(100);
      setRegistrationStep('¡Perfil recuperado!');
      
      return { success: true };

    } catch (error: any) {
      console.error('Error creating missing profile:', error);
      pushAuthLog(`Error inesperado: ${error.message}`);
      return { success: false, error: 'Error inesperado al crear el perfil' };
    } finally {
      setIsRegistering(false);
      setLoading(false);
    }
  };

  // Efecto para limpiar estado cuando no hay sesión
  useEffect(() => {
    if (!session && !loading && !isRegistering) {
      console.log('Limpiando estado por falta de sesión');
      setUser(null);
      setOrphanedUser(null);
      lastUserIdRef.current = null;
    }
  }, [session, loading, isRegistering]);

  // Efecto para manejar la sesión inicial y cambios de autenticación
  useEffect(() => {
    if (MISCONFIGURED) {
      console.log('Supabase está mal configurado, saltando inicialización');
      setLoading(false);
      return;
    }

    console.log('Iniciando efecto de autenticación');
    
    // Función para manejar cambios de autenticación
    const handleAuthChange = async (event: string, session: Session | null) => {
      console.log('Cambio de autenticación:', event, session?.user?.id);
      pushAuthLog(`Cambio de autenticación: ${event}`);

      // Actualizar estado de sesión
      setSession(session);

      // Limpiar estado en cierre de sesión
      if (event === 'SIGNED_OUT') {
        console.log('Usuario cerró sesión');
        setUser(null);
        setOrphanedUser(null);
        lastUserIdRef.current = null;
        setLoading(false);
        return;
      }

      // Si no hay usuario en la sesión, no hacer nada más
      if (!session?.user) {
        console.log('No hay usuario en la sesión');
        setLoading(false);
        return;
      }

      // Evitar cargas duplicadas del mismo usuario
      if (session.user.id === lastUserIdRef.current && user) {
        console.log('Usuario ya cargado:', session.user.id);
        setLoading(false);
        return;
      }

      // Actualizar referencia de último usuario
      lastUserIdRef.current = session.user.id;

      try {
        console.log('Buscando perfil para:', session.user.id);
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error al buscar perfil:', error);
          pushAuthLog(`Error al buscar perfil: ${error.message}`);
          setLoading(false);
          return;
        }

        if (profile) {
          console.log('Perfil encontrado:', profile);
          pushAuthLog('Perfil cargado exitosamente');
          setUser(profile);
          setOrphanedUser(null);
        } else {
          console.log('No se encontró perfil, marcando como huérfano');
          pushAuthLog('Usuario sin perfil detectado');
          setOrphanedUser(session.user);
          setUser(null);
        }
      } catch (error) {
        console.error('Error inesperado:', error);
        pushAuthLog(`Error inesperado: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Obtener y manejar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Sesión inicial:', session?.user?.id);
      handleAuthChange('INITIAL_SESSION', session);
    });

    // Limpieza al desmontar
    return () => {
      console.log('Limpiando suscripción de autenticación');
      subscription.unsubscribe();
    };
  }, []);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
