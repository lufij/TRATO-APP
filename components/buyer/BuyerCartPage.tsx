import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Store, 
  CreditCard,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Heart,
  X
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';

interface BuyerCartPageProps {
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
}

export function BuyerCartPage({ onContinueShopping, onProceedToCheckout }: BuyerCartPageProps) {
  const { user } = useAuth();
  const { 
    items: cartItems, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    getCartTotal, 
    getCartItemCount 
  } = useCart();

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

  // Cálculos del carrito
  const subtotal = getCartTotal();
  const total = subtotal; // Solo el subtotal, sin envío

  // Agrupar items por vendedor
  const groupedBySeller = cartItems.reduce((acc, item) => {
    const sellerId = item.product?.seller_id || 'unknown';
    const sellerName = item.product?.seller?.business_name || 'Vendedor';
    
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerId,
        sellerName,
        items: []
      };
    }
    acc[sellerId].items.push(item);
    return acc;
  }, {} as Record<string, { sellerId: string; sellerName: string; items: any[] }>);

  const handleQuantityUpdate = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setIsUpdating(itemId);
    try {
      if (newQuantity === 0) {
        await removeFromCart(itemId);
        toast.success('Producto eliminado del carrito');
      } else {
        await updateCartItem(itemId, newQuantity);
        toast.success('Cantidad actualizada');
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Error al actualizar el carrito');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleQuantityClick = (itemId: string, currentQuantity: number) => {
    setEditingQuantity(itemId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleQuantitySubmit = (itemId: string) => {
    const newQuantity = parseInt(tempQuantity);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      handleQuantityUpdate(itemId, newQuantity);
    }
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit(itemId);
    } else if (e.key === 'Escape') {
      setEditingQuantity(null);
      setTempQuantity('');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      toast.success('Producto eliminado del carrito');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success('Carrito vaciado');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Error al vaciar carrito');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Tu carrito está vacío</h3>
          <p className="text-gray-600 mb-8">Agrega algunos productos para comenzar tu pedido</p>
          <Button 
            onClick={onContinueShopping}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Explorar Productos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-orange-500" />
            Mi Carrito
          </h1>
          <p className="text-gray-600 mt-1">
            {getCartItemCount()} {getCartItemCount() === 1 ? 'producto' : 'productos'} en tu carrito
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={onContinueShopping}
            className="border-orange-200 text-orange-600 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continuar Comprando
          </Button>
          {cartItems.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleClearCart}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Vaciar Carrito
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos del Carrito */}
        <div className="lg:col-span-2 space-y-6">
          {Object.values(groupedBySeller).map((seller) => (
            <Card key={seller.sellerId} className="shadow-sm border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-orange-500" />
                  <div>
                    <CardTitle className="text-lg font-semibold">{seller.sellerName}</CardTitle>
                    <p className="text-sm text-gray-600">{seller.items.length} productos</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seller.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <ImageWithFallback
                          src={item.product?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                          alt={item.product?.name || 'Producto'}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                          onClick={() => setSelectedImage({
                            src: item.product?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
                            alt: item.product?.name || 'Producto'
                          })}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.product?.name}</h4>
                          <p className="text-green-600 font-semibold text-lg">Q{item.product?.price}</p>
                          {item.product?.description && (
                            <p className="text-sm text-gray-600 truncate">{item.product.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                            disabled={isUpdating === item.id}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          
                          {editingQuantity === item.id ? (
                            <Input
                              value={tempQuantity}
                              onChange={(e) => setTempQuantity(e.target.value)}
                              onBlur={() => handleQuantitySubmit(item.id)}
                              onKeyDown={(e) => handleQuantityKeyDown(e, item.id)}
                              className="w-16 h-8 text-center text-sm font-medium p-1"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="px-3 py-1 bg-white border rounded font-medium cursor-pointer hover:bg-gray-50 min-w-[3rem] text-center"
                              onClick={() => handleQuantityClick(item.id, item.quantity)}
                              title="Haz clic para editar cantidad"
                            >
                              {isUpdating === item.id ? '...' : item.quantity}
                            </span>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                            disabled={isUpdating === item.id}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Subtotal y eliminar */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-lg">Q{(item.product?.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumen del Pedido */}
        <div className="space-y-6">
          {/* Resumen de Costos */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">Q{subtotal.toFixed(2)}</span>
              </div>

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-orange-600">Q{total.toFixed(2)}</span>
              </div>

              <Button 
                onClick={onProceedToCheckout}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-medium"
                size="lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Proceder al Pago
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Imagen Ampliada */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                {selectedImage?.alt}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {selectedImage && (
            <div className="flex items-center justify-center max-h-[70vh]">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop';
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
