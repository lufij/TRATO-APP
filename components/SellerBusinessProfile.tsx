import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useWeeklyHours } from '../hooks/useWeeklyHours';
import { LocationSection } from './LocationSection';
import { WeeklyHoursPreview } from './WeeklyHoursPreview';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { 
  Store, Upload, MapPin, Phone, Mail, Clock, Camera, Save, Edit, Verified, Star, Globe,
  Instagram, Facebook, MessageCircle, AlertCircle, CheckCircle, Loader2, Eye, EyeOff,
  BarChart3, Shield, PowerOff, Power, Settings, Info, Truck, Share2, Navigation, Copy, 
  ExternalLink, AlertTriangle, RotateCcw, XCircle
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { BUSINESS_CATEGORIES, checkGoogleMapsConfig } from '../constants/business';
import { copyLocationForDrivers, openMapsForLocation, validateFormData } from '../utils/businessProfile';

interface BusinessProfile {
  id: string;
  business_name: string;
  business_description?: string;
  business_logo?: string;
  cover_image_url?: string;
  business_category: string;
  phone?: string;
  email?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  business_hours: string;
  delivery_time: number;
  delivery_radius: number;
  minimum_order: number;
  is_verified: boolean;
  is_active: boolean;
  is_open_now: boolean;
  is_accepting_orders: boolean;
  location_verified: boolean;
  social_media?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    website?: string;
  };
  created_at: string;
  updated_at: string;
}

// Tab Button Component
const TabButton = ({ active, onClick, children, icon: Icon }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ElementType;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:inline">{children}</span>
  </button>
);

