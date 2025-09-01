import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Product } from '../../../utils/supabase/client';
import { DailyProduct } from '../../../hooks/useBuyerData';
import { 
  Plus, 
  Minus, 
  Star, 
  MapPin,
  Clock,
  Store,
  Eye,
  CheckCircle,
  XCircle,
  Heart
} from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { getProductImageUrl } from '../../../utils/imageUtils';

// Tipo union para productos normales y del día
type AnyProduct = Product | DailyProduct;

interface ProductCardProps {
  product: AnyProduct;
  viewMode: 'grid' | 'list';
  cartQuantity: number;
  onAddToCart: (productId: string, isDaily?: boolean, productName?: string) => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onImageClick: (imageUrl: string) => void;
  onBusinessClick: (businessId: string) => void;
  addingToCart: boolean;
  editingQuantity: boolean;
  tempQuantity: string;
  onQuantityClick: (productId: string, currentQuantity: number) => void;
  onQuantityChange: (value: string) => void;
  onQuantitySubmit: (productId: string) => void;
  onQuantityKeyDown: (e: React.KeyboardEvent, productId: string) => void;
}

export function ProductCard({
  product,
  viewMode,
  cartQuantity,
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
  onQuantityKeyDown
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const isDaily = false; // TODO: Determinar si es producto del día
  const imageUrl = product.image_url || '';
  const stock = product.stock_quantity || 0;
  const sellerName = product.seller?.name || 'Tienda';

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implementar guardado en backend
  };

  if (viewMode === 'list') {
    return (
      <Card className="mb-4 overflow-hidden hover:shadow-lg transition-all duration-200 border-gray-200">
        <CardContent className="p-0">
          <div className="flex">
            {/* Imagen */}
            <div className="w-32 h-32 flex-shrink-0 relative">
              <ImageWithFallback
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => imageUrl && onImageClick(imageUrl)}
              />
              {isDaily && (
                <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                  Del día
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                onClick={toggleFavorite}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </Button>
            </div>

            {/* Contenido */}
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-gray-800 line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      Q{product.price?.toFixed(2)}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    <button 
                      onClick={() => onBusinessClick(product.seller_id)}
                      className="hover:text-orange-600 hover:underline"
                    >
                      {sellerName}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>4.5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>2.1 km</span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {stock > 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Stock: {stock}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      <XCircle className="w-3 h-3 mr-1" />
                      Agotado
                    </Badge>
                  )}
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-2">
                  {cartQuantity > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      
                      {editingQuantity ? (
                        <Input
                          type="number"
                          value={tempQuantity}
                          onChange={(e) => onQuantityChange(e.target.value)}
                          onBlur={() => onQuantitySubmit(product.id)}
                          onKeyDown={(e) => onQuantityKeyDown(e, product.id)}
                          className="w-16 h-8 text-center text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => onQuantityClick(product.id, cartQuantity)}
                          className="w-16 h-8 text-sm font-medium bg-gray-100 rounded border hover:bg-gray-200"
                        >
                          {cartQuantity}
                        </button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                        className="h-8 w-8 p-0"
                        disabled={cartQuantity >= stock}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onAddToCart(product.id, isDaily, product.name)}
                      disabled={addingToCart || stock <= 0}
                      className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista Grid
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-gray-200 h-full">
      <CardContent className="p-0">
        {/* Imagen */}
        <div className="relative aspect-square">
          <ImageWithFallback
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => imageUrl && onImageClick(imageUrl)}
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isDaily && (
              <Badge className="bg-red-500 text-white text-xs">
                Del día
              </Badge>
            )}
            {stock <= 5 && stock > 0 && (
              <Badge variant="outline" className="bg-yellow-500 text-white text-xs border-yellow-500">
                Últimos {stock}
              </Badge>
            )}
          </div>

          {/* Botón favorito */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
            onClick={toggleFavorite}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </Button>

          {/* Stock status */}
          <div className="absolute bottom-2 left-2">
            {stock > 0 ? (
              <Badge variant="outline" className="bg-white text-green-600 border-green-300 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {stock}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white text-red-600 border-red-300 text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                Agotado
              </Badge>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-base text-gray-800 line-clamp-2 mb-1">
              {product.name}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {product.description}
            </p>

            {/* Vendedor y rating */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <button 
                onClick={() => onBusinessClick(product.seller_id)}
                className="flex items-center gap-1 hover:text-orange-600 hover:underline"
              >
                <Store className="w-3 h-3" />
                {sellerName}
              </button>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>4.5</span>
              </div>
            </div>

            {/* Precio */}
            <div className="text-xl font-bold text-green-600 mb-3">
              Q{product.price?.toFixed(2)}
            </div>
          </div>

          {/* Controles de cantidad */}
          <div className="space-y-2">
            {cartQuantity > 0 ? (
              <div className="flex items-center justify-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                
                {editingQuantity ? (
                  <Input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => onQuantityChange(e.target.value)}
                    onBlur={() => onQuantitySubmit(product.id)}
                    onKeyDown={(e) => onQuantityKeyDown(e, product.id)}
                    className="w-16 h-8 text-center text-sm"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => onQuantityClick(product.id, cartQuantity)}
                    className="w-16 h-8 text-sm font-medium bg-gray-100 rounded border hover:bg-gray-200"
                  >
                    {cartQuantity}
                  </button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                  className="h-8 w-8 p-0"
                  disabled={cartQuantity >= stock}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onAddToCart(product.id, isDaily, product.name)}
                disabled={addingToCart || stock <= 0}
                className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar al carrito
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
