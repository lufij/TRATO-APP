import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { getTimeUntilExpiration } from '../utils/guatemala-time';

interface RealTimeStock {
  stock_quantity: number;
  sold_quantity: number;
  available_stock: number;
  loading: boolean;
  error: string | null;
}

export function useRealTimeStock(productId: string, productType: 'regular' | 'daily' = 'regular'): RealTimeStock {
  const [stock, setStock] = useState<RealTimeStock>({
    stock_quantity: 0,
    sold_quantity: 0,
    available_stock: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!productId) return;

    const fetchStock = async () => {
      try {
        setStock(prev => ({ ...prev, loading: true, error: null }));

        if (productType === 'daily') {
          // Para productos del día
          const { data: dailyProduct, error: dailyError } = await supabase
            .from('daily_products')
            .select('stock_quantity')
            .eq('id', productId)
            .single();

          if (dailyError) {
            throw dailyError;
          }

          // Calcular stock vendido de productos del día
          const { data: soldItems, error: soldError } = await supabase
            .from('order_items')
            .select(`
              quantity,
              orders!inner (
                status
              )
            `)
            .eq('product_id', productId)
            .eq('product_type', 'daily')
            .in('orders.status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

          if (soldError) {
            console.warn('Error fetching sold quantity:', soldError);
          }

          const soldQuantity = soldItems?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
          const originalStock = dailyProduct.stock_quantity || 0;
          const availableStock = Math.max(0, originalStock - soldQuantity);

          setStock({
            stock_quantity: originalStock,
            sold_quantity: soldQuantity,
            available_stock: availableStock,
            loading: false,
            error: null
          });

        } else {
          // Para productos regulares
          const { data: regularProduct, error: regularError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', productId)
            .single();

          if (regularError) {
            throw regularError;
          }

          // Para productos regulares, stock_quantity ya debería estar actualizado
          const currentStock = regularProduct.stock_quantity || 0;
          
          setStock({
            stock_quantity: currentStock,
            sold_quantity: 0, // No calculamos vendidos para productos regulares
            available_stock: currentStock,
            loading: false,
            error: null
          });
        }

      } catch (error: any) {
        console.error('Error fetching real-time stock:', error);
        setStock(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Error loading stock'
        }));
      }
    };

    fetchStock();

    // Actualizar cada 30 segundos para stock en tiempo real
    const interval = setInterval(fetchStock, 30000);

    return () => clearInterval(interval);
  }, [productId, productType]);

  return stock;
}

// Hook para obtener rating real de la tienda
export function useSellerRating(sellerId: string) {
  const [rating, setRating] = useState<{
    average_rating: number;
    total_reviews: number;
    loading: boolean;
  }>({
    average_rating: 0,
    total_reviews: 0,
    loading: true
  });

  useEffect(() => {
    if (!sellerId) return;

    const fetchRating = async () => {
      try {
        const { data, error } = await supabase
          .from('seller_ratings_view')
          .select('average_rating, total_reviews')
          .eq('seller_id', sellerId)
          .single();

        if (error) {
          console.warn('No rating found for seller:', sellerId);
          setRating({ average_rating: 0, total_reviews: 0, loading: false });
          return;
        }

        setRating({
          average_rating: data.average_rating || 0,
          total_reviews: data.total_reviews || 0,
          loading: false
        });

      } catch (error) {
        console.error('Error fetching seller rating:', error);
        setRating({ average_rating: 0, total_reviews: 0, loading: false });
      }
    };

    fetchRating();
  }, [sellerId]);

  return rating;
}

// Hook para calcular tiempo restante de productos del día
export function useDailyProductTimer(expiresAt: string | undefined) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    isExpired: boolean;
    formattedTime: string;
  }>({
    hours: 0,
    minutes: 0,
    isExpired: true,
    formattedTime: 'Expirado'
  });

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const timeInfo = getTimeUntilExpiration(expiresAt);
      
      setTimeRemaining({
        hours: timeInfo.hours,
        minutes: timeInfo.minutes,
        isExpired: timeInfo.isExpired,
        formattedTime: timeInfo.isExpired ? 'Expirado' : 
          timeInfo.hours > 0 ? `${timeInfo.hours}h ${timeInfo.minutes}m restantes` :
          `${timeInfo.minutes}m restantes`
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeRemaining;
}
