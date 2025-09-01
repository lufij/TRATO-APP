import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');

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

  const handleQuantityClick = (itemId: string, currentQuantity: number) => {
    setEditingQuantity(itemId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 999)) {
      setTempQuantity(value);
    }
  };

  const handleQuantitySubmit = async (productId: string) => {
    const quantity = parseInt(tempQuantity);
    if (!isNaN(quantity) && quantity >= 0) {
      await updateCartQuantity(productId, quantity);
    }
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const handleQuantityKeyDown = async (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      await handleQuantitySubmit(productId);
    } else if (e.key === 'Escape') {
      setEditingQuantity(null);
      setTempQuantity('');
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
      <ScrollArea className="flex-1 mobile-scroll">
        <div className="mobile-space-y pb-24">
          {/* Multiple sellers warning - móvil optimizado */}
          {hasMultipleSellers && (
            <Card className="mobile-card border-red-200 bg-red-50">
              <CardContent className="mobile-card-content">
                <div className="flex items-start gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="mobile-text font-medium block mb-1">Solo un vendedor por pedido</span>
                    <p className="mobile-text-small text-red-600">
                      Actualmente tienes productos de {sellerIds.length} vendedores. 
                      Debes ordenar de un solo vendedor a la vez.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cart Items - móvil optimizado */}
          <div className="mobile-space-y">
            {Object.entries(groupedBySeller).map(([sellerId, { seller, items }]) => (
              <Card key={sellerId} className="mobile-card border-orange-200">
                <CardHeader className="mobile-card-header">
                  <CardTitle className="mobile-heading-3 flex items-center gap-2">
                    <Store className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="truncate">{seller?.business_name || 'Vendedor'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="mobile-card-content space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="mobile-product-card border border-gray-200">
                      <div className="flex gap-3 p-3">
                        <ImageWithFallback
                          src={item.product?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                          alt={item.product?.name || 'Producto'}
                          className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      
                        <div className="flex-1 min-w-0">
                          <h4 className="mobile-product-title mb-1">{item.product?.name}</h4>
                          <p className="mobile-product-price">Q{item.product?.price?.toFixed(2)}</p>
                          <p className="mobile-text-small text-gray-500">{item.product?.category}</p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {/* Controles de cantidad móviles */}
                          <div className="mobile-quantity-controls">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                              className="mobile-quantity-button"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            {editingQuantity === item.id ? (
                              <Input
                                value={tempQuantity}
                                onChange={(e) => handleQuantityChange(e.target.value)}
                                onBlur={() => handleQuantitySubmit(item.product_id)}
                                onKeyDown={(e) => handleQuantityKeyDown(e, item.product_id)}
                                className="mobile-quantity-display w-12 h-8 text-center"
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="mobile-quantity-display cursor-pointer hover:bg-gray-100"
                                onClick={() => handleQuantityClick(item.id, item.quantity)}
                                title="Toca para editar cantidad"
                              >
                                {item.quantity}
                              </span>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                              className="mobile-quantity-button"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Botón eliminar */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                            className="mobile-button-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary - móvil optimizado */}
          {!hasMultipleSellers && (
            <Card className="mobile-card border-orange-200 bg-orange-50">
              <CardHeader className="mobile-card-header">
                <CardTitle className="mobile-heading-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Resumen del pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="mobile-card-content space-y-3">
                <div className="flex justify-between mobile-text">
                  <span>Subtotal ({getCartItemCount()} productos)</span>
                  <span className="font-medium">Q{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mobile-text">
                  <span>Entrega</span>
                  <span className="font-medium text-green-600">Gratis</span>
                </div>
                <Separator />
                <div className="flex justify-between mobile-heading-3 text-orange-600">
                  <span>Total</span>
                  <span>Q{subtotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Bottom Actions - móvil optimizado */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 mobile-safe-bottom"
           style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="space-y-3">
          {hasMultipleSellers ? (
            <Button 
              onClick={() => clearCart()} 
              variant="outline" 
              className="mobile-button w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              Limpiar carrito
            </Button>
          ) : (
            <>
              <Button 
                onClick={onProceedToCheckout}
                disabled={isSubmitting || cartItems.length === 0}
                className="mobile-button-lg w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Proceder al Checkout
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <p className="mobile-text-small text-gray-500 text-center">
                Revisa tu pedido antes de confirmar
              </p>
            </>
          )}
        </div>
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