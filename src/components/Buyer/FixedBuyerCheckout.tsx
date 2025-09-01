import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { toast } from 'react-hot-toast';
import { CheckCircle, Package, MapPin, User, CreditCard, AlertCircle } from 'lucide-react';

interface CheckoutData {
  delivery_address: string;
  customer_notes: string;
  phone_number: string;
  customer_name: string;
  payment_method: string;
}

interface Props {
  onComplete: () => void;
}

export const FixedBuyerCheckout: React.FC<Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState<'info' | 'review' | 'confirming' | 'success'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    delivery_address: '',
    customer_notes: '',
    phone_number: '',
    customer_name: '',
    payment_method: 'cash'
  });

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, phone, primary_address, delivery_instructions')
        .eq('id', user?.id)
        .single();

      if (data && !error) {
        setCheckoutData(prev => ({
          ...prev,
          customer_name: data.name || '',
          phone_number: data.phone || '',
          delivery_address: data.primary_address || '',
          customer_notes: data.delivery_instructions || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const calculateTotals = () => {
    const subtotal = getCartTotal();
    const deliveryFee = 15.00; // Fee fijo de entrega
    const total = subtotal + deliveryFee;
    
    return { subtotal, deliveryFee, total };
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!checkoutData.customer_name.trim()) {
      errors.push('Nombre completo es requerido');
    }
    
    if (!checkoutData.phone_number.trim()) {
      errors.push('Teléfono es requerido');
    }
    
    if (!checkoutData.delivery_address.trim()) {
      errors.push('Dirección de entrega es requerida');
    }
    
    if (cartItems.length === 0) {
      errors.push('El carrito está vacío');
    }
    
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return false;
    }
    
    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setCurrentStep('confirming');
    
    try {
      const { subtotal, deliveryFee, total } = calculateTotals();
      
      // Obtener seller_id del primer item del carrito
      const sellerId = cartItems[0]?.seller_id || cartItems[0]?.product?.seller_id;
      
      if (!sellerId) {
        throw new Error('No se pudo identificar el vendedor');
      }

      // Preparar items para la función de checkout
      const orderItems = cartItems.map((item: any) => ({
        product_id: item.product_id || null,
        product_name: item.product?.name || item.name || 'Producto',
        product_image: item.product?.image_url || item.image_url || '',
        price: parseFloat(item.product?.price || item.price || 0),
        unit_price: parseFloat(item.product?.price || item.price || 0),
        quantity: parseInt(item.quantity || 1),
        product_type: item.product_type || 'regular', // ✅ CRÍTICO: Incluir product_type
        notes: ''
      }));

      // Llamar a la función segura de checkout
      const { data, error } = await supabase.rpc('complete_checkout', {
        p_buyer_id: user?.id,
        p_seller_id: sellerId,
        p_subtotal: subtotal,
        p_delivery_fee: deliveryFee,
        p_total: total,
        p_delivery_type: 'delivery',
        p_delivery_address: checkoutData.delivery_address,
        p_customer_notes: checkoutData.customer_notes,
        p_phone_number: checkoutData.phone_number,
        p_customer_name: checkoutData.customer_name,
        p_payment_method: checkoutData.payment_method,
        p_items: JSON.stringify(orderItems)
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const result = data[0];
        
        if (!result.success) {
          throw new Error(result.message || 'Error al crear el pedido');
        }

        setOrderId(result.order_id);
        
        // Crear notificación para el vendedor
        await supabase
          .from('notifications')
          .insert({
            recipient_id: sellerId,
            type: 'new_order',
            title: '🎉 Nuevo pedido recibido',
            message: `Pedido de Q${total.toFixed(2)} de ${checkoutData.customer_name}`,
            data: {
              order_id: result.order_id,
              customer_name: checkoutData.customer_name,
              total: total
            }
          });

        // Limpiar carrito
        await clearCart();
        
        setCurrentStep('success');
        toast.success('¡Pedido creado exitosamente!');
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        throw new Error('No se recibió respuesta del servidor');
      }

    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Error al crear el pedido. Intenta de nuevo.');
      setCurrentStep('review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, deliveryFee, total } = calculateTotals();

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Carrito vacío</h3>
        <p className="text-gray-500">Agrega productos antes de hacer checkout</p>
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-800 mb-2">¡Pedido Confirmado!</h3>
        <p className="text-green-600 mb-4">Tu pedido #{orderId?.slice(-8)} ha sido enviado al restaurante</p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">
            Recibirás notificaciones sobre el estado de tu pedido
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'confirming') {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Procesando pedido...</h3>
        <p className="text-gray-600">Por favor espera un momento</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Finalizar Pedido</h2>
        <p className="text-gray-600">Revisa y confirma tu pedido</p>
      </div>

      {currentStep === 'info' && (
        <>
          {/* Información Personal */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Información Personal</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={checkoutData.customer_name}
                  onChange={(e) => setCheckoutData(prev => ({ ...prev, customer_name: e.target.value }))}
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
                  value={checkoutData.phone_number}
                  onChange={(e) => setCheckoutData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234-5678"
                />
              </div>
            </div>
          </div>

          {/* Dirección de Entrega */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Dirección de Entrega</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Completa *
                </label>
                <textarea
                  value={checkoutData.delivery_address}
                  onChange={(e) => setCheckoutData(prev => ({ ...prev, delivery_address: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Calle, número, colonia, referencias..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instrucciones Adicionales
                </label>
                <textarea
                  value={checkoutData.customer_notes}
                  onChange={(e) => setCheckoutData(prev => ({ ...prev, customer_notes: e.target.value }))}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Color de casa, referencias adicionales..."
                />
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Método de Pago</h3>
            </div>
            
            <select
              value={checkoutData.payment_method}
              onChange={(e) => setCheckoutData(prev => ({ ...prev, payment_method: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          <button
            onClick={() => setCurrentStep('review')}
            disabled={!checkoutData.customer_name || !checkoutData.phone_number || !checkoutData.delivery_address}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Revisar Pedido
          </button>
        </>
      )}

      {currentStep === 'review' && (
        <>
          {/* Resumen del Pedido */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Resumen del Pedido</h3>
            
            <div className="space-y-3">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.product?.name || item.name}</p>
                    <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  </div>
                  <p className="font-medium">Q{((item.product?.price || item.price || 0) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              
              <hr className="border-gray-200" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>Q{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Entrega:</span>
                  <span>Q{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>Q{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Información de Entrega */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Entregar a:</h4>
            <p className="font-medium">{checkoutData.customer_name}</p>
            <p className="text-sm text-gray-600">{checkoutData.phone_number}</p>
            <p className="text-sm text-gray-600 mt-1">{checkoutData.delivery_address}</p>
            {checkoutData.customer_notes && (
              <p className="text-sm text-gray-600 mt-1 italic">{checkoutData.customer_notes}</p>
            )}
            <p className="text-sm text-gray-600 mt-1">Pago: {checkoutData.payment_method === 'cash' ? 'Efectivo' : checkoutData.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep('info')}
              className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-600"
            >
              Volver
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="flex-2 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Procesando...' : `Confirmar Q${total.toFixed(2)}`}
            </button>
          </div>
        </>
      )}

      {/* Mensaje de ayuda */}
      <div className="text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4" />
          <span>¿Necesitas ayuda?</span>
        </div>
        <p>Verifica que todos los datos sean correctos antes de confirmar</p>
      </div>
    </div>
  );
};
