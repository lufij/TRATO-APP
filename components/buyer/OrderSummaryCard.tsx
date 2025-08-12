import React, { useState } from 'react';
import { Order } from '../../contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Star, Phone, MapPin } from 'lucide-react';
import { processImageUrl } from '../../utils/imageUtils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { OrderRatingModal } from './OrderRatingModal';
import { canRateOrder } from '../../utils/orderUtils';

interface OrderSummaryCardProps {
  order: Order;
  onOrderUpdate?: () => void;
}

export function OrderSummaryCard({ order, onOrderUpdate }: OrderSummaryCardProps) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingType, setRatingType] = useState<'seller' | 'driver'>('seller');

  return (
    <>
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle>Resumen del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <ImageWithFallback
                    src={processImageUrl(item.product_image)}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {item.product_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.quantity} x Q{item.price.toFixed(2)}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  Q{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span>{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono:</span>
              <span>{order.phone_number}</span>
            </div>
          </div>

          {/* Delivery Address */}
          {order.delivery_type === 'delivery' && order.delivery_address && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Dirección de Entrega
                </div>
                <p className="text-sm text-gray-600">{order.delivery_address}</p>
              </div>
            </>
          )}

          {/* Special Notes */}
          {order.customer_notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Notas especiales:</div>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {order.customer_notes}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Q{order.subtotal.toFixed(2)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span>Envío</span>
                <span>Q{order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>Q{order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Rating Buttons */}
          {canRateOrder(order) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Calificar experiencia</h4>
                <div className="space-y-2">
                  {!order.seller_rating && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setRatingType('seller');
                        setShowRatingModal(true);
                      }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Calificar Vendedor
                    </Button>
                  )}
                  {order.delivery_type === 'delivery' && order.driver_id && !order.driver_rating && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setRatingType('driver');
                        setShowRatingModal(true);
                      }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Calificar Repartidor
                    </Button>
                  )}
                </div>
                
                {/* Show existing ratings */}
                {(order.seller_rating || order.driver_rating) && (
                  <div className="space-y-1 text-xs text-gray-600">
                    {order.seller_rating && (
                      <div className="flex items-center gap-1">
                        <span>Vendedor:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < order.seller_rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {order.driver_rating && (
                      <div className="flex items-center gap-1">
                        <span>Repartidor:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < order.driver_rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rating Modal */}
      {showRatingModal && (
        <OrderRatingModal
          orderId={order.id}
          type={ratingType}
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={() => {
            setShowRatingModal(false);
            onOrderUpdate?.();
          }}
        />
      )}
    </>
  );
}