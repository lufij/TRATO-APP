import React, { useState } from 'react';
import { useOrder } from '../../contexts/OrderContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Star, Store, Truck, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface OrderRatingModalProps {
  orderId: string;
  type: 'seller' | 'driver';
  onClose: () => void;
  onRatingSubmitted: () => void;
}

export function OrderRatingModal({ orderId, type, onClose, onRatingSubmitted }: OrderRatingModalProps) {
  const { rateOrder } = useOrder();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await rateOrder(orderId, rating, type, comment.trim() || undefined);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onRatingSubmitted();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Error inesperado al enviar la calificación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return 'Selecciona una calificación';
    }
  };

  const getIcon = () => {
    return type === 'seller' ? <Store className="w-6 h-6" /> : <Truck className="w-6 h-6" />;
  };

  const getTitle = () => {
    return type === 'seller' ? 'Calificar Vendedor' : 'Calificar Repartidor';
  };

  const getDescription = () => {
    return type === 'seller' 
      ? '¿Cómo fue tu experiencia con el vendedor y la calidad de los productos?'
      : '¿Cómo fue la experiencia con el servicio de entrega?';
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">¡Gracias por tu calificación!</h3>
            <p className="text-gray-600">Tu opinión nos ayuda a mejorar el servicio</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-gradient-to-r from-orange-100 to-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <div className="text-orange-600">
              {getIcon()}
            </div>
          </div>
          <CardTitle>{getTitle()}</CardTitle>
          <p className="text-sm text-gray-600 font-normal">
            {getDescription()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Star Rating */}
          <div className="text-center space-y-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="transition-all duration-200 hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  disabled={isSubmitting}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {getRatingText(hoveredRating || rating)}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Comentarios (opcional)
            </label>
            <Textarea
              placeholder={
                type === 'seller' 
                  ? 'Cuéntanos sobre la calidad de los productos, el servicio al cliente, etc.'
                  : 'Cuéntanos sobre la puntualidad, el trato, el estado de los productos, etc.'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 text-right">
              {comment.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={isSubmitting || rating === 0}
              className="flex-1 bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Enviar Calificación
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Tu calificación será visible para otros usuarios y ayudará a mejorar la calidad del servicio
          </p>
        </CardContent>
      </Card>
    </div>
  );
}