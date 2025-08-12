import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useImageModalContext } from '../contexts/ImageModalContext';
import { 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Package,
  DollarSign,
  Hash
} from 'lucide-react';

interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const { openImageModal } = useImageModalContext();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden">
          {imageError ? (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          ) : (
            <ImageWithFallback
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
              expandable={true}
              onExpand={openImageModal}
            />
          )}
        </div>

        {/* Visibility Badge */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant={product.is_public ? "default" : "secondary"}
            className="text-xs"
          >
            {product.is_public ? (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Público
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                Privado
              </>
            )}
          </Badge>
        </div>

        {/* Stock Badge */}
        {product.stock_quantity === 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-xs">
              Sin stock
            </Badge>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="text-xs bg-white/90 backdrop-blur-sm">
            {product.category}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Product Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1" title={product.name}>
              {product.name}
            </h3>
            {product.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1" title={product.description}>
                {product.description}
              </p>
            )}
          </div>

          {/* Price and Stock Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-lg text-green-600">
                {formatPrice(product.price)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {product.stock_quantity} disponible
              </span>
            </div>
          </div>

          {/* Creation Date */}
          <div className="text-xs text-gray-500 border-t pt-2">
            Creado el {formatDate(product.created_at)}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(product)}
              className="flex-1"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Editar
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El producto "{product.name}" 
                    se eliminará permanentemente de tu tienda.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(product.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}