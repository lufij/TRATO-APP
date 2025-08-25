import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Camera, MapPin, User, Phone, Car, Star, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DriverProfileData {
  name: string;
  phone: string;
  profile_image: string | null;
  vehicle_type: string;
  license_number: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  location_verified: boolean;
  is_active: boolean;
}

interface DriverStats {
  is_online: boolean;
  rating: number;
  total_deliveries: number;
}

export function DriverProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<DriverProfileData>({
    name: '',
    phone: '',
    profile_image: null,
    vehicle_type: '',
    license_number: '',
    latitude: null,
    longitude: null,
    address: '',
    location_verified: false,
    is_active: false
  });

  const [driverStats, setDriverStats] = useState<DriverStats>({
    is_online: false,
    rating: 0,
    total_deliveries: 0
  });

  // Cargar datos del perfil
  useEffect(() => {
    if (user) {
      loadDriverProfile();
      
      // Suscripción en tiempo real para cambios en drivers
      const subscription = supabase
        .channel('driver-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'drivers',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('Driver status changed:', payload);
            if (payload.new) {
              setDriverStats(prev => ({
                ...prev,
                is_online: payload.new.is_online || false,
                rating: payload.new.rating || 0,
                total_deliveries: payload.new.total_deliveries || 0
              }));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadDriverProfile = async () => {
    try {
      setLoading(true);

      // Cargar datos del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;

      // Cargar estadísticas del repartidor
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('is_online, rating, total_deliveries')
        .eq('id', user?.id)
        .single();

      // Si no existe registro en drivers, crearlo
      if (driverError && driverError.code === 'PGRST116') {
        await supabase
          .from('drivers')
          .insert({
            id: user?.id,
            is_online: false,
            rating: 0,
            total_deliveries: 0
          });
        
        setDriverStats({
          is_online: false,
          rating: 0,
          total_deliveries: 0
        });
      } else if (driverData) {
        setDriverStats(driverData);
      }

      setProfileData({
        name: userData.name || '',
        phone: userData.phone || '',
        profile_image: userData.profile_image,
        vehicle_type: userData.vehicle_type || '',
        license_number: userData.license_number || '',
        latitude: userData.latitude,
        longitude: userData.longitude,
        address: userData.address || '',
        location_verified: userData.location_verified || false,
        is_active: userData.is_active || false
      });

    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  // Subir imagen de perfil
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingImage(true);

      // Validar imagen
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes');
        return;
      }

      // Redimensionar imagen
      const resizedBlob = await resizeImage(file, 400, 400, 0.9);
      const fileName = `${user.id}/profile-${Date.now()}.jpg`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, resizedBlob, { upsert: true });

      if (uploadError) {
        toast.error('Error al subir la imagen');
        return;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Actualizar en base de datos
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) {
        toast.error('Error al guardar la imagen');
        return;
      }

      setProfileData(prev => ({ ...prev, profile_image: urlData.publicUrl }));
      toast.success('Foto de perfil actualizada');

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  // Redimensionar imagen
  const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.9): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
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
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Verificar ubicación GPS
  const verifyLocation = async () => {
    try {
      setVerifyingLocation(true);

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;

      // Actualizar ubicación usando la función de la base de datos
      const { error } = await supabase.rpc('update_driver_location', {
        p_driver_id: user?.id,
        p_latitude: latitude,
        p_longitude: longitude
      });

      if (error) throw error;

      setProfileData(prev => ({
        ...prev,
        latitude,
        longitude,
        location_verified: true
      }));

      toast.success('Ubicación verificada correctamente');

    } catch (error) {
      console.error('Error verifying location:', error);
      toast.error('Error al verificar la ubicación');
    } finally {
      setVerifyingLocation(false);
    }
  };

  // Toggle estado online/offline
  const toggleOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;

    try {
      console.log('Toggling online status to:', isOnline);
      
      // Actualizar estado local inmediatamente para retroalimentación visual
      setDriverStats(prev => ({ ...prev, is_online: isOnline }));
      setProfileData(prev => ({ ...prev, is_active: isOnline }));

      // Primero actualizar en la tabla drivers (is_online)
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .update({ 
          is_online: isOnline,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (driverError) {
        console.error('Driver update error:', driverError);
        throw driverError;
      }

      // También actualizar en users (is_active) para mantener consistencia
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ 
          is_active: isOnline,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (userError) {
        console.error('User update error:', userError);
        throw userError;
      }

      console.log('Status updated successfully - Driver:', driverData, 'User:', userData);
      
      toast.success(
        isOnline 
          ? '✅ Ahora estás EN LÍNEA y disponible para recibir pedidos' 
          : '⏸️ Ahora estás DESCONECTADO. No recibirás nuevos pedidos'
      );

    } catch (error) {
      console.error('Error updating online status:', error);
      
      // Revertir estado local si hay error
      setDriverStats(prev => ({ ...prev, is_online: !isOnline }));
      setProfileData(prev => ({ ...prev, is_active: !isOnline }));
      
      toast.error(`Error al actualizar el estado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Guardar perfil
  const saveProfile = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          vehicle_type: profileData.vehicle_type,
          license_number: profileData.license_number,
          address: profileData.address,
          is_active: profileData.is_active
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Perfil actualizado correctamente');

    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header con foto de perfil */}
      <Card>
        <CardHeader className="text-center">
          <div className="relative mx-auto mb-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-green-500 p-1">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {profileData.profile_image ? (
                  <img 
                    src={profileData.profile_image} 
                    alt="Foto de perfil"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>
            
            <Button
              size="sm"
              className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <CardTitle className="text-2xl">{profileData.name || 'Repartidor'}</CardTitle>
          
          {/* Estado online/offline PROMINENTE Y FUNCIONAL */}
          <div className="mt-6">
            {/* Botón principal de estado */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${driverStats.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium text-gray-600">Estado:</span>
                </div>
                <Switch
                  checked={driverStats.is_online}
                  onCheckedChange={toggleOnlineStatus}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                />
              </div>
              
              {/* Badge grande y prominente */}
              <Badge 
                variant={driverStats.is_online ? "default" : "secondary"}
                className={`px-6 py-2 text-lg font-bold ${
                  driverStats.is_online 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-gray-400 hover:bg-gray-500 text-white"
                }`}
              >
                {driverStats.is_online ? "🟢 EN LÍNEA" : "⚫ DESCONECTADO"}
              </Badge>
              
              {/* Mensaje explicativo */}
              <p className="text-sm text-center text-gray-600 max-w-sm">
                {driverStats.is_online 
                  ? "Estás visible para recibir nuevos pedidos. Los compradores pueden verte en línea." 
                  : "Actívate para comenzar a recibir pedidos. No apareces en la lista de repartidores disponibles."
                }
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-lg">{driverStats.rating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-gray-500">Calificación</p>
            </div>
            <div className="text-center">
              <span className="font-bold text-lg">{driverStats.total_deliveries}</span>
              <p className="text-sm text-gray-500">Entregas</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Información personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Tu nombre completo"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Tu número de teléfono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del vehículo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-orange-500" />
            Información del Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_type">Tipo de vehículo</Label>
              <Select 
                value={profileData.vehicle_type} 
                onValueChange={(value) => setProfileData(prev => ({ ...prev, vehicle_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu vehículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moto">Motocicleta</SelectItem>
                  <SelectItem value="bicicleta">Bicicleta</SelectItem>
                  <SelectItem value="auto">Automóvil</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="license">Número de licencia</Label>
              <Input
                id="license"
                value={profileData.license_number}
                onChange={(e) => setProfileData(prev => ({ ...prev, license_number: e.target.value }))}
                placeholder="Número de licencia"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={profileData.address}
              onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Tu dirección completa"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {profileData.location_verified ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="text-sm">
                {profileData.location_verified ? 'Ubicación verificada' : 'Ubicación sin verificar'}
              </span>
            </div>
            
            <Button
              onClick={verifyLocation}
              disabled={verifyingLocation}
              size="sm"
              variant="outline"
            >
              {verifyingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              Verificar GPS
            </Button>
          </div>

          {profileData.latitude && profileData.longitude && (
            <div className="text-xs text-gray-500">
              Coordenadas: {profileData.latitude.toFixed(6)}, {profileData.longitude.toFixed(6)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <Button
        onClick={saveProfile}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Upload className="w-5 h-5 mr-2" />
        )}
        Guardar Perfil
      </Button>

    </div>
  );
}