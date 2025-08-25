import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, User, Phone, Car, Shield, CheckCircle, AlertCircle, RefreshCw, Upload, Navigation } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

interface DriverProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile_image?: string;
  vehicle_type: string;
  license_number: string;
  is_active: boolean;
  is_verified: boolean;
  is_online: boolean;
  latitude?: number;
  longitude?: number;
  address: string;
  location_verified: boolean;
  rating?: number;
  total_deliveries?: number;
}

export function DriverProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<DriverProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'success' | 'error' | 'denied'>('checking');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.role === 'repartidor') {
      fetchDriverProfile();
    }
  }, [user]);

  const fetchDriverProfile = async () => {
    try {
      setIsLoading(true);

      // Obtener datos del usuario principal
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;

      // Obtener datos específicos del repartidor
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (driverError && driverError.code !== 'PGRST116') {
        console.error('Driver data error:', driverError);
      }

      // Combinar datos
      const combinedData: DriverProfileData = {
        id: userData.id,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        profile_image: userData.profile_image,
        vehicle_type: driverData?.vehicle_type || userData.vehicle_type || '',
        license_number: driverData?.license_number || userData.license_number || '',
        is_active: driverData?.is_active || userData.is_active || false,
        is_verified: driverData?.is_verified || userData.is_verified || false,
        is_online: driverData?.is_online || false,
        latitude: userData.latitude,
        longitude: userData.longitude,
        address: userData.address || '',
        location_verified: userData.location_verified || false,
        rating: driverData?.rating || 0,
        total_deliveries: driverData?.total_deliveries || 0
      };

      setProfileData(combinedData);
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB máximo
      toast.error('La imagen no puede superar los 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);

      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      // Subir imagen a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Actualizar perfil con nueva imagen
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Actualizar estado local
      setProfileData(prev => prev ? { ...prev, profile_image: publicUrl } : prev);
      toast.success('Foto de perfil actualizada');

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const verifyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      setLocationStatus('error');
      return;
    }

    try {
      setIsVerifyingLocation(true);
      setLocationStatus('checking');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });

      const { latitude, longitude } = position.coords;

      // Obtener dirección usando geocoding inverso
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidHJhdG8tYXBwIiwiYSI6ImNsdTR3bTN6MDBxdXEya3A1djVkMHowMHgifQ.xyz'}`
      );
      
      const data = await response.json();
      const address = data.features?.[0]?.place_name || 'Ubicación verificada';

      // Actualizar ubicación en la base de datos
      const { error } = await supabase
        .from('users')
        .update({
          latitude,
          longitude,
          address,
          location_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Actualizar estado local
      setProfileData(prev => prev ? {
        ...prev,
        latitude,
        longitude,
        address,
        location_verified: true
      } : prev);

      setLocationStatus('success');
      toast.success('Ubicación verificada correctamente');

    } catch (error: any) {
      console.error('Error verifying location:', error);
      if (error.code === error.PERMISSION_DENIED) {
        setLocationStatus('denied');
        toast.error('Permiso de ubicación denegado');
      } else {
        setLocationStatus('error');
        toast.error('Error al verificar ubicación');
      }
    } finally {
      setIsVerifyingLocation(false);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!profileData) return;

    // Verificar que el perfil esté completo antes de activarse
    if (!profileData.location_verified) {
      toast.error('Debes verificar tu ubicación antes de activarte');
      return;
    }

    if (!profileData.is_verified) {
      toast.error('Tu cuenta debe estar verificada por un administrador');
      return;
    }

    try {
      const newOnlineStatus = !profileData.is_online;

      // Actualizar estado en la base de datos
      const { error } = await supabase
        .from('drivers')
        .upsert({
          id: user?.id,
          is_online: newOnlineStatus,
          last_location_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      // Actualizar estado local
      setProfileData(prev => prev ? { ...prev, is_online: newOnlineStatus } : prev);

      toast.success(newOnlineStatus ? 'Ahora estás en línea y disponible' : 'Ahora estás fuera de línea');

    } catch (error) {
      console.error('Error toggling online status:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const saveProfileChanges = async () => {
    if (!profileData) return;

    try {
      setIsSaving(true);

      // Actualizar datos principales del usuario
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          vehicle_type: profileData.vehicle_type,
          license_number: profileData.license_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (userError) throw userError;

      // Actualizar datos específicos del repartidor
      const { error: driverError } = await supabase
        .from('drivers')
        .upsert({
          id: user?.id,
          vehicle_type: profileData.vehicle_type,
          license_number: profileData.license_number,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (driverError) throw driverError;

      toast.success('Perfil actualizado correctamente');

    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Error al cargar el perfil</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header con estado en línea */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-4 border-white">
            <AvatarImage src={profileData.profile_image} />
            <AvatarFallback className="bg-white text-orange-600 text-xl font-bold">
              {profileData.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profileData.name}</h1>
            <p className="opacity-90">{profileData.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={profileData.is_online ? "default" : "secondary"} className="bg-white text-orange-600">
                {profileData.is_online ? 'En línea' : 'Fuera de línea'}
              </Badge>
              {profileData.is_verified && (
                <Badge variant="outline" className="border-white text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Toggle de estado en línea */}
        <div className="text-center">
          <Label htmlFor="online-status" className="text-white mb-2 block">
            Estado del repartidor
          </Label>
          <Switch
            id="online-status"
            checked={profileData.is_online}
            onCheckedChange={toggleOnlineStatus}
            disabled={!profileData.location_verified || !profileData.is_verified}
            className="data-[state=checked]:bg-white"
          />
          <p className="text-sm opacity-90 mt-1">
            {profileData.is_online ? 'Disponible para entregas' : 'No disponible'}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Foto de perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Foto de Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={profileData.profile_image} />
                <AvatarFallback className="bg-orange-100 text-orange-600 text-4xl">
                  {profileData.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                variant="outline"
                className="w-full"
              >
                {isUploadingImage ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploadingImage ? 'Subiendo...' : 'Cambiar foto'}
              </Button>

              <p className="text-sm text-gray-500 text-center">
                Esta foto será visible públicamente para compradores y vendedores
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Verificación de ubicación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {profileData.location_verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                )}
                <span className={profileData.location_verified ? 'text-green-600' : 'text-orange-600'}>
                  {profileData.location_verified ? 'Ubicación verificada' : 'Ubicación no verificada'}
                </span>
              </div>

              {profileData.location_verified && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p><strong>Dirección:</strong> {profileData.address}</p>
                  {profileData.latitude && profileData.longitude && (
                    <p><strong>Coordenadas:</strong> {profileData.latitude.toFixed(6)}, {profileData.longitude.toFixed(6)}</p>
                  )}
                </div>
              )}

              <Button 
                onClick={verifyLocation} 
                disabled={isVerifyingLocation}
                className="w-full"
                variant={profileData.location_verified ? "outline" : "default"}
              >
                {isVerifyingLocation ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 mr-2" />
                )}
                {isVerifyingLocation ? 'Verificando...' : 
                 profileData.location_verified ? 'Actualizar ubicación' : 'Verificar ubicación'}
              </Button>

              <p className="text-sm text-gray-500">
                Tu ubicación es necesaria para recibir entregas cercanas y para que los clientes puedan seguir su pedido
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                placeholder="Número de teléfono"
              />
            </div>

            <div>
              <Label htmlFor="vehicle">Tipo de vehículo *</Label>
              <select
                id="vehicle"
                value={profileData.vehicle_type}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, vehicle_type: e.target.value } : prev)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Seleccionar vehículo</option>
                <option value="Moto">Motocicleta</option>
                <option value="Bicicleta">Bicicleta</option>
                <option value="Carro">Automóvil</option>
                <option value="Camioneta">Camioneta</option>
                <option value="A pie">A pie</option>
              </select>
            </div>

            <div>
              <Label htmlFor="license">Número de licencia *</Label>
              <Input
                id="license"
                value={profileData.license_number}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, license_number: e.target.value } : prev)}
                placeholder="Número de licencia de conducir"
              />
            </div>
          </div>

          <Button 
            onClick={saveProfileChanges}
            disabled={isSaving}
            className="w-full md:w-auto"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-orange-600">{profileData.total_deliveries || 0}</h3>
              <p className="text-gray-600">Entregas completadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-orange-600">
                {profileData.rating ? profileData.rating.toFixed(1) : '0.0'}
              </h3>
              <p className="text-gray-600">Calificación promedio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-orange-600">
                {profileData.is_verified ? 'Verificado' : 'Pendiente'}
              </h3>
              <p className="text-gray-600">Estado de verificación</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de configuración */}
      {(!profileData.location_verified || !profileData.is_verified) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800">Configuración pendiente</h4>
                <ul className="text-sm text-orange-700 mt-1 space-y-1">
                  {!profileData.location_verified && (
                    <li>• Debes verificar tu ubicación para recibir entregas</li>
                  )}
                  {!profileData.is_verified && (
                    <li>• Tu cuenta debe ser verificada por un administrador</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
