import React, { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, Phone, User, Clock, Check } from 'lucide-react';
import { SimpleBuyerProfile } from '../Buyer/SimpleBuyerProfile';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../utils/supabase/client';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface BuyerInfo {
  name: string;
  phone: string;
  address: string;
  gpsVerified: boolean;
}

export const SimpleCheckoutFlow: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'cart' | 'profile' | 'confirm' | 'success'>('cart');
  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Cargar perfil del usuario al iniciar
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
        setUserProfile(profileData);
        
        // Autocompletar información del comprador
        setBuyerInfo({
          name: profileData.name || '',
          phone: profileData.phone || '',
          address: profileData.primary_address || '',
          gpsVerified: profileData.gps_verified || false
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Simulación del carrito - reemplazar con datos reales
  const [cartItems] = useState<CartItem[]>([
    { id: '1', name: 'Pizza Margherita', price: 65, quantity: 1 },
    { id: '2', name: 'Coca Cola 600ml', price: 12, quantity: 2 }
  ]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const delivery = 15;
  const total = subtotal + delivery;

  const handleProfileComplete = (profile: BuyerInfo) => {
    setBuyerInfo(profile);
    setCurrentStep('confirm');
  };

  const handleConfirmOrder = async () => {
    if (!buyerInfo) return;
    
    setProcessing(true);
    try {
      // Simular procesamiento del pedido
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aquí iría la lógica real del pedido:
      // const order = await supabase.rpc('create_order_safe', {
      //   buyer_name: buyerInfo.name,
      //   buyer_phone: buyerInfo.phone,
      //   delivery_address: buyerInfo.address,
      //   items: cartItems,
      //   total_amount: total
      // });
      
      setCurrentStep('success');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  // Paso 1: Revisar Carrito
  if (currentStep === 'cart') {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Tu Pedido</h2>
          <p className="text-gray-600">Revisa los productos antes de continuar</p>
        </div>

        {/* Items del carrito */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Productos
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {cartItems.map((item) => (
              <div key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{item.name}</h4>
                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">Q{item.price * item.quantity}</p>
                  <p className="text-sm text-gray-500">Q{item.price} c/u</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Totales */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Q{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega:</span>
                <span>Q{delivery}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span>Q{total}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCurrentStep('profile')}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700"
        >
          Continuar con Información →
        </button>

        <div className="text-center text-sm text-gray-500">
          <p>🕐 Tiempo estimado de entrega: 30-45 minutos</p>
        </div>
      </div>
    );
  }

  // Paso 2: Información del Comprador
  if (currentStep === 'profile') {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setCurrentStep('cart')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Volver al carrito
          </button>
        </div>

        <SimpleBuyerProfile />

        {/* Este componente tendría que comunicarse con SimpleBuyerProfile */}
        <div className="mt-6">
          <button
            onClick={() => {
              if (userProfile) {
                handleProfileComplete({
                  name: userProfile.name || '',
                  phone: userProfile.phone || '',
                  address: userProfile.primary_address || '',
                  gpsVerified: userProfile.gps_verified || false
                });
              } else {
                // Si no hay perfil, usar datos básicos
                handleProfileComplete({
                  name: user?.name || '',
                  phone: '',
                  address: '',
                  gpsVerified: false
                });
              }
            }}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700"
          >
            Confirmar Información →
          </button>
        </div>
      </div>
    );
  }

  // Paso 3: Confirmación Final
  if (currentStep === 'confirm') {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirmar Pedido</h2>
          <p className="text-gray-600">Revisa todos los datos antes de confirmar</p>
        </div>

        {/* Resumen del pedido */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Resumen del Pedido</h3>
          <div className="space-y-2 text-sm">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>Q{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 font-semibold">
              <div className="flex justify-between">
                <span>Total:</span>
                <span>Q{total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Información de entrega */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Información de Entrega</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{buyerInfo?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{buyerInfo?.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{buyerInfo?.address}</span>
            </div>
            {buyerInfo?.gpsVerified && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Ubicación GPS verificada</span>
              </div>
            )}
          </div>
        </div>

        {/* Tiempo estimado */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-800">Tiempo Estimado</h3>
              <p className="text-sm text-blue-600">30-45 minutos después de confirmar</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setCurrentStep('profile')}
            className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400"
          >
            ← Modificar Información
          </button>
          
          <button
            onClick={handleConfirmOrder}
            disabled={processing}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            {processing ? 'Procesando...' : '✅ Confirmar Pedido'}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Al confirmar aceptas nuestros términos de servicio</p>
        </div>
      </div>
    );
  }

  // Paso 4: Éxito
  if (currentStep === 'success') {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-600" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido Confirmado!</h2>
          <p className="text-gray-600">Tu pedido está siendo preparado</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Número de Pedido</h3>
          <p className="text-2xl font-bold text-green-600">#TRT{Date.now().toString().slice(-6)}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">¿Qué sigue?</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>✅ Preparación del pedido (15-20 min)</p>
            <p>🚗 Repartidor en camino (10-15 min)</p>
            <p>📞 Te llamaremos cuando esté cerca</p>
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentStep('cart');
            setBuyerInfo(null);
          }}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700"
        >
          Hacer Otro Pedido
        </button>

        <div className="text-sm text-gray-500">
          <p>💬 Recibirás actualizaciones por WhatsApp</p>
          <p>📍 GPS activo para seguimiento del repartidor</p>
        </div>
      </div>
    );
  }

  return null;
};
