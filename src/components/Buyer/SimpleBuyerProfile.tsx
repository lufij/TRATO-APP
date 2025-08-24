import React, { useState, useEffect } from 'react';
import { MapPin, User, Phone, Check } from 'lucide-react';
import { SimpleLocationPicker } from '../Location/SimpleLocationPicker';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../utils/supabase/client';

interface BuyerLocation {
  address: string;
  latitude?: number;
  longitude?: number;
  verified: boolean;
}

export const SimpleBuyerProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    location: null as BuyerLocation | null
  });
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar datos del perfil al iniciar
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_profile_for_checkout', {
        p_user_id: user?.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const profileData = data[0];
        setProfile({
          name: profileData.name || '',
          phone: profileData.phone || '',
          location: profileData.primary_address ? {
            address: profileData.primary_address,
            latitude: profileData.primary_latitude,
            longitude: profileData.primary_longitude,
            verified: profileData.gps_verified || false
          } : null
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSavedProfile = () => {
    // Mantener como fallback local
    const savedProfile = localStorage.getItem('buyer_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfile(parsed);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Guardar en Supabase
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone,
          primary_address: profile.location?.address,
          primary_latitude: profile.location?.latitude,
          primary_longitude: profile.location?.longitude,
          gps_verified: profile.location?.verified || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      // También guardar en localStorage como respaldo
      localStorage.setItem('buyer_profile', JSON.stringify(profile));
      
      alert('✅ Perfil guardado exitosamente');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLocationConfirmed = (address: string, latitude?: number, longitude?: number) => {
    setProfile(prev => ({
      ...prev,
      location: {
        address,
        latitude,
        longitude,
        verified: true
      }
    }));
    setShowLocationPicker(false);
  };

  const isProfileComplete = profile.name && profile.phone && profile.location?.verified;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Mi Perfil</h2>
        <p className="text-gray-600">Completa tu información para hacer pedidos</p>
      </div>

      {/* Estado del perfil */}
      <div className={`p-4 rounded-lg border-2 ${
        isProfileComplete ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center gap-3">
          {isProfileComplete ? (
            <>
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Perfil Completo</h3>
                <p className="text-sm text-green-600">Listo para hacer pedidos</p>
              </div>
            </>
          ) : (
            <>
              <User className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Completa tu perfil</h3>
                <p className="text-sm text-orange-600">Faltan algunos datos</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Información básica */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Información Personal</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tu Nombre Completo
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Escribe tu nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tu Teléfono
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 1234-5678"
            />
          </div>
        </div>
      </div>

      {/* Ubicación */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Mi Ubicación</h3>
        
        {profile.location?.verified ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Ubicación Confirmada</span>
              </div>
              <p className="text-sm text-green-700">{profile.location.address}</p>
              {profile.location.latitude && (
                <p className="text-xs text-green-600 mt-1">
                  GPS: {profile.location.latitude.toFixed(6)}, {profile.location.longitude?.toFixed(6)}
                </p>
              )}
            </div>
            
            <button
              onClick={() => setShowLocationPicker(true)}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-orange-700"
            >
              Cambiar Ubicación
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">Ubicación Requerida</span>
              </div>
              <p className="text-sm text-orange-700">
                Necesitamos tu ubicación para que los repartidores te encuentren
              </p>
            </div>
            
            <button
              onClick={() => setShowLocationPicker(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700"
            >
              📍 Configurar Mi Ubicación
            </button>
          </div>
        )}
      </div>

      {/* Guardar perfil */}
      <button
        onClick={saveProfile}
        disabled={saving || !profile.name || !profile.phone}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {saving ? 'Guardando...' : 'Guardar Perfil'}
      </button>

      {/* Modal de ubicación */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Configurar Ubicación</h3>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4">
              <SimpleLocationPicker
                onLocationConfirmed={handleLocationConfirmed}
                currentAddress={profile.location?.address || ''}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ayuda */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>🏠 Para pedidos en Gualán, Zacapa</p>
        <p>📱 Tu información está segura y privada</p>
      </div>
    </div>
  );
};
