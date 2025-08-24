import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Store, 
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const subtotal = getCartTotal();

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
                  <span>Gratis</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-green-600">Q{subtotal.toFixed(2)}</span>
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
              onClick={onProceedToCheckout}
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
                  Proceder al Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Revisa tu pedido antes de confirmar
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
                  <span className="font-semibold">Q{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="font-medium">Pedido confirmado</span>
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