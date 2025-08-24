import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Smartphone, Clock, User, Package } from 'lucide-react';

interface DeliveryInfo {
  driver_info_text: string;
  google_maps_link: string;
  waze_link: string;
}

interface OrderLocation {
  id: string;
  customer_name: string;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  delivery_instructions: string | null;
  customer_phone: string | null;
  total: number;
  status: string;
  created_at: string;
}

interface Props {
  orderId: string;
}

export const DriverDeliveryInfo: React.FC<Props> = ({ orderId }) => {
  const [loading, setLoading] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderLocation | null>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    loadDeliveryInfo();
    getDriverLocation();
  }, [orderId]);

  // Simulación de carga de información - reemplazar con llamada real a Supabase
  const loadDeliveryInfo = async () => {
    try {
      setLoading(true);
      
      // Simulación de llamada a generate_delivery_info_for_driver
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos de ejemplo - reemplazar con datos reales
      const mockOrder: OrderLocation = {
        id: orderId,
        customer_name: 'Juan Pérez',
        delivery_address: 'Calle Principal #123, Gualán, Zacapa',
        delivery_latitude: 15.1234567,
        delivery_longitude: -89.1234567,
        delivery_instructions: 'Casa color verde con portón negro, segunda planta',
        customer_phone: '1234-5678',
        total: 85.50,
        status: 'confirmed',
        created_at: new Date().toISOString()
      };

      const mockDeliveryInfo: DeliveryInfo = {
        driver_info_text: `🚚 INFORMACIÓN DE ENTREGA

📦 PEDIDO: #${orderId}
💰 TOTAL: Q${mockOrder.total}
🍽️ DESDE: Restaurante Central
📍 DESDE: Calle del Comercio #45, Gualán

👤 CLIENTE: ${mockOrder.customer_name}
📱 TELÉFONO: ${mockOrder.customer_phone}
🏠 ENTREGAR EN: ${mockOrder.delivery_address}

📊 COORDENADAS GPS:
• Latitud: ${mockOrder.delivery_latitude}
• Longitud: ${mockOrder.delivery_longitude}

🗺️ NAVEGACIÓN:
• Google Maps: https://www.google.com/maps?q=${mockOrder.delivery_latitude},${mockOrder.delivery_longitude}
• Waze: https://waze.com/ul?ll=${mockOrder.delivery_latitude},${mockOrder.delivery_longitude}

📝 INSTRUCCIONES ESPECIALES:
${mockOrder.delivery_instructions}

✅ Confirma cuando recojas el pedido
✅ Confirma cuando entregues al cliente`,
        google_maps_link: `https://www.google.com/maps?q=${mockOrder.delivery_latitude},${mockOrder.delivery_longitude}`,
        waze_link: `https://waze.com/ul?ll=${mockOrder.delivery_latitude},${mockOrder.delivery_longitude}`
      };

      setOrderDetails(mockOrder);
      setDeliveryInfo(mockDeliveryInfo);
    } catch (error) {
      console.error('Error loading delivery info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDriverLocation = async () => {
    if (!navigator.geolocation) return;

    setGpsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      setDriverLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    } catch (error) {
      console.error('Error getting driver location:', error);
    } finally {
      setGpsLoading(false);
    }
  };

  const openNavigation = (app: 'google' | 'waze') => {
    if (!orderDetails?.delivery_latitude || !orderDetails?.delivery_longitude) {
      alert('Coordenadas GPS no disponibles');
      return;
    }

    let url = '';
    if (app === 'google') {
      url = deliveryInfo?.google_maps_link || '';
    } else if (app === 'waze') {
      url = deliveryInfo?.waze_link || '';
    }

    if (url) {
      window.open(url, '_blank');
    }
  };

  const callCustomer = () => {
    if (orderDetails?.customer_phone) {
      window.open(`tel:${orderDetails.customer_phone}`);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    try {
      // Aquí iría la llamada a la función de actualización de estado
      console.log('Updating order status to:', newStatus);
      alert(`✅ Estado actualizado a: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Pedido no encontrado</h3>
        <p className="text-gray-500">No se pudo cargar la información del pedido</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Información de Entrega</h2>
        <p className="text-gray-600">Pedido #{orderId.slice(-8)}</p>
      </div>

      {/* Order Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Resumen del Pedido</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-600">Total:</span>
            <span className="font-bold text-blue-800">Q{orderDetails.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600">Estado:</span>
            <span className="font-medium text-blue-800 capitalize">{orderDetails.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600">Hora:</span>
            <span className="font-medium text-blue-800">
              {new Date(orderDetails.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <User className="w-6 h-6 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Información del Cliente</h3>
        </div>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-800">{orderDetails.customer_name}</p>
            <p className="text-sm text-gray-600">{orderDetails.customer_phone}</p>
          </div>
          
          <button
            onClick={callCustomer}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Smartphone className="w-5 h-5" />
            Llamar Cliente
          </button>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="w-6 h-6 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Dirección de Entrega</h3>
        </div>
        
        <div className="space-y-3">
          <p className="text-gray-800">{orderDetails.delivery_address}</p>
          
          {orderDetails.delivery_instructions && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">Instrucciones:</p>
              <p className="text-sm text-yellow-700">{orderDetails.delivery_instructions}</p>
            </div>
          )}

          {orderDetails.delivery_latitude && orderDetails.delivery_longitude && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">📍 GPS Disponible</p>
              <div className="text-xs text-green-600 space-y-1">
                <p>Lat: {orderDetails.delivery_latitude}</p>
                <p>Lng: {orderDetails.delivery_longitude}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {orderDetails.delivery_latitude && orderDetails.delivery_longitude && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Navigation className="w-6 h-6 text-gray-600" />
            <h3 className="font-semibold text-gray-800">Navegación</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => openNavigation('google')}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Google Maps
            </button>
            
            <button
              onClick={() => openNavigation('waze')}
              className="bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Waze
            </button>
          </div>
        </div>
      )}

      {/* Status Updates */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Estado del Pedido</h3>
        
        <div className="space-y-3">
          <button
            onClick={() => updateOrderStatus('picked_up')}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            Pedido Recogido
          </button>
          
          <button
            onClick={() => updateOrderStatus('delivered')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5" />
            Pedido Entregado
          </button>
        </div>
      </div>

      {/* Driver Location */}
      {driverLocation && (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Smartphone className="w-4 h-4" />
            <span>Tu ubicación: {driverLocation.lat.toFixed(6)}, {driverLocation.lng.toFixed(6)}</span>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>🚚 Mantén al cliente informado del estado</p>
        <p>📱 Usa GPS para navegación precisa</p>
      </div>
    </div>
  );
};
