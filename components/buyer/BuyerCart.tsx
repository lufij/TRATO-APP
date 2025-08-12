import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Store, 
  Utensils, 
  Truck,
  MapPin,
  Phone,
  User,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface BuyerCartProps {
  onClose: () => void;
  onProceedToCheckout?: () => void;
}

type DeliveryType = 'pickup' | 'dine-in' | 'delivery';

interface OrderData {
  delivery_type: DeliveryType;
  delivery_address?: string;
  customer_notes?: string;
  phone_number: string;
  customer_name: string;
}

export function BuyerCart({ onClose, onProceedToCheckout }: BuyerCartProps) {
  const { user } = useAuth();
  const { 
    items: cartItems, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    getCartTotal, 
    getCartItemCount 
  } = useCart();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [orderData, setOrderData] = useState<OrderData>({
    delivery_type: 'pickup',
    phone_number: '',
    customer_name: user?.name || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Delivery fees
  const deliveryFees = {
    pickup: 0,
    'dine-in': 0,
    delivery: 15.00 // Q15 delivery fee
  };

  const subtotal = getCartTotal();
  const deliveryFee = deliveryFees[deliveryType];
  const total = subtotal + deliveryFee;

  // Group cart items by seller to enforce "one seller per cart" rule
  const groupedBySeller = cartItems.reduce((acc, item) => {
    const sellerId = item.product?.seller_id || 'unknown';
    if (!acc[sellerId]) {
      acc[sellerId] = {
        seller: item.product?.seller,
        items: []
      };
    }
    acc[sellerId].items.push(item);
    return acc;
  }, {} as Record<string, { seller: any; items: typeof cartItems }>);

  const sellerIds = Object.keys(groupedBySeller);
  const hasMultipleSellers = sellerIds.length > 1;

  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    const cartItem = cartItems.find(item => item.product_id === productId);
    if (cartItem) {
      if (newQuantity === 0) {
        await removeFromCart(cartItem.id);
      } else {
        await updateCartItem(cartItem.id, newQuantity);
      }
    }
  };

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    setOrderData(prev => ({
      ...prev,
      delivery_type: type,
      delivery_address: type === 'delivery' ? prev.delivery_address : undefined
    }));
  };

  const validateOrder = (): string | null => {
    if (cartItems.length === 0) return 'Tu carrito está vacío';
    if (hasMultipleSellers) return 'Solo puedes ordenar de un vendedor a la vez';
    if (!orderData.customer_name.trim()) return 'Ingresa tu nombre';
    if (!orderData.phone_number.trim()) return 'Ingresa tu número de teléfono';
    if (deliveryType === 'delivery' && !orderData.delivery_address?.trim()) {
      return 'Ingresa tu dirección de entrega';
    }
    return null;
  };

  const createOrder = async () => {
    const validationError = validateOrder();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const sellerId = sellerIds[0];
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user?.id,
          seller_id: sellerId,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          delivery_type: deliveryType,
          delivery_address: orderData.delivery_address,
          customer_notes: orderData.customer_notes,
          phone_number: orderData.phone_number,
          customer_name: orderData.customer_name,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name || '',
        product_image: item.product?.image_url || '',
        price: item.product?.price || 0,
        quantity: item.quantity,
        notes: ''
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create notification for seller
      await supabase
        .from('notifications')
        .insert({
          recipient_id: sellerId,
          type: 'new_order',
          title: 'Nueva orden recibida',
          message: `${orderData.customer_name} ha realizado un pedido por Q${total.toFixed(2)} (${
            deliveryType === 'pickup' ? 'Recoger en tienda' :
            deliveryType === 'dine-in' ? 'Comer dentro' : 'Servicio a domicilio'
          })`,
          data: { order_id: order.id, delivery_type: deliveryType }
        });

      // Clear cart and show success
      await clearCart();
      setOrderSuccess(true);
      setShowOrderDialog(true);

    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear la orden. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ShoppingCart className="w-24 h-24 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Tu carrito está vacío
        </h3>
        <p className="text-gray-500 mb-6">
          Agrega productos para comenzar tu pedido
        </p>
        <Button onClick={onClose} className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600">
          Explorar productos
        </Button>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 pb-24">
          {/* Multiple sellers warning */}
          {hasMultipleSellers && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Solo un vendedor por pedido</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Actualmente tienes productos de {sellerIds.length} vendedores. 
                  Debes ordenar de un solo vendedor a la vez.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cart Items */}
          <div className="space-y-4">
            {Object.entries(groupedBySeller).map(([sellerId, { seller, items }]) => (
              <Card key={sellerId} className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="w-4 h-4 text-orange-500" />
                    {seller?.business_name || 'Vendedor'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <ImageWithFallback
                        src={item.product?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                        alt={item.product?.name || 'Producto'}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product?.name}</h4>
                        <p className="text-green-600 font-semibold">Q{item.product?.price?.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{item.product?.category}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="px-2 font-medium text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Delivery Options */}
          {!hasMultipleSellers && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-base">Opciones de entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={deliveryType} onValueChange={handleDeliveryTypeChange}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Store className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Recoger en tienda</div>
                          <div className="text-sm text-gray-500">Gratis • 15-30 min</div>
                        </div>
                      </Label>
                      <Badge variant="outline">Gratis</Badge>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="dine-in" id="dine-in" />
                      <Label htmlFor="dine-in" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Utensils className="w-5 h-5 text-purple-500" />
                        <div>
                          <div className="font-medium">Comer dentro</div>
                          <div className="text-sm text-gray-500">Gratis • Servicio en mesa</div>
                        </div>
                      </Label>
                      <Badge variant="outline">Gratis</Badge>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Truck className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="font-medium">Servicio a domicilio</div>
                          <div className="text-sm text-gray-500">30-60 min • Entrega en tu dirección</div>
                        </div>
                      </Label>
                      <Badge className="bg-green-100 text-green-700">Q{deliveryFees.delivery.toFixed(2)}</Badge>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Order Details Form */}
          {!hasMultipleSellers && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Detalles del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="customer_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nombre completo
                    </Label>
                    <Input
                      id="customer_name"
                      value={orderData.customer_name}
                      onChange={(e) => setOrderData(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Tu nombre completo"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_number" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Teléfono
                    </Label>
                    <Input
                      id="phone_number"
                      value={orderData.phone_number}
                      onChange={(e) => setOrderData(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="Tu número de teléfono"
                      className="mt-1"
                    />
                  </div>

                  {deliveryType === 'delivery' && (
                    <div>
                      <Label htmlFor="delivery_address" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Dirección de entrega
                      </Label>
                      <Textarea
                        id="delivery_address"
                        value={orderData.delivery_address || ''}
                        onChange={(e) => setOrderData(prev => ({ ...prev, delivery_address: e.target.value }))}
                        placeholder="Ingresa tu dirección completa con referencias"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="customer_notes">Notas especiales (opcional)</Label>
                    <Textarea
                      id="customer_notes"
                      value={orderData.customer_notes || ''}
                      onChange={(e) => setOrderData(prev => ({ ...prev, customer_notes: e.target.value }))}
                      placeholder="Instrucciones especiales para tu pedido"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          {!hasMultipleSellers && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Resumen del pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal ({getCartItemCount()} productos)</span>
                  <span>Q{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entrega</span>
                  <span>{deliveryFee === 0 ? 'Gratis' : `Q${deliveryFee.toFixed(2)}`}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-green-600">Q{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3">
        {hasMultipleSellers ? (
          <Button 
            onClick={() => clearCart()} 
            variant="outline" 
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            Limpiar carrito
          </Button>
        ) : (
          <>
            <Button 
              onClick={onProceedToCheckout || createOrder}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 h-12"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Procesando pedido...
                </>
              ) : (
                <>
                  {onProceedToCheckout ? 'Proceder al Checkout' : `Confirmar pedido Q${total.toFixed(2)}`}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              {onProceedToCheckout 
                ? 'Revisa tu pedido antes de confirmar'
                : 'Al confirmar aceptas los términos y condiciones'
              }
            </p>
          </>
        )}
      </div>

      {/* Success Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-center">¡Pedido confirmado!</DialogTitle>
            <DialogDescription className="text-center">
              Tu pedido ha sido enviado al vendedor. Te notificaremos cuando sea aceptado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Total pagado:</span>
                  <span className="font-semibold">Q{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo de entrega:</span>
                  <span className="font-medium">
                    {deliveryType === 'pickup' ? 'Recoger en tienda' :
                     deliveryType === 'dine-in' ? 'Comer dentro' : 'Servicio a domicilio'}
                  </span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => {
                setShowOrderDialog(false);
                onClose();
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
            >
              Continuar comprando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}