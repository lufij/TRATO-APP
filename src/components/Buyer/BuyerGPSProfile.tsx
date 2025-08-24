import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LocationSearch } from '../Location/LocationSearch';
import { ExactLocationPicker } from '../Location/ExactLocationPicker';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Check, AlertTriangle, Smartphone, Navigation, Save } from 'lucide-react';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  primary_address: string;
  primary_latitude: number;
  primary_longitude: number;
  gps_verified: boolean;
  delivery_instructions: string;
  location_accuracy: number;
  has_complete_profile: boolean;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const BuyerGPSProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentGPS, setCurrentGPS] = useState<GPSLocation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    primary_address: '',
    delivery_instructions: ''
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_user_profile_for_checkout', {
        p_user_id: user?.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const profileData = data[0];
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          phone: profileData.phone || '',
          primary_address: profileData.primary_address || '',
          delivery_instructions: profileData.delivery_instructions || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('GPS no está disponible en este dispositivo');
      return;
    }

    setGpsLoading(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const gpsData: GPSLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      setCurrentGPS(gpsData);
      setShowLocationPicker(true);
    } catch (error) {
      console.error('Error getting GPS:', error);
      alert('No se pudo obtener la ubicación. Verifica que el GPS esté activado.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleLocationSelect = async (address: string, lat: number, lng: number) => {
    try {
      setSaving(true);

      const { data, error } = await supabase.rpc('update_user_location', {
        p_user_id: user?.id,
        p_latitude: lat,
        p_longitude: lng,
        p_address: address,
        p_accuracy: currentGPS?.accuracy || null,
        p_delivery_instructions: formData.delivery_instructions || null
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        setFormData(prev => ({ ...prev, primary_address: address }));
        setShowLocationPicker(false);
        await loadUserProfile();
        alert('🎉 Ubicación GPS guardada exitosamente');
      } else {
        throw new Error(data?.[0]?.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Error al guardar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  const saveBasicInfo = async () => {
    try {
      setSaving(true);
      
      // Actualizar información básica
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          delivery_instructions: formData.delivery_instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await loadUserProfile();
      alert('✅ Información guardada exitosamente');
    } catch (error) {
      console.error('Error saving info:', error);
      alert('Error al guardar la información');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Mi Perfil</h2>
        <p className="text-gray-600">Configura tu información para entregas más rápidas</p>
      </div>

      {/* Profile Status */}
      <div className={`p-4 rounded-lg border-2 ${
        profile?.has_complete_profile 
          ? 'bg-green-50 border-green-200' 
          : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center gap-3">
          {profile?.has_complete_profile ? (
            <>
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Perfil Completo</h3>
                <p className="text-sm text-green-600">Listo para entregas rápidas</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Perfil Incompleto</h3>
                <p className="text-sm text-orange-600">Completa tu información para hacer pedidos</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Información Personal</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instrucciones de Entrega
            </label>
            <textarea
              value={formData.delivery_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_instructions: e.target.value }))}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Casa color verde, portón negro, segunda planta..."
            />
          </div>

          <button
            onClick={saveBasicInfo}
            disabled={saving || !formData.name || !formData.phone}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Información'}
          </button>
        </div>
      </div>

      {/* GPS Location */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Ubicación de Entrega</h3>
        
        {profile?.gps_verified ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-800">Ubicación Verificada</p>
                <p className="text-sm text-green-600 mt-1">{profile.primary_address}</p>
                {profile.location_accuracy && (
                  <p className="text-xs text-green-500 mt-1">
                    Precisión: {profile.location_accuracy}m
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" />
              {gpsLoading ? 'Obteniendo GPS...' : 'Actualizar Ubicación'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <Smartphone className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">GPS Requerido</p>
                <p className="text-sm text-orange-600 mt-1">
                  Necesitamos tu ubicación GPS para entregas precisas
                </p>
              </div>
            </div>

            <button
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              {gpsLoading ? 'Obteniendo GPS...' : 'Activar Ubicación GPS'}
            </button>
          </div>
        )}
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && currentGPS && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Confirma tu Ubicación</h3>
              <p className="text-sm text-gray-600 mt-1">
                Ajusta el marcador si es necesario
              </p>
            </div>
            
            <div className="p-4">
              <ExactLocationPicker
                initialLat={currentGPS.latitude}
                initialLng={currentGPS.longitude}
                onLocationSelect={handleLocationSelect}
                onCancel={() => setShowLocationPicker(false)}
                loading={saving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>✨ Completa tu perfil para entregas más rápidas</p>
        <p>🎯 El GPS ayuda a los repartidores a encontrarte fácilmente</p>
      </div>
    </div>
  );
};
