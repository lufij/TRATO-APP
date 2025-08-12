import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useWeeklyHours } from '../hooks/useWeeklyHours';
import { LocationSection } from './LocationSection';
import { WeeklyHoursSection } from './WeeklyHoursSection';
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
  BarChart3, Shield, PowerOff, Power, Settings
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { BUSINESS_CATEGORIES, checkGoogleMapsConfig } from '../constants/business';
import { copyLocationForDrivers, openMapsForLocation, validateFormData } from '../utils/businessProfile';

interface BusinessProfile {
  id: string;
  business_name: string;
  business_description?: string;
  business_logo?: string;
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
  social_media?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    website?: string;
  };
  created_at: string;
  updated_at: string;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
    setGoogleMapsConfigured(checkGoogleMapsConfig());
  }, [user]);

  useEffect(() => {
    if (gpsError) {
      setShowGPSError(true);
      setError('');
    }
  }, [gpsError]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          business_name: data.business_name || '',
          business_description: data.business_description || '',
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
      setError('Error al cargar el perfil del negocio');
    } finally {
      setLoading(false);
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

      const updateData = {
        business_name: formData.business_name.trim(),
        business_description: formData.business_description?.trim(),
        business_category: formData.business_category,
        phone: formData.phone?.trim(),
        email: formData.email?.trim(),
        address: formData.address?.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        business_hours: getHoursAsJSON(),
        delivery_time: formData.delivery_time,
        delivery_radius: formData.delivery_radius,
        minimum_order: formData.minimum_order,
        is_active: formData.is_active,
        is_open_now: formData.is_open_now,
        social_media: formData.social_media,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sellers')
        .upsert({
          id: user?.id,
          ...updateData
        });

      if (error) throw error;

      setSuccess('✅ Perfil guardado exitosamente');
      setIsEditing(false);
      await loadProfile();

      setTimeout(() => setSuccess(''), 4000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Error al guardar el perfil. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingImage(true);
      setError('');

      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen debe ser menor a 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/business-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('sellers')
        .update({ business_logo: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess('✅ Logo actualizado exitosamente');
      await loadProfile();
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Error al subir la imagen. Verifica el formato y tamaño.');
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
      setSuccess(newStatus ? '🟢 ¡Negocio marcado como ABIERTO!' : '🔴 Negocio marcado como CERRADO');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating business status:', error);
      setError('Error al actualizar el estado del negocio');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando perfil del negocio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Perfil del Negocio</h2>
          <p className="text-gray-600">
            Esta información es lo que verán tus clientes. Manténla actualizada.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-2"
          >
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? 'Editar' : 'Vista Previa'}
          </Button>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 whitespace-pre-line">{success}</AlertDescription>
        </Alert>
      )}

      {/* Google Maps API Info */}
      {!googleMapsConfigured && (
        <Alert className="border-blue-200 bg-blue-50">
          <Settings className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Sistema GPS:</strong> Funcionando con detección básica. 
            Para direcciones más detalladas, puedes configurar Google Maps API (opcional).
            <br />
            <small>Ver: /GOOGLE_MAPS_SETUP_OPCIONAL.md</small>
          </AlertDescription>
        </Alert>
      )}

      {/* Business Status Toggle */}
      <Card className={`border-2 ${formData.is_open_now ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {formData.is_open_now ? (
                <div className="bg-green-500 p-3 rounded-full">
                  <Power className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="bg-red-500 p-3 rounded-full">
                  <PowerOff className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h3 className={`text-lg font-bold ${formData.is_open_now ? 'text-green-800' : 'text-red-800'}`}>
                  Estado Actual: {formData.is_open_now ? 'ABIERTO' : 'CERRADO'}
                </h3>
                <p className={`text-sm ${formData.is_open_now ? 'text-green-700' : 'text-red-700'}`}>
                  {formData.is_open_now 
                    ? 'Los clientes pueden hacer pedidos ahora' 
                    : 'Los clientes no pueden hacer pedidos'}
                </p>
              </div>
            </div>
            <Button
              onClick={toggleBusinessStatus}
              size="lg"
              className={`${formData.is_open_now 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
              } font-semibold px-8`}
            >
              {formData.is_open_now ? (
                <>
                  <PowerOff className="w-5 h-5 mr-2" />
                  CERRAR NEGOCIO
                </>
              ) : (
                <>
                  <Power className="w-5 h-5 mr-2" />
                  ABRIR NEGOCIO
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Preview Mode */}
      {previewMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Eye className="w-5 h-5" />
              Vista Previa del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.business_logo ? (
                    <ImageWithFallback
                      src={profile.business_logo}
                      alt="Logo del negocio"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-10 h-10 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">
                      {formData.business_name || 'Nombre del Negocio'}
                    </h3>
                    {profile?.is_verified && (
                      <Verified className="w-5 h-5 text-blue-500" />
                    )}
                    <Badge className={formData.is_open_now ? 'bg-green-500' : 'bg-red-500'}>
                      {formData.is_open_now ? 'ABIERTO' : 'CERRADO'}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-2">
                    {formData.business_description || 'Descripción del negocio'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      4.5
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formData.delivery_time} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {formData.delivery_radius} km
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Horarios:</strong> {generateWeeklyHoursText()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-green-500" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Nombre del Negocio *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Restaurante El Buen Sabor"
                  />
                </div>
                <div>
                  <Label htmlFor="business_category">Categoría *</Label>
                  <Select 
                    value={formData.business_category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, business_category: value }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="business_description">Descripción del Negocio</Label>
                <Textarea
                  id="business_description"
                  value={formData.business_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_description: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Describe tu negocio, especialidades, años de experiencia..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-500" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="+502 1234-5678"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="contacto@minegocios.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Section */}
          <LocationSection
            locationVerified={locationVerified}
            locationDetails={locationDetails}
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            showGPSError={showGPSError}
            gpsError={gpsError}
            gpsLoading={gpsLoading}
            permissionState={permissionState}
            detectLocationProfessional={detectLocationProfessional}
            handleGPSErrorRetry={handleGPSErrorRetry}
            handleGPSErrorDismiss={handleGPSErrorDismiss}
            openMapsForLocation={() => openMapsForLocation(formData.latitude, formData.longitude)}
            copyLocationForDrivers={handleCopyLocationForDrivers}
          />

          {/* Weekly Hours Section */}
          <WeeklyHoursSection
            weeklyHours={weeklyHours}
            updateWeeklyHours={updateWeeklyHours}
            generateWeeklyHoursText={generateWeeklyHoursText}
            isEditing={isEditing}
          />

          {/* Delivery Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Configuración de Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="delivery_time">Tiempo de Preparación (min)</Label>
                  <Input
                    id="delivery_time"
                    type="number"
                    value={formData.delivery_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_time: parseInt(e.target.value) || 0 }))}
                    disabled={!isEditing}
                    min="5"
                    max="120"
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_radius">Radio de Entrega (km)</Label>
                  <Input
                    id="delivery_radius"
                    type="number"
                    value={formData.delivery_radius}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_radius: parseInt(e.target.value) || 0 }))}
                    disabled={!isEditing}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <Label htmlFor="minimum_order">Pedido Mínimo (Q)</Label>
                  <Input
                    id="minimum_order"
                    type="number"
                    value={formData.minimum_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_order: parseInt(e.target.value) || 0 }))}
                    disabled={!isEditing}
                    min="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                Redes Sociales y Web
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={formData.social_media.facebook}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      social_media: { ...prev.social_media, facebook: e.target.value }
                    }))}
                    disabled={!isEditing}
                    placeholder="https://facebook.com/minegocios"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={formData.social_media.instagram}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      social_media: { ...prev.social_media, instagram: e.target.value }
                    }))}
                    disabled={!isEditing}
                    placeholder="https://instagram.com/minegocios"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    WhatsApp
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
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    Sitio Web
                  </Label>
                  <Input
                    id="website"
                    value={formData.social_media.website}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      social_media: { ...prev.social_media, website: e.target.value }
                    }))}
                    disabled={!isEditing}
                    placeholder="https://minegocios.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Business Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-500" />
                Logo del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.business_logo ? (
                  <ImageWithFallback
                    src={profile.business_logo}
                    alt="Logo del negocio"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-16 h-16 text-white" />
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                Esta imagen será visible para todos los clientes
              </p>

              {isEditing && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploadingImage ? 'Subiendo...' : 'Cambiar Logo'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Estado del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">
                    {formData.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {isEditing && (
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                {profile?.is_verified ? (
                  <>
                    <Verified className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-blue-600 font-medium">Negocio Verificado</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-yellow-600">Pendiente de Verificación</span>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Los negocios verificados aparecen primero en las búsquedas
              </p>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Estado de Configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Perfil completado:</span>
                <span className="font-medium">
                  {profile && formData.business_name && formData.business_category ? '85%' : '30%'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ubicación GPS:</span>
                <span className={`font-medium ${locationVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {locationVerified ? '✓ Verificada' : '✗ Pendiente'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sistema GPS:</span>
                <span className="font-medium text-green-600">
                  ✓ Funcionando
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Calificación promedio:</span>
                <span className="font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  4.5
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}