import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useImageModalContext } from '../contexts/ImageModalContext';
import { formatGuatemalaTime, getTimeUntilExpiration } from '../utils/guatemala-time';
import { 
  Edit2, 
  Trash2, 
  Clock,
  DollarSign,
  Hash,
  Timer,
  Flame
} from 'lucide-react';

interface DailyProduct {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  expires_at: string;
  created_at: string;
}

interface DailyProductCardProps {
  dailyProduct: DailyProduct;
  onEdit: (dailyProduct: DailyProduct) => void;
  onDelete: (productId: string) => void;
}

export function DailyProductCard({ dailyProduct, onEdit, onDelete }: DailyProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const { openImageModal } = useImageModalContext();

  useEffect(() => {
    const updateCountdown = () => {
      const timeInfo = getTimeUntilExpiration(dailyProduct.expires_at);
      setTimeLeft(timeInfo.formattedTime);
      setIsExpired(timeInfo.isExpired);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [dailyProduct.expires_at]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatTime = (dateString: string) => {
    return formatGuatemalaTime(dateString);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden border-orange-200">
      <div className="relative">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden">
          {imageError ? (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
              <Clock className="w-12 h-12 text-orange-400" />
            </div>
          ) : (
            <ImageWithFallback
              src={dailyProduct.image_url}
              alt={dailyProduct.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
              expandable={true}
              onExpand={openImageModal}
            />
          )}
        </div>

        {/* Daily Product Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
            <Flame className="w-3 h-3 mr-1" />
            Oferta del Día
          </Badge>
        </div>

        {/* Stock Badge */}
        {dailyProduct.stock_quantity === 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-xs">
              Agotado
            </Badge>
          </div>
        )}

        {/* Countdown Badge */}
        <div className="absolute bottom-2 right-2">
          <Badge 
            variant={isExpired ? "destructive" : "secondary"} 
            className={`text-xs ${isExpired ? 'bg-red-500 text-white' : 'bg-white/90 backdrop-blur-sm text-orange-700'}`}
          >
            <Timer className="w-3 h-3 mr-1" />
            {timeLeft}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Product Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1" title={dailyProduct.name}>
              {dailyProduct.name}
            </h3>
            {dailyProduct.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1" title={dailyProduct.description}>
                {dailyProduct.description}
              </p>
            )}
          </div>

          {/* Price and Stock Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-lg text-orange-600">
                {formatPrice(dailyProduct.price)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {dailyProduct.stock_quantity} disponible
              </span>
            </div>
          </div>

          {/* Expiration Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orange-700">
                Creado a las {formatTime(dailyProduct.created_at)}
              </span>
              <span className="text-orange-700 font-medium">
                Expira: {formatTime(dailyProduct.expires_at)}
              </span>
            </div>
          </div>

          {/* Time Warning */}
          {!isExpired && (
            <div className="text-center">
              <p className="text-xs text-orange-600 font-medium">
                ⏰ Se elimina automáticamente en {timeLeft}
              </p>
            </div>
          )}

          {isExpired && (
            <div className="text-center bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-700 font-medium">
                ❌ Este producto ha expirado y será eliminado pronto
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(dailyProduct)}
              className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
              disabled={isExpired}
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
                  <AlertDialogTitle>¿Eliminar producto del día?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El producto "{dailyProduct.name}" 
                    se eliminará permanentemente de tu tienda y su imagen del servidor.
                    {!isExpired && (
                      <span className="block mt-2 text-orange-600 font-medium">
                        Nota: Este producto se eliminará automáticamente en {timeLeft} de todas formas.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(dailyProduct.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Eliminar Ahora
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