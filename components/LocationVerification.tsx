import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { MapPin, Camera, Phone, CheckCircle, XCircle, AlertTriangle, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface LocationVerificationProps {
  userRole: 'comprador' | 'vendedor' | 'repartidor';
  onVerificationComplete?: () => void;
}

export function LocationVerification({ userRole, onVerificationComplete }: LocationVerificationProps) {
  const { user } = useAuth();
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>({
    latitude: null,
    longitude: null,
    address: ''
  });
  
  const [businessLocation, setBusinessLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>({
    latitude: null,
    longitude: null,
    address: ''
  });

  const [profile, setProfile] = useState({
    phone: '',
    profileImage: '',
    coverImage: '',
    vehicleType: '',
    licenseNumber: ''
  });

  const [verification, setVerification] = useState({
    locationVerified: false,
    businessLocationVerified: false,
    profileCompleted: false,
    canPublish: false,
    canPurchase: false,
    canWork: false
  });

  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Cargar datos del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (userData) {
        setLocation({
          latitude: userData.latitude,
          longitude: userData.longitude,
          address: userData.address || ''
        });

        setProfile({
          phone: userData.phone || '',
          profileImage: userData.profile_image_url || '',
          coverImage: userData.cover_image_url || '',
          vehicleType: userData.vehicle_type || '',
          licenseNumber: userData.license_number || ''
        });

        setVerification(prev => ({
          ...prev,
          locationVerified: userData.location_verified || false,
          profileCompleted: userData.profile_completed || false
        }));
      }

      // Si es vendedor, cargar datos del negocio
      if (userRole === 'vendedor') {
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (sellerData) {
          setBusinessLocation({
            latitude: sellerData.business_latitude,
            longitude: sellerData.business_longitude,
            address: sellerData.business_address || ''
          });

          setProfile(prev => ({
            ...prev,
            coverImage: sellerData.cover_image_url || ''
          }));

          setVerification(prev => ({
            ...prev,
            businessLocationVerified: sellerData.business_location_verified || false,
            canPublish: sellerData.can_publish_products || false
          }));
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Error al cargar datos del usuario');
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Obtener dirección usando reverse geocoding
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || ''}`
          );
          
          let address = `${latitude}, ${longitude}`;
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              address = data.features[0].place_name;
            }
          }

          setLocation({
            latitude,
            longitude,
            address
          });

          toast.success('Ubicación obtenida correctamente');
        } catch (error) {
          console.error('Error getting address:', error);
          setLocation({
            latitude,
            longitude,
            address: `${latitude}, ${longitude}`
          });
          toast.success('Ubicación obtenida (sin dirección)');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setGettingLocation(false);
        toast.error('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const saveUserLocation = async () => {
    if (!user || !location.latitude || !location.longitude) {
      toast.error('Primero obtén tu ubicación');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('update_user_location', {
        user_id: user.id,
        lat: location.latitude,
        lng: location.longitude,
        user_address: location.address
      });

      if (error) throw error;

      setVerification(prev => ({ ...prev, locationVerified: true }));
      toast.success('Ubicación personal verificada');
      
      await checkVerificationStatus();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Error al guardar ubicación');
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessLocation = async () => {
    if (!user || !businessLocation.latitude || !businessLocation.longitude) {
      toast.error('Primero obtén la ubicación del negocio');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('update_business_location', {
        seller_user_id: user.id,
        lat: businessLocation.latitude,
        lng: businessLocation.longitude,
        business_addr: businessLocation.address
      });

      if (error) throw error;

      setVerification(prev => ({ ...prev, businessLocationVerified: true }));
      toast.success('Ubicación del negocio verificada');
      
      await checkVerificationStatus();
    } catch (error) {
      console.error('Error saving business location:', error);
      toast.error('Error al guardar ubicación del negocio');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const updates: any = {
        phone: profile.phone,
        profile_image_url: profile.profileImage,
        updated_at: new Date().toISOString()
      };

      if (userRole === 'repartidor') {
        updates.vehicle_type = profile.vehicleType;
        updates.license_number = profile.licenseNumber;
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Si es vendedor, actualizar también la imagen de portada
      if (userRole === 'vendedor' && profile.coverImage) {
        const { error: sellerError } = await supabase
          .from('sellers')
          .update({ cover_image_url: profile.coverImage })
          .eq('user_id', user.id);

        if (sellerError) throw sellerError;
      }

      toast.success('Perfil actualizado');
      await checkVerificationStatus();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    if (!user) return;

    try {
      let canDoAction = false;

      if (userRole === 'vendedor') {
        const { data, error } = await supabase.rpc('check_seller_can_publish', {
          seller_user_id: user.id
        });
        if (!error) canDoAction = data;
      } else if (userRole === 'comprador') {
        const { data, error } = await supabase.rpc('check_buyer_can_purchase', {
          buyer_user_id: user.id
        });
        if (!error) canDoAction = data;
      } else if (userRole === 'repartidor') {
        const { data, error } = await supabase.rpc('check_driver_can_work', {
          driver_user_id: user.id
        });
        if (!error) canDoAction = data;
      }

      setVerification(prev => ({
        ...prev,
        canPublish: userRole === 'vendedor' ? canDoAction : prev.canPublish,
        canPurchase: userRole === 'comprador' ? canDoAction : prev.canPurchase,
        canWork: userRole === 'repartidor' ? canDoAction : prev.canWork
      }));

      if (canDoAction && onVerificationComplete) {
        onVerificationComplete();
      }

    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const getRequirements = () => {
    const base = [
      { name: 'Teléfono', completed: !!profile.phone, icon: Phone },
      { name: 'Ubicación verificada', completed: verification.locationVerified, icon: MapPin }
    ];

    if (userRole === 'vendedor') {
      return [
        ...base,
        { name: 'Foto de perfil', completed: !!profile.profileImage, icon: Camera },
        { name: 'Foto de portada', completed: !!profile.coverImage, icon: Camera },
        { name: 'Ubicación del negocio', completed: verification.businessLocationVerified, icon: MapPin }
      ];
    }

    if (userRole === 'repartidor') {
      return [
        ...base,
        { name: 'Tipo de vehículo', completed: !!profile.vehicleType && profile.vehicleType !== 'No especificado', icon: Navigation },
        { name: 'Número de licencia', completed: !!profile.licenseNumber && profile.licenseNumber !== 'No especificado', icon: Camera }
      ];
    }

    return base;
  };

  const getStatusMessage = () => {
    if (userRole === 'vendedor' && verification.canPublish) {
      return { message: '¡Puedes publicar productos!', type: 'success' };
    }
    if (userRole === 'comprador' && verification.canPurchase) {
      return { message: '¡Puedes realizar compras!', type: 'success' };
    }
    if (userRole === 'repartidor' && verification.canWork) {
      return { message: '¡Puedes tomar órdenes!', type: 'success' };
    }
    return { message: 'Completa todos los requisitos', type: 'warning' };
  };

  const requirements = getRequirements();
  const completedRequirements = requirements.filter(req => req.completed).length;
  const statusMessage = getStatusMessage();

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            )}
            <span>Estado de Verificación</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${statusMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              <p className={`font-medium ${statusMessage.type === 'success' ? 'text-green-800' : 'text-orange-800'}`}>
                {statusMessage.message}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {completedRequirements} de {requirements.length} requisitos completados
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {requirements.map((req) => (
                <div key={req.name} className="flex items-center space-x-2 p-2 rounded border">
                  <req.icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{req.name}</span>
                  {req.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <span>Ubicación Personal</span>
            {verification.locationVerified && (
              <Badge variant="default" className="bg-green-500">Verificada</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Dirección</Label>
              <Input
                value={location.address}
                onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Tu dirección"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full"
                variant="outline"
              >
                {gettingLocation ? 'Obteniendo...' : 'Obtener Ubicación Actual'}
              </Button>
            </div>
          </div>
          
          {location.latitude && location.longitude && (
            <div className="p-3 bg-gray-50 rounded border">
              <p className="text-sm text-gray-600">
                Coordenadas: {location.latitude}, {location.longitude}
              </p>
            </div>
          )}
          
          <Button
            onClick={saveUserLocation}
            disabled={loading || !location.latitude || !location.longitude}
            className="w-full"
          >
            {loading ? 'Guardando...' : 'Verificar Ubicación Personal'}
          </Button>
        </CardContent>
      </Card>

      {/* Business Location (only for sellers) */}
      {userRole === 'vendedor' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span>Ubicación del Negocio</span>
              {verification.businessLocationVerified && (
                <Badge variant="default" className="bg-green-500">Verificada</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dirección del Negocio</Label>
                <Input
                  value={businessLocation.address}
                  onChange={(e) => setBusinessLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Dirección de tu negocio"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    getCurrentLocation();
                    // Copy current location to business location
                    if (location.latitude && location.longitude) {
                      setBusinessLocation({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: location.address
                      });
                    }
                  }}
                  disabled={gettingLocation}
                  className="w-full"
                  variant="outline"
                >
                  Usar Ubicación Actual
                </Button>
              </div>
            </div>
            
            <Button
              onClick={saveBusinessLocation}
              disabled={loading || !businessLocation.latitude || !businessLocation.longitude}
              className="w-full"
            >
              {loading ? 'Guardando...' : 'Verificar Ubicación del Negocio'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-purple-500" />
            <span>Información del Perfil</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Teléfono</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+502 1234-5678"
              />
            </div>
            <div>
              <Label>URL de Foto de Perfil</Label>
              <Input
                value={profile.profileImage}
                onChange={(e) => setProfile(prev => ({ ...prev, profileImage: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            
            {userRole === 'vendedor' && (
              <div>
                <Label>URL de Foto de Portada</Label>
                <Input
                  value={profile.coverImage}
                  onChange={(e) => setProfile(prev => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}
            
            {userRole === 'repartidor' && (
              <>
                <div>
                  <Label>Tipo de Vehículo</Label>
                  <Input
                    value={profile.vehicleType}
                    onChange={(e) => setProfile(prev => ({ ...prev, vehicleType: e.target.value }))}
                    placeholder="Motocicleta, Automóvil, Bicicleta..."
                  />
                </div>
                <div>
                  <Label>Número de Licencia</Label>
                  <Input
                    value={profile.licenseNumber}
                    onChange={(e) => setProfile(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    placeholder="M-123456"
                  />
                </div>
              </>
            )}
          </div>
          
          <Button
            onClick={updateProfile}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Actualizando...' : 'Actualizar Perfil'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
