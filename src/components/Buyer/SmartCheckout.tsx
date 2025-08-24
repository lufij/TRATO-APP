import React, { useState, useEffect } from 'react';
import { MapPin, Check, AlertTriangle, Smartphone, Navigation, Save, ShoppingCart } from 'lucide-react';

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

interface CheckoutData {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryInstructions: string;
  locationAccuracy: number | null;
  useProfileLocation: boolean;
}

interface Props {
  onCheckoutDataReady: (data: CheckoutData) => void;
  cartTotal: number;
  cartItems: number;
}

export const SmartCheckout: React.FC<Props> = ({ 
  onCheckoutDataReady, 
  cartTotal, 
  cartItems 
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentGPS, setCurrentGPS] = useState<GPSLocation | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryInstructions: '',
    useProfileLocation: true
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (profile && profile.has_complete_profile) {
      // Auto-llenar con datos del perfil
      setFormData({
        customerName: profile.name || '',
        customerPhone: profile.phone || '',
        deliveryAddress: profile.primary_address || '',
        deliveryInstructions: profile.delivery_instructions || '',
        useProfileLocation: true
      });
      
      // Si el perfil está completo, preparar datos automáticamente
      prepareCheckoutData(true);
    }
  }, [profile]);

  // Simulación de carga de perfil - reemplazar con llamada real a Supabase
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Simulación de llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos de ejemplo - reemplazar con datos reales
      const mockProfile: UserProfile = {
        user_id: '123',
        name: 'Juan Pérez',
        email: 'juan@email.com',
        phone: '1234-5678',
        primary_address: 'Calle Principal #123, Gualán, Zacapa',
        primary_latitude: 15.1234567,
        primary_longitude: -89.1234567,
        gps_verified: true,
        delivery_instructions: 'Casa color verde con portón negro',
        location_accuracy: 10,
        has_complete_profile: true
      };
      
      setProfile(mockProfile);
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
      setFormData(prev => ({ ...prev, useProfileLocation: false }));
      alert('📍 Ubicación GPS obtenida. Por favor ingresa tu dirección.');
    } catch (error) {
      console.error('Error getting GPS:', error);
      alert('No se pudo obtener la ubicación. Verifica que el GPS esté activado.');
    } finally {
      setGpsLoading(false);
    }
  };

  const prepareCheckoutData = (useProfile: boolean = formData.useProfileLocation) => {
    const checkoutData: CheckoutData = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      deliveryAddress: formData.deliveryAddress,
      deliveryLatitude: useProfile && profile ? profile.primary_latitude : currentGPS?.latitude || null,
      deliveryLongitude: useProfile && profile ? profile.primary_longitude : currentGPS?.longitude || null,
      deliveryInstructions: formData.deliveryInstructions,
      locationAccuracy: useProfile && profile ? profile.location_accuracy : currentGPS?.accuracy || null,
      useProfileLocation: useProfile
    };

    onCheckoutDataReady(checkoutData);
  };

  const handleProceedToPayment = () => {
    if (!formData.customerName || !formData.customerPhone || !formData.deliveryAddress) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    prepareCheckoutData();
    setCheckoutStep(2);
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {checkoutStep === 1 ? 'Información de Entrega' : 'Confirmar Pedido'}
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <ShoppingCart className="w-5 h-5" />
          <span>{cartItems} productos • Q{cartTotal.toFixed(2)}</span>
        </div>
      </div>

      {checkoutStep === 1 ? (
        <>
          {/* Profile Status */}
          {profile && (
            <div className={`p-4 rounded-lg border-2 ${
              profile.has_complete_profile 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-3">
                {profile.has_complete_profile ? (
                  <>
                    <Check className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">¡Datos Guardados!</h3>
                      <p className="text-sm text-green-600">Usando tu información de perfil</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-orange-800">Completa tu información</h3>
                      <p className="text-sm text-orange-600">Para entregas más rápidas</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Delivery Information */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Datos de Entrega</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
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
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de Entrega *
                </label>
                <textarea
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Calle, número, colonia, referencias..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrucciones Especiales
                </label>
                <textarea
                  value={formData.deliveryInstructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Color de casa, referencias adicionales..."
                />
              </div>
            </div>
          </div>

          {/* GPS Location */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Ubicación GPS</h3>
            
            {profile?.gps_verified && formData.useProfileLocation ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">Ubicación del Perfil</p>
                    <p className="text-sm text-green-600 mt-1">
                      Precisión: {profile.location_accuracy}m
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={getCurrentLocation}
                  disabled={gpsLoading}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" />
                  {gpsLoading ? 'Obteniendo GPS...' : 'Usar Ubicación Actual'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentGPS ? (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800">GPS Obtenido</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Precisión: {Math.round(currentGPS.accuracy)}m
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <Smartphone className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-800">GPS Recomendado</p>
                      <p className="text-sm text-orange-600 mt-1">
                        Ayuda al repartidor a encontrarte fácilmente
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={getCurrentLocation}
                  disabled={gpsLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  {gpsLoading ? 'Obteniendo GPS...' : 'Obtener Mi Ubicación'}
                </button>
              </div>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleProceedToPayment}
            disabled={!formData.customerName || !formData.customerPhone || !formData.deliveryAddress}
            className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
          >
            Continuar al Pago • Q{cartTotal.toFixed(2)}
          </button>
        </>
      ) : (
        /* Step 2: Order Confirmation */
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Resumen del Pedido</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{formData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Teléfono:</span>
                <span className="font-medium">{formData.customerPhone}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Dirección:</span>
                <span className="font-medium text-right flex-1 ml-4">{formData.deliveryAddress}</span>
              </div>
              {formData.deliveryInstructions && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Instrucciones:</span>
                  <span className="font-medium text-right flex-1 ml-4">{formData.deliveryInstructions}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg">Q{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCheckoutStep(1)}
              className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-600"
            >
              Volver
            </button>
            <button
              onClick={() => {
                prepareCheckoutData();
                alert('🎉 Pedido confirmado! Implementar lógica de pago aquí.');
              }}
              className="flex-2 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700"
            >
              Confirmar Pedido
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>🎯 El GPS ayuda a entregas más precisas</p>
        <p>⚡ Completa tu perfil para compras más rápidas</p>
      </div>
    </div>
  );
};
