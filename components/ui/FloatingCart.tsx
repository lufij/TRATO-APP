import { useState, useEffect } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { ShoppingCart, X } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface FloatingCartProps {
  onCartClick?: () => void;
}

export function FloatingCart({ onCartClick }: FloatingCartProps) {
  const { items, getCartItemCount, getCartTotal } = useCart();

  const totalItems = getCartItemCount();
  const totalPrice = getCartTotal();

  // Siempre mostrar si hay productos, sin complicaciones
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => {
          console.log('FloatingCart clicked!');
          if (onCartClick) {
            onCartClick();
          } else {
            alert(`Carrito: ${totalItems} productos - Q${totalPrice.toFixed(2)}`);
          }
        }}
        className="relative h-16 w-16 rounded-full bg-orange-500 hover:bg-orange-600 shadow-xl"
      >
        <ShoppingCart className="w-6 h-6 text-white" />
        
        {/* Badge simple */}
        <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {totalItems}
        </Badge>
      </Button>
    </div>
  );
}
