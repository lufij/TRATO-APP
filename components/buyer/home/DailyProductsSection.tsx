import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Flame, Clock } from 'lucide-react';
import { Product } from '../../../utils/supabase/client';
import { DailyProduct } from '../../../hooks/useBuyerData';
import { ProductCard } from './ProductCard';

interface DailyProductsSectionProps {
  dailyProducts: DailyProduct[];
  cartItems: any[];
  onAddToCart: (productId: string, isDaily?: boolean, productName?: string) => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onImageClick: (imageUrl: string) => void;
  onBusinessClick: (businessId: string) => void;
  addingToCart: string | null;
  editingQuantity: string | null;
  tempQuantity: string;
  onQuantityClick: (productId: string, currentQuantity: number) => void;
  onQuantityChange: (value: string) => void;
  onQuantitySubmit: (productId: string) => void;
  onQuantityKeyDown: (e: React.KeyboardEvent, productId: string) => void;
  loading?: boolean;
}

export function DailyProductsSection({
  dailyProducts,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onImageClick,
  onBusinessClick,
  addingToCart,
  editingQuantity,
  tempQuantity,
  onQuantityClick,
  onQuantityChange,
  onQuantitySubmit,
  onQuantityKeyDown,
  loading = false
}: DailyProductsSectionProps) {
  
  const getCartItemQuantity = (productId: string) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item?.quantity || 0;
  };

  if (loading) {
    return (
      <Card className="border-red-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Flame className="w-6 h-6" />
              Productos del Día
            </CardTitle>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dailyProducts || dailyProducts.length === 0) {
    return (
      <Card className="border-red-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Flame className="w-6 h-6" />
            Productos del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay productos del día disponibles en este momento.</p>
            <p className="text-sm text-gray-400 mt-2">¡Vuelve mañana para ver las nuevas ofertas!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Flame className="w-6 h-6" />
            Productos del Día
          </CardTitle>
          <Badge variant="destructive" className="animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Oferta especial
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Ofertas especiales disponibles solo por hoy. ¡No te las pierdas!
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dailyProducts.map((product) => (
            <div key={product.id} className="relative">
              {/* Badge especial para productos del día */}
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-red-500 text-white text-xs font-semibold">
                  <Flame className="w-3 h-3 mr-1" />
                  Oferta del día
                </Badge>
              </div>
              
              <ProductCard
                product={product}
                viewMode="grid"
                cartQuantity={getCartItemQuantity(product.id)}
                onAddToCart={onAddToCart}
                onUpdateQuantity={onUpdateQuantity}
                onImageClick={onImageClick}
                onBusinessClick={onBusinessClick}
                addingToCart={addingToCart === product.id}
                editingQuantity={editingQuantity === product.id}
                tempQuantity={tempQuantity}
                onQuantityClick={onQuantityClick}
                onQuantityChange={onQuantityChange}
                onQuantitySubmit={onQuantitySubmit}
                onQuantityKeyDown={onQuantityKeyDown}
              />
            </div>
          ))}
        </div>
        
        {dailyProducts.length > 3 && (
          <div className="text-center mt-6">
            <button className="text-red-600 hover:text-red-700 font-medium text-sm hover:underline">
              Ver todos los productos del día →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