export function SellerBusinessProfile() {
  const { user } = useAuth();
  const { 
    getCurrentLocation, 
    loading: gpsLoading, 
    error: gpsError,
    permissionState,
    clearError 
  } = useGoogleMaps();
  
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [locationDetails, setLocationDetails] = useState<string>('');
  const [googleMapsConfigured, setGoogleMapsConfigured] = useState(false);
  const [showGPSError, setShowGPSError] = useState(false);
  const [missingProfile, setMissingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Initialize weekly hours hook
  const {
    weeklyHours,
    setWeeklyHours,
    updateWeeklyHours,
    generateWeeklyHoursText,
    getHoursAsJSON
  } = useWeeklyHours(profile?.business_hours);

  const [formData, setFormData] = useState({
    business_name: '',
    business_description: '',
    business_logo: '',
    cover_image_url: '',
    business_category: '',
    phone: '',
    email: '',
    address: '',
    latitude: 0,
    longitude: 0,
    delivery_time: 30,
    delivery_radius: 5,
    minimum_order: 50,
    is_active: true,
    is_open_now: false,
    is_accepting_orders: true,
    location_verified: false,
    social_media: {
      facebook: '',
      instagram: '',
      whatsapp: '',
      website: ''
    }
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      // No usuario autenticado: evitar spinner infinito en esta vista
      setProfile(null);
      setMissingProfile(false);
      setLoading(false);
    }
    setGoogleMapsConfigured(checkGoogleMapsConfig());
  }, [user]);

  // Fail-safe: si algo deja la vista en "loading" por demasiado tiempo, mostrar creación de perfil
  useEffect(() => {
    if (!user) return;
    if (!loading) return;
    const t = setTimeout(() => {
      // Si aún está cargando después de 8s, asumimos perfil faltante o RLS bloqueando lectura
      setLoading(false);
      setMissingProfile(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [user, loading]);

  useEffect(() => {
    if (gpsError) {
      setShowGPSError(true);
      setError('');
    }
  }, [gpsError]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Intentar cargar perfil
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', user?.id)
        .single();

      // Manejo tolerante de errores: tratar RLS/permiso/no-encontrado como perfil faltante
      if (error) {
        const code = (error as any).code as string | undefined;
        const msg = (error as any).message?.toString().toLowerCase() || '';
        const isMissing = code === 'PGRST116' // single() sin filas
          || code === 'PGRST403' // prohibido por RLS
          || code === '42501'    // insufficient_privilege
          || code === 'PGRST114' // No autorizado
          || msg.includes('permission')
          || msg.includes('rls')
          || msg.includes('forbidden')
          || msg.includes('not authorized');
        if (isMissing) {
          setMissingProfile(true);
        } else {
          throw error;
        }
      }

      if (data) {
        setProfile(data);
        setFormData({
          business_name: data.business_name || '',
          business_description: data.business_description || '',
          business_logo: data.business_logo || '',
          cover_image_url: data.cover_image_url || '',
          business_category: data.business_category || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          delivery_time: data.delivery_time || 30,
          delivery_radius: data.delivery_radius || 5,
          minimum_order: data.minimum_order || 50,
          is_active: data.is_active !== false,
          is_open_now: data.is_open_now || false,
          is_accepting_orders: data.is_accepting_orders !== false,
          location_verified: data.location_verified || false,
          social_media: data.social_media || {
            facebook: '',
            instagram: '',
            whatsapp: '',
            website: ''
          }
        });

        // Parse weekly hours from business_hours
        if (data.business_hours) {
          try {
            setWeeklyHours(JSON.parse(data.business_hours));
          } catch (e) {
            console.log('Using default weekly hours');
          }
        }

        // Check if location is verified
        const hasValidLocation = data.latitude && data.longitude && 
                                Math.abs(data.latitude) > 0.001 && Math.abs(data.longitude) > 0.001;
        setLocationVerified(hasValidLocation);
        
        if (hasValidLocation) {
          setLocationDetails(`${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
  // Si falló por otra razón, mostrar error visible pero no bloquear con spinner
  setError('Error al cargar el perfil del negocio');
    } finally {
      setLoading(false);
    }
  };

  const createMinimalSellerProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      setError('');

      const minimal = {
        business_name: formData.business_name?.trim() || 'Mi Negocio',
        business_description: formData.business_description?.trim() || '',
        business_logo: '',
        cover_image_url: '',
        business_category: formData.business_category || '',
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address?.trim() || '',
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        business_hours: getHoursAsJSON(),
        delivery_time: formData.delivery_time || 30,
        delivery_radius: formData.delivery_radius || 5,
        minimum_order: formData.minimum_order || 0,
        is_active: true,
        is_open_now: false,
        is_accepting_orders: true,
        location_verified: false,
        social_media: formData.social_media,
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sellers')
        .upsert({ id: user.id, ...minimal });

      if (error) throw error;

      setSuccess('✅ Perfil de vendedor creado. Completa la información y guarda los cambios.');
      setMissingProfile(false);
      setIsEditing(true);
      await loadProfile();

      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error creating minimal seller profile:', err);
      setError('No se pudo crear el perfil de vendedor. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const validationError = validateFormData(formData);
      if (validationError) {
        setError(validationError);
        return;
      }

      console.log('💾 Guardando perfil con datos:', {
        business_name: formData.business_name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        business_logo: formData.business_logo?.substring(0, 50) + '...',
        cover_image_url: formData.cover_image_url?.substring(0, 50) + '...'
      });

      const updateData = {
        business_name: formData.business_name.trim(),
        business_description: formData.business_description?.trim() || null,
        business_category: formData.business_category || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        business_hours: getHoursAsJSON(),
        delivery_time: formData.delivery_time || 30,
        delivery_radius: formData.delivery_radius || 5,
        minimum_order: formData.minimum_order || 0,
        is_active: formData.is_active,
        is_open_now: formData.is_open_now,
        location_verified: formData.location_verified || false,
        social_media: formData.social_media || {},
        business_logo: formData.business_logo || null,
        cover_image_url: formData.cover_image_url || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sellers')
        .upsert({
          id: user?.id,
          ...updateData
        });

      if (error) {
        console.error('💥 Error al guardar:', error);
        throw error;
      }

      console.log('✅ Perfil guardado exitosamente');
      setSuccess('✅ Perfil guardado exitosamente');
      setIsEditing(false);
      await loadProfile();

      setTimeout(() => setSuccess(''), 4000);
    } catch (error: any) {
      console.error('💥 Error saving profile:', error);
      setError(`Error al guardar el perfil: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  // Función para redimensionar imagen
  const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingImage(true);
      setError('');

      console.log('� SUBIENDO LOGO:', file.name);

      // Validación mínima
      if (!file.type.startsWith('image/')) {
        setError('Solo imágenes permitidas');
        return;
      }

      // Redimensionar
      const resizedBlob = await resizeImage(file, 400, 400, 0.9);
      const fileName = `${user.id}/logo-${Date.now()}.jpg`;

      console.log('📤 Subiendo a business-logos...');

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, resizedBlob, { upsert: true });

      if (uploadError) {
        console.error('❌ Error upload:', uploadError);
        setError(`Error subiendo: ${uploadError.message}`);
        return;
      }

      // Obtener URL
      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName);

      console.log('🔗 URL generada:', urlData.publicUrl);

      // GUARDAR EN BASE DE DATOS CON UPSERT SIMPLE
      const { error: updateError } = await supabase
        .from('sellers')
        .upsert({ 
          id: user.id,
          business_logo: urlData.publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (updateError) {
        console.error('❌ Error BD:', updateError);
        setError(`Error guardando: ${updateError.message}`);
        return;
      }

      console.log('✅ LOGO GUARDADO EXITOSAMENTE');
      setFormData(prev => ({ ...prev, business_logo: urlData.publicUrl }));
      setSuccess('✅ Logo guardado correctamente');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('💥 ERROR COMPLETO:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingImage(true);
      setError('');

      console.log('� SUBIENDO PORTADA:', file.name);

      // Validación mínima
      if (!file.type.startsWith('image/')) {
        setError('Solo imágenes permitidas');
        return;
      }

      // Redimensionar
      const resizedBlob = await resizeImage(file, 1200, 400, 0.9);
      const fileName = `${user.id}/cover-${Date.now()}.jpg`;

      console.log('📤 Subiendo a business-covers...');

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('business-covers')
        .upload(fileName, resizedBlob, { upsert: true });

      if (uploadError) {
        console.error('❌ Error upload:', uploadError);
        setError(`Error subiendo: ${uploadError.message}`);
        return;
      }

      // Obtener URL
      const { data: urlData } = supabase.storage
        .from('business-covers')
        .getPublicUrl(fileName);

      console.log('🔗 URL generada:', urlData.publicUrl);

      // GUARDAR EN BASE DE DATOS CON UPSERT SIMPLE
      const { error: updateError } = await supabase
        .from('sellers')
        .upsert({ 
          id: user.id,
          cover_image_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (updateError) {
        console.error('❌ Error BD:', updateError);
        setError(`Error guardando: ${updateError.message}`);
        return;
      }

      console.log('✅ PORTADA GUARDADA EXITOSAMENTE');
      setFormData(prev => ({ ...prev, cover_image_url: urlData.publicUrl }));
      setSuccess('✅ Portada guardada correctamente');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('💥 ERROR COMPLETO:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const detectLocationProfessional = async () => {
    try {
      setError('');
      setShowGPSError(false);
      clearError();
      
      const locationData = await getCurrentLocation();
      
      setFormData(prev => ({
        ...prev,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.formatted_address
      }));

      setLocationVerified(true);
      setLocationDetails(`${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`);
      
      setSuccess(`🎯 ¡Ubicación GPS verificada exitosamente!
      
📍 Dirección: ${locationData.formatted_address}
🗺️ Ciudad: ${locationData.city}, ${locationData.state}
📊 Coordenadas: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
      
✅ Los repartidores podrán encontrar tu negocio fácilmente.

🔔 No olvides guardar el perfil para mantener estos cambios.`);
      
    } catch (error) {
      console.error('Error detecting location:', error);
      setShowGPSError(true);
    }
  };

  const handleGPSErrorRetry = () => {
    setShowGPSError(false);
    clearError();
    detectLocationProfessional();
  };

  const handleGPSErrorDismiss = () => {
    setShowGPSError(false);
    clearError();
  };

  const handleCopyLocationForDrivers = async () => {
    if (formData.latitude && formData.longitude) {
      const success = await copyLocationForDrivers(
        formData.latitude,
        formData.longitude,
        formData.address,
        formData.business_name
      );
      
      if (success) {
        setSuccess('📋 ¡Información copiada! Compártela con los repartidores vía WhatsApp.');
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  const toggleBusinessStatus = async () => {
    const newStatus = !formData.is_open_now;
    
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ 
          is_open_now: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setFormData(prev => ({ ...prev, is_open_now: newStatus }));
      setSuccess(newStatus 
        ? '🟢 ¡Negocio ABIERTO! Ahora apareces en el listado de compradores' 
        : '🔴 Negocio CERRADO. No aparecerás en el listado hasta que abras');
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      console.error('Error updating business status:', error);
      setError('Error al actualizar el estado del negocio');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p>Cargando tu perfil de negocio...</p>
        </div>
      </div>
    );
  }

  if (!loading && missingProfile) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-2xl">
        <Card className="text-center shadow-lg border-none">
          <CardHeader>
            <CardTitle>¡Bienvenido, Vendedor!</CardTitle>
            <p className="text-gray-600">
              Parece que aún no has configurado tu perfil. ¡Es el primer paso para empezar a vender!
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Crearemos un perfil básico para ti. Podrás editar y completar toda la información más adelante.
            </p>
            <Button onClick={createMinimalSellerProfile} disabled={saving} size="lg" className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Store className="w-5 h-5 mr-2" />}
              Crear Mi Perfil Ahora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mi Perfil de Negocio</h1>
              <p className="text-gray-500 mt-1">Gestiona la información que ven tus clientes.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Cancelar' : <><Edit className="w-4 h-4 mr-2" /> Editar</>}
              </Button>
              {isEditing && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Cambios
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800 whitespace-pre-line">{success}</AlertDescription>
          </Alert>
        )}

        {/* Google Maps API Info */}
        {!googleMapsConfigured && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Settings className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Sistema GPS:</strong> Funcionando con detección básica. 
              Para direcciones más detalladas, puedes configurar Google Maps API (opcional).
              <br />
              <small>Ver: /GOOGLE_MAPS_SETUP_OPCIONAL.md</small>
            </AlertDescription>
          </Alert>
        )}

        <Card className="w-full overflow-hidden shadow-lg border-none">
          {/* Cover Image */}
          <div className="relative h-40 sm:h-56 bg-gradient-to-r from-blue-500 to-purple-600">
            {formData.cover_image_url ? (
              <ImageWithFallback
                src={formData.cover_image_url}
                alt="Portada del negocio"
                className="w-full h-full object-cover"
                width={800}
                height={200}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-70" />
                  <p className="text-sm opacity-90">Imagen de portada</p>
                  {isEditing && (
                    <p className="text-xs opacity-70 mt-1">Cualquier imagen se optimizará automáticamente</p>
                  )}
                </div>
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                <Button variant="secondary" disabled={uploadingImage}>
                  {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                  {formData.cover_image_url ? 'Cambiar Portada' : 'Agregar Portada'}
                </Button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverImageUpload} />
              </div>
            )}
          </div>

          {/* Profile Header */}
          <div className="relative px-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12">
              {/* Logo */}
              <div className="relative h-32 w-32 rounded-full border-4 border-white bg-gradient-to-br from-green-400 to-blue-500 shadow-md flex items-center justify-center">
                {formData.business_logo ? (
                  <ImageWithFallback
                    src={formData.business_logo}
                    alt="Logo del negocio"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="text-center text-white">
                    <Store className="w-12 h-12 mx-auto mb-1" />
                    {isEditing && (
                      <p className="text-xs opacity-80">Logo - Auto-optimizado</p>
                    )}
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                    <div className="h-10 w-10 bg-white/90 rounded-full flex items-center justify-center">
                      {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-slate-800" /> : <Camera className="w-5 h-5 text-slate-800" />}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                )}
              </div>
              
              {/* Business Info */}
              <div className="mt-4 sm:ml-6 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{formData.business_name}</h2>
                  {profile?.is_verified && <Verified className="w-5 h-5 text-blue-500" />}
                </div>
                <p className="text-gray-500">{formData.business_category}</p>
              </div>
              
              {/* Business Status Toggle */}
              <div className="mt-4 sm:mt-0 sm:ml-auto">
                <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                  formData.is_open_now 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-400 text-white'
                }`}>
                  <span>
                    {formData.is_open_now ? 'Abierto' : 'Cerrado'}
                  </span>
                  <Switch 
                    checked={formData.is_open_now} 
                    onCheckedChange={toggleBusinessStatus}
                    className="h-3 w-5 scale-75"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="px-6 mt-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-2 -mb-px overflow-x-auto">
              <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={Info}>Información</TabButton>
              <TabButton active={activeTab === 'location'} onClick={() => setActiveTab('location')} icon={MapPin}>Ubicación</TabButton>
              <TabButton active={activeTab === 'delivery'} onClick={() => setActiveTab('delivery')} icon={Truck}>Delivery</TabButton>
            </div>
          </div>

          {/* Tab Content */}
          <CardContent className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-8">
                {/* Basic Information */}
                <div>
                  <CardTitle className="flex items-center gap-2 mb-4">
                    <Store className="w-5 h-5 text-green-500"/> Información Básica
                  </CardTitle>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="business_name" className="flex items-center gap-2 text-sm font-medium">
                        <Store className="w-4 h-4 text-green-500" />
                        Nombre del Negocio
                      </Label>
                      <Input 
                        id="business_name" 
                        value={formData.business_name} 
                        onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))} 
                        disabled={!isEditing} 
                        placeholder="Mi Negocio"
                        className="border-gray-200 focus:border-green-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="business_category" className="flex items-center gap-2 text-sm font-medium">
                        <Badge className="w-4 h-4 text-blue-500" />
                        Categoría
                      </Label>
                      <Select 
                        value={formData.business_category} 
                        onValueChange={(value: string) => setFormData(prev => ({ ...prev, business_category: value }))} 
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="border-gray-200 focus:border-blue-500">
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-1">
                    <Label htmlFor="business_description" className="flex items-center gap-2 text-sm font-medium">
                      <Info className="w-4 h-4 text-purple-500" />
                      Descripción (opcional)
                    </Label>
                    <Textarea 
                      id="business_description" 
                      value={formData.business_description} 
                      onChange={(e) => setFormData(prev => ({ ...prev, business_description: e.target.value }))} 
                      disabled={!isEditing} 
                      rows={3} 
                      placeholder="Cuéntales a tus clientes sobre tu negocio..."
                      className="border-gray-200 focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <CardTitle className="flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-blue-500"/> Contacto
                  </CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                        <Phone className="w-4 h-4 text-green-500" />
                        Teléfono
                      </Label>
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                        disabled={!isEditing} 
                        placeholder="+502 1234-5678"
                        className="border-gray-200 focus:border-green-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="w-4 h-4 text-blue-500" />
                        Email (opcional)
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
                        disabled={!isEditing} 
                        placeholder="contacto@negocio.com"
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <CardTitle className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-purple-500"/> Redes Sociales
                  </CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium">
                        <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp
                      </Label>
                      <Input 
                        id="whatsapp" 
                        value={formData.social_media.whatsapp} 
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          social_media: { ...prev.social_media, whatsapp: e.target.value }
                        }))} 
                        disabled={!isEditing} 
                        placeholder="+502 1234-5678"
                        className="border-gray-200 focus:border-green-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="facebook" className="flex items-center gap-2 text-sm font-medium">
                        <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                      </Label>
                      <Input 
                        id="facebook" 
                        value={formData.social_media.facebook} 
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          social_media: { ...prev.social_media, facebook: e.target.value }
                        }))} 
                        disabled={!isEditing} 
                        placeholder="@mi_negocio"
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {isEditing && (
                    <details className="mt-4">
                      <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                        + Más redes sociales (opcional)
                      </summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-1">
                          <Label htmlFor="instagram" className="flex items-center gap-2 text-sm font-medium">
                            <Instagram className="w-4 h-4 text-pink-500" /> Instagram
                          </Label>
                          <Input 
                            id="instagram" 
                            value={formData.social_media.instagram} 
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              social_media: { ...prev.social_media, instagram: e.target.value }
                            }))} 
                            placeholder="@mi_negocio"
                            className="border-gray-200 focus:border-pink-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="website" className="flex items-center gap-2 text-sm font-medium">
                            <Globe className="w-4 h-4 text-gray-500" /> Sitio Web
                          </Label>
                          <Input 
                            id="website" 
                            value={formData.social_media.website} 
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              social_media: { ...prev.social_media, website: e.target.value }
                            }))} 
                            placeholder="www.mi-negocio.com"
                            className="border-gray-200 focus:border-gray-500"
                          />
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'location' && (
              <div className="space-y-6">
                {/* Location Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-semibold">Ubicación del Negocio</h3>
                    {locationVerified && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>

                  {/* GPS Error Alert */}
                  {showGPSError && gpsError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex flex-col gap-3">
                        <span>{gpsError}</span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleGPSErrorRetry}
                            className="bg-white hover:bg-gray-50"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reintentar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={handleGPSErrorDismiss}
                            className="text-red-800 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cerrar
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="w-4 h-4 text-red-500" />
                        Dirección
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Dirección de tu negocio"
                        className="border-gray-200 focus:border-red-500"
                      />
                    </div>

                    {/* GPS Detection Card */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-5 h-5 text-blue-500" />
                          <span className="font-medium">GPS Automático</span>
                        </div>
                        {locationVerified && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>

                      {locationVerified ? (
                        <div className="space-y-3">
                          <div className="text-sm text-green-700 bg-green-100 p-3 rounded-md">
                            ✅ <strong>Ubicación verificada</strong>
                            <br />
                            📍 {locationDetails}
                          </div>
                          
                          {isEditing && (
                            <div className="flex gap-2">
                              <Button
                                onClick={detectLocationProfessional}
                                disabled={gpsLoading}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {gpsLoading ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Navigation className="w-4 h-4 mr-2" />
                                )}
                                Actualizar
                              </Button>
                              <Button
                                onClick={() => openMapsForLocation(formData.latitude, formData.longitude)}
                                variant="outline"
                                size="sm"
                                disabled={!formData.latitude || !formData.longitude}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ver Mapa
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">
                            Detecta tu ubicación para que los repartidores te encuentren fácilmente
                          </p>
                          
                          {isEditing && (
                            <Button
                              onClick={detectLocationProfessional}
                              disabled={gpsLoading}
                              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                            >
                              {gpsLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Navigation className="w-4 h-4 mr-2" />
                              )}
                              {gpsLoading ? 'Detectando...' : 'Detectar Mi Ubicación'}
                            </Button>
                          )}

                          {permissionState === 'denied' && (
                            <Alert className="border-yellow-200 bg-yellow-50">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-800 text-sm">
                                <strong>GPS bloqueado.</strong> Haz clic en 🔒 en la barra del navegador para permitir ubicación.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Weekly Hours Section */}
                <div>
                  <WeeklyHoursPreview
                    weeklyHours={weeklyHours}
                    updateWeeklyHours={updateWeeklyHours}
                    generateWeeklyHoursText={generateWeeklyHoursText}
                  />
                </div>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="space-y-6">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-500"/> Configuración de Delivery
                </CardTitle>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <Label htmlFor="delivery_time" className="text-sm font-medium">Tiempo de Preparación</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="delivery_time" 
                        type="number" 
                        value={formData.delivery_time} 
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_time: parseInt(e.target.value) || 0 }))} 
                        disabled={!isEditing} 
                        min="5"
                        max="120"
                        className="border-gray-200 focus:border-orange-500"
                      />
                      <span className="text-sm text-gray-500">min</span>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      <Label htmlFor="delivery_radius" className="text-sm font-medium">Radio de Entrega</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="delivery_radius" 
                        type="number" 
                        value={formData.delivery_radius} 
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_radius: parseInt(e.target.value) || 0 }))} 
                        disabled={!isEditing} 
                        min="1"
                        max="20"
                        className="border-gray-200 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-500">km</span>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="w-5 h-5 text-green-500" />
                      <Label htmlFor="minimum_order" className="text-sm font-medium">Pedido Mínimo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Q</span>
                      <Input 
                        id="minimum_order" 
                        type="number" 
                        value={formData.minimum_order} 
                        onChange={(e) => setFormData(prev => ({ ...prev, minimum_order: parseInt(e.target.value) || 0 }))} 
                        disabled={!isEditing} 
                        min="0"
                        className="border-gray-200 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  💡 Estos valores ayudan a los clientes a saber qué esperar de tu servicio
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}