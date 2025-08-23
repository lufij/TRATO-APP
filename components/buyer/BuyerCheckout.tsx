import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { supabase } from '../../utils/supabase/client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { 
  CreditCard, 
  MapPin, 
  User, 
  Phone, 
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Truck,
  Store,
  UtensilsCrossed,
  Wallet,
  CreditCardIcon,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

interface BuyerCheckoutProps {
  onBack: () => void;
  onComplete: () => void;
}

interface CheckoutData {
  customer_name: string;
  phone_number: string;
  delivery_address: string;
  customer_notes: string;
  payment_method: 'cash' | 'card' | 'transfer';
}

type DeliveryType = 'pickup' | 'dine-in' | 'delivery';
type CheckoutStep = 'delivery' | 'contact' | 'payment' | 'review' | 'processing';

export function BuyerCheckout({ onBack, onComplete }: BuyerCheckoutProps) {
  const { user } = useAuth();
  const { items: cartItems, clearCart, getCartTotal } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('delivery');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customer_name: user?.name || '',
    phone_number: user?.phone || '',
    delivery_address: '',
    customer_notes: '',
    payment_method: 'cash'
  });

  // Calcular costos
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.product?.price || 0) * item.quantity, 0);
  const deliveryFee = deliveryType === 'delivery' ? 15.00 : 0;
  const finalTotal = subtotal + deliveryFee;

  const deliveryOptions = [
    {
      type: 'pickup' as DeliveryType,
      title: 'Recoger en tienda',
      description: 'Recoge tu pedido directamente en la tienda',
      icon: Store,
      fee: 0
    },
    {
      type: 'dine-in' as DeliveryType,
      title: 'Comer en el lugar',
      description: 'Disfruta tu comida en el restaurante',
      icon: UtensilsCrossed,
      fee: 0
    },
    {
      type: 'delivery' as DeliveryType,
      title: 'Servicio a domicilio',
      description: 'Te llevamos tu pedido a tu dirección',
      icon: Truck,
      fee: 15.00
    }
  ];

  const paymentOptions = [
    {
      type: 'cash' as const,
      title: 'Efectivo',
      description: 'Paga al recibir tu pedido',
      icon: Banknote
    },
    {
      type: 'card' as const,
      title: 'Tarjeta',
      description: 'Tarjeta de débito o crédito',
      icon: CreditCardIcon
    },
    {
      type: 'transfer' as const,
      title: 'Transferencia',
      description: 'Transferencia bancaria',
      icon: Wallet
    }
  ];

  const validateStep = (step: CheckoutStep): string | null => {
    switch (step) {
      case 'delivery':
        if (deliveryType === 'delivery' && !checkoutData.delivery_address.trim()) {
          return 'Ingresa tu dirección de entrega';
        }
        return null;
      
      case 'contact':
        if (!checkoutData.customer_name.trim()) return 'Ingresa tu nombre';
        if (!checkoutData.phone_number.trim()) return 'Ingresa tu teléfono';
        return null;
      
      case 'payment':
        if (!checkoutData.payment_method) return 'Selecciona un método de pago';
        return null;
      
      default:
        return null;
    }
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    if (validation) {
      toast.error(validation);
      return;
    }

    const steps: CheckoutStep[] = ['delivery', 'contact', 'payment', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: CheckoutStep[] = ['delivery', 'contact', 'payment', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const createOrder = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para crear un pedido');
      return;
    }

    setCurrentStep('processing');
    setIsSubmitting(true);
    
    try {
      // Obtener el seller_id del primer item del carrito
      const sellerId = cartItems[0]?.seller_id || cartItems[0]?.product?.seller_id;
      
      if (!sellerId) {
        throw new Error('No se pudo identificar el vendedor');
      }

      // Crear orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          subtotal,
          delivery_fee: deliveryFee,
          total: finalTotal,
          total_amount: finalTotal, // Asegurar que total_amount tenga valor
          delivery_type: deliveryType,
          delivery_address: checkoutData.delivery_address,
          customer_notes: checkoutData.customer_notes,
          phone_number: checkoutData.phone_number,
          customer_name: checkoutData.customer_name,
          payment_method: checkoutData.payment_method,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear items de la orden
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name || '',
        product_image: item.product?.image_url || '',
        price: item.product?.price || 0, // Usar 'price' en lugar de 'price_per_unit'
        quantity: item.quantity,
        notes: ''
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Crear notificación para el vendedor
      await supabase
        .from('notifications')
        .insert({
          recipient_id: sellerId,
          type: 'new_order',
          title: '🛒 Nueva orden recibida',
          message: `${checkoutData.customer_name} ha realizado un pedido por Q${finalTotal.toFixed(2)} - ${
            deliveryType === 'pickup' ? 'Recoger en tienda' :
            deliveryType === 'dine-in' ? 'Comer en el lugar' : 'Servicio a domicilio'
          }`,
          data: { 
            order_id: order.id, 
            delivery_type: deliveryType,
            payment_method: checkoutData.payment_method,
            customer_name: checkoutData.customer_name,
            customer_phone: checkoutData.phone_number,
            total: finalTotal
          }
        });

      // Limpiar carrito
      await clearCart();
      
      setOrderCreated(true);
      toast.success('¡Pedido creado exitosamente!');
      
      // Esperar 2 segundos antes de completar
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear el pedido. Intenta de nuevo.');
      setCurrentStep('review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'delivery', label: 'Entrega', icon: Truck },
      { key: 'contact', label: 'Contacto', icon: User },
      { key: 'payment', label: 'Pago', icon: CreditCard },
      { key: 'review', label: 'Revisar', icon: CheckCircle }
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = index < currentIndex;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                isActive ? 'bg-orange-500 text-white' :
                isCompleted ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`ml-2 text-sm ${
                isActive ? 'text-orange-600 font-medium' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDeliveryStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Tipo de entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={deliveryType} 
          onValueChange={(value: string) => setDeliveryType(value as DeliveryType)}
        >
          {deliveryOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.type} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={option.type} id={option.type} />
                <div className="flex-1 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-orange-500" />
                  <div className="flex-1">
                    <Label htmlFor={option.type} className="font-medium cursor-pointer">
                      {option.title}
                    </Label>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                  <div className="text-right">
                    {option.fee > 0 ? (
                      <span className="font-medium">Q{option.fee.toFixed(2)}</span>
                    ) : (
                      <span className="text-green-600 font-medium">Gratis</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        {deliveryType === 'delivery' && (
          <div className="space-y-2">
            <Label htmlFor="address">Dirección de entrega *</Label>
            <Textarea
              id="address"
              placeholder="Ingresa tu dirección completa..."
              value={checkoutData.delivery_address}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCheckoutData(prev => ({ ...prev, delivery_address: e.target.value }))}
              rows={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderContactStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Información de contacto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo *</Label>
          <Input
            id="name"
            placeholder="Tu nombre completo"
            value={checkoutData.customer_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckoutData(prev => ({ ...prev, customer_name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Número de teléfono *</Label>
          <Input
            id="phone"
            placeholder="1234-5678"
            value={checkoutData.phone_number}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckoutData(prev => ({ ...prev, phone_number: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Instrucciones especiales (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Alguna instrucción especial para tu pedido..."
            value={checkoutData.customer_notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCheckoutData(prev => ({ ...prev, customer_notes: e.target.value }))}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Método de pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={checkoutData.payment_method} 
          onValueChange={(value: string) => setCheckoutData(prev => ({ ...prev, payment_method: value as 'cash' | 'card' | 'transfer' }))}
        >
          {paymentOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.type} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={option.type} id={option.type} />
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-green-500" />
                  <div>
                    <Label htmlFor={option.type} className="font-medium cursor-pointer">
                      {option.title}
                    </Label>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Pago seguro</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Todos los pagos son procesados de forma segura. Tu información está protegida.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => {
    const selectedDelivery = deliveryOptions.find(opt => opt.type === deliveryType);
    const selectedPayment = paymentOptions.find(opt => opt.type === checkoutData.payment_method);

    return (
      <div className="space-y-6">
        {/* Resumen del pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Resumen del pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {item.product?.image_url && (
                  <img 
                    src={item.product.image_url} 
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium">{item.product?.name}</h4>
                  <p className="text-sm text-gray-600">
                    Q{item.product?.price?.toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <span className="font-medium">
                  Q{((item.product?.price || 0) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Q{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega:</span>
                <span>{deliveryFee > 0 ? `Q${deliveryFee.toFixed(2)}` : 'Gratis'}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-orange-600">Q{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles de entrega y pago */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {selectedDelivery && <selectedDelivery.icon className="w-5 h-5 text-orange-500" />}
                <div>
                  <p className="font-medium">{selectedDelivery?.title}</p>
                  {deliveryType === 'delivery' && checkoutData.delivery_address && (
                    <p className="text-sm text-gray-600">{checkoutData.delivery_address}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {selectedPayment && <selectedPayment.icon className="w-5 h-5 text-green-500" />}
                <div>
                  <p className="font-medium">{selectedPayment?.title}</p>
                  <p className="text-sm text-gray-600">{selectedPayment?.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información de contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-medium">Nombre:</span> {checkoutData.customer_name}</p>
              <p><span className="font-medium">Teléfono:</span> {checkoutData.phone_number}</p>
              {checkoutData.customer_notes && (
                <p><span className="font-medium">Notas:</span> {checkoutData.customer_notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProcessingStep = () => (
    <div className="text-center py-12">
      {orderCreated ? (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-600">¡Pedido creado exitosamente!</h3>
          <p className="text-gray-600">
            Tu pedido ha sido enviado al vendedor. Te notificaremos cuando sea confirmado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
          <h3 className="text-xl font-bold">Procesando tu pedido...</h3>
          <p className="text-gray-600">Por favor espera mientras creamos tu pedido.</p>
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'delivery':
        return renderDeliveryStep();
      case 'contact':
        return renderContactStep();
      case 'payment':
        return renderPaymentStep();
      case 'review':
        return renderReviewStep();
      case 'processing':
        return renderProcessingStep();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al carrito
        </Button>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      {currentStep !== 'processing' && renderStepIndicator()}

      {renderStepContent()}

      {currentStep !== 'processing' && (
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 'delivery' || isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={createOrder}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Confirmar pedido Q{finalTotal.toFixed(2)}
                  <CheckCircle className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
