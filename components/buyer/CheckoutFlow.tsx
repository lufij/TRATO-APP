import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useOrder, CreateOrderRequest } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { AlertCircle, ShoppingCart, User, Phone, MapPin, CreditCard, Clock, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { processImageUrl } from '../../utils/imageUtils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { DeliveryTypeSelector } from './DeliveryTypeSelector';
import { AddressSelector } from './AddressSelector';
import { getEstimatedTime } from '../../utils/orderUtils';

interface CheckoutFlowProps {
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
}

export function CheckoutFlow({ onBack, onOrderCreated }: CheckoutFlowProps) {
  const { user } = useAuth();
  const { items, getCartTotal, getCartItemCount } = useCart();
  const { createOrder, loading } = useOrder();

  const [deliveryType, setDeliveryType] = useState<'pickup' | 'dine-in' | 'delivery'>('pickup');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const subtotal = getCartTotal();
  const deliveryFee = deliveryType === 'delivery' ? 15.00 : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (items.length === 0) {
      onBack();
    }
  }, [items, onBack]);

  const validateForm = (): boolean => {
    setError(null);

    if (!customerName.trim()) {
      setError('El nombre del cliente es requerido');
      return false;
    }

    if (!phoneNumber.trim()) {
      setError('El número de teléfono es requerido');
      return false;
    }

    if (phoneNumber.length < 8) {
      setError('El número de teléfono debe tener al menos 8 dígitos');
      return false;
    }

    if (deliveryType === 'delivery') {
      if (!selectedAddress && !deliveryAddress.trim()) {
        setError('La dirección de entrega es requerida para delivery');
        return false;
      }
    }

    return true;
  };

  // Función de diagnóstico mejorada
  const runDiagnostic = () => {
    console.log('=== DIAGNÓSTICO CHECKOUT FLOW ===');
    console.log('Usuario:', user);
    console.log('Items en carrito:', items);
    console.log('Cantidad de items:', getCartItemCount());
    console.log('Total del carrito:', getCartTotal());
    console.log('Subtotal:', subtotal);
    console.log('Delivery fee:', deliveryFee);
    console.log('Total:', total);
    console.log('Tipo de entrega:', deliveryType);
    console.log('Nombre cliente:', customerName);
    console.log('Teléfono:', phoneNumber);
    console.log('Dirección entrega:', deliveryAddress);
    console.log('Dirección seleccionada:', selectedAddress);
    console.log('Notas cliente:', customerNotes);
    console.log('Loading:', loading);
    console.log('IsSubmitting:', isSubmitting);
    console.log('Error actual:', error);
    
    // Validaciones específicas
    const validationResults = {
      hasUser: !!user,
      hasItems: items.length > 0,
      hasValidTotal: subtotal > 0,
      hasName: !!customerName.trim(),
      hasPhone: !!phoneNumber.trim(),
      phoneValid: phoneNumber.length >= 8,
      addressValid: deliveryType !== 'delivery' || !!(selectedAddress || deliveryAddress.trim()),
      notLoading: !loading,
      notSubmitting: !isSubmitting
    };
    
    console.log('Resultados de validación:', validationResults);
    
    const allValid = Object.values(validationResults).every(Boolean);
    console.log('¿Todas las validaciones pasaron?:', allValid);
    
    if (!allValid) {
      const failedValidations = Object.entries(validationResults)
        .filter(([_, passed]) => !passed)
        .map(([key, _]) => key);
      console.log('Validaciones que fallaron:', failedValidations);
    }
    
    console.log('=== FIN DIAGNÓSTICO ===');
    setShowDiagnostic(true);
  };

  // Función que determina si el botón debe estar deshabilitado
  const isButtonDisabled = () => {
    const reasons = [];
    
    if (isSubmitting) reasons.push('Enviando pedido');
    if (loading) reasons.push('Cargando datos');
    if (items.length === 0) reasons.push('Carrito vacío');
    if (!customerName.trim()) reasons.push('Falta nombre');
    if (!phoneNumber.trim()) reasons.push('Falta teléfono');
    if (phoneNumber.length < 8) reasons.push('Teléfono inválido');
    if (deliveryType === 'delivery' && !selectedAddress && !deliveryAddress.trim()) {
      reasons.push('Falta dirección de entrega');
    }
    
    return {
      disabled: reasons.length > 0,
      reasons
    };
  };

  const buttonStatus = isButtonDisabled();

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare delivery address and location data
      let finalDeliveryAddress = '';
      let deliveryLocationData = null;

      if (deliveryType === 'delivery') {
        if (selectedAddress) {
          // Use selected saved address
          finalDeliveryAddress = `${selectedAddress.address_line1}${selectedAddress.address_line2 ? ', ' + selectedAddress.address_line2 : ''}, ${selectedAddress.city}, ${selectedAddress.state}`;
          
          // Include GPS coordinates and delivery instructions
          deliveryLocationData = {
            address_id: selectedAddress.id,
            latitude: selectedAddress.latitude,
            longitude: selectedAddress.longitude,
            delivery_instructions: selectedAddress.delivery_instructions,
            landmark: selectedAddress.landmark,
            access_notes: selectedAddress.access_notes,
            address_type: selectedAddress.address_type,
            building_type: selectedAddress.building_type,
            floor_number: selectedAddress.floor_number,
            apartment_number: selectedAddress.apartment_number
          };
        } else {
          // Use manual address entry
          finalDeliveryAddress = deliveryAddress.trim();
        }
      }

      const orderRequest: CreateOrderRequest = {
        delivery_type: deliveryType,
        customer_name: customerName.trim(),
        phone_number: phoneNumber.trim(),
        customer_notes: customerNotes.trim() || undefined,
        delivery_address: finalDeliveryAddress || undefined,
        delivery_location: deliveryLocationData
      };

      const result = await createOrder(orderRequest);

      if (result.success && result.orderId) {
        onOrderCreated(result.orderId);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setError('Error inesperado al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">El carrito está vacío</h3>
        <p className="text-gray-600 mb-4">Agrega algunos productos antes de proceder al checkout</p>
        <Button onClick={onBack}>Volver al menú</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          ← Volver
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Finalizar Pedido</h1>
          <p className="text-gray-600">{getCartItemCount()} productos en tu carrito</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <div className="lg:col-span-2 space-y-6">
          <DeliveryTypeSelector value={deliveryType} onChange={setDeliveryType} />

          {/* Address Selection for Delivery */}
          {deliveryType === 'delivery' && (
            <AddressSelector
              selectedAddressId={selectedAddress?.id}
              onAddressSelect={setSelectedAddress}
              deliveryType={deliveryType}
            />
          )}

          {/* Manual Address Entry (fallback) */}
          {deliveryType === 'delivery' && !selectedAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Dirección de Entrega Manual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Dirección completa</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Textarea
                      id="deliveryAddress"
                      placeholder="Ingresa tu dirección completa con referencias, puntos de referencia y detalles para el repartidor"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="pl-10 min-h-[100px]"
                      required={deliveryType === 'delivery'}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Incluye referencias como: "Casa azul frente al parque", "Segundo piso, puerta verde", etc.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre completo</Label>
                  <Input
                    id="customerName"
                    placeholder="Tu nombre completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phoneNumber"
                      placeholder="3234-5678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNotes">Notas especiales (opcional)</Label>
                <Textarea
                  id="customerNotes"
                  placeholder="Instrucciones especiales, alergias, etc."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <ImageWithFallback
                        src={processImageUrl(item.product_image)}
                        alt={item.product_name || 'Producto'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {item.product_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {item.quantity} x Q{(item.product_price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      Q{((item.product_price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Delivery Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Tiempo estimado: {getEstimatedTime(deliveryType)}</span>
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>Q{subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Costo de envío</span>
                    <span>Q{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>Q{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitOrder}
                disabled={buttonStatus.disabled}
                className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Confirmar Pedido
                  </>
                )}
              </Button>

              {/* Diagnostic Button */}
              {buttonStatus.disabled && (
                <div className="space-y-2">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">No se puede confirmar el pedido:</p>
                        <ul className="text-sm space-y-1">
                          {buttonStatus.reasons.map((reason, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-destructive rounded-full flex-shrink-0"></span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    onClick={runDiagnostic}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Ejecutar Diagnóstico Detallado
                  </Button>
                </div>
              )}

              {/* Diagnostic Results */}
              {showDiagnostic && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Diagnóstico ejecutado</p>
                      <p className="text-sm text-muted-foreground">
                        Revisa la consola del navegador (F12 → Console) para ver el diagnóstico detallado.
                      </p>
                      <Button
                        onClick={() => setShowDiagnostic(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-gray-600 text-center">
                Al confirmar tu pedido, aceptas nuestros términos y condiciones
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}