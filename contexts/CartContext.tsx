import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, Product } from '../utils/supabase/client';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  product_type: 'regular' | 'daily';
  quantity: number;
  product_name?: string;
  product_price?: number;
  product_image?: string;
  seller_id?: string;
  created_at: string;
  updated_at?: string;
  // Datos del producto (para compatibilidad)
  product?: Product;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity: number, productType?: 'regular' | 'daily') => Promise<{ success: boolean; message: string }>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  refreshCart: () => Promise<void>;
  getSellerInfo: () => { sellerId: string | null; sellerName: string | null };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch cart items from database
  const fetchCartItems = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      
      // First check if cart_items table exists
      const { error: tableCheckError } = await supabase
        .from('cart_items')
        .select('count', { count: 'exact', head: true });

      if (tableCheckError?.code === 'PGRST205') {
        // Table doesn't exist, create empty cart
        console.log('cart_items table does not exist yet');
        setItems([]);
        return;
      }

      // Clean up invalid items first - but handle the RPC error gracefully
      try {
        await supabase.rpc('cleanup_invalid_cart_items');
      } catch (rpcError) {
        console.warn('Could not run cleanup function (this is normal during initial setup):', rpcError);
      }

      // Get cart items with embedded product data - use simple query to avoid relationship issues
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (cartError) {
        // Handle specific foreign key relationship errors
        if (cartError.code === 'PGRST200' && cartError.message.includes('relationship between')) {
          console.warn('Foreign key relationship issue detected - using simplified query');
          // This is expected during initial setup when relationships aren't fully configured
          setItems([]);
          return;
        }
        console.error('Error fetching cart items:', cartError);
        return;
      }

      // Map data to include product info in the expected format for backward compatibility
      const mappedItems = (cartData || []).map(item => ({
        ...item,
        product: item.product_name ? {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price || 0,
          image_url: item.product_image,
          seller_id: item.seller_id
        } as Product : undefined
      }));

      setItems(mappedItems);

    } catch (error: any) {
      // Handle common database setup errors gracefully
      if (error?.code === 'PGRST200' || error?.message?.includes('relationship between')) {
        console.warn('Database relationships not fully configured yet (this is normal during setup)');
        setItems([]);
      } else {
        console.error('Unexpected error fetching cart:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart using the safe function
  const addToCart = async (
    productId: string, 
    quantity: number, 
    productType: 'regular' | 'daily' = 'regular'
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return {
        success: false,
        message: 'Debes iniciar sesión para agregar productos al carrito'
      };
    }

    try {
      console.log('Adding to cart:', { productId, quantity, productType, userId: user.id });

      // Use the database function for safe insertion with all required parameters
      const { data, error } = await supabase.rpc('add_to_cart_safe', {
        p_user_id: user.id,
        p_product_id: productId,
        p_quantity: quantity,
        p_product_type: productType
      });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('Error adding to cart:', error);
        
        // Handle specific error messages
        if (error.message.includes('overloading') || error.message.includes('function')) {
          return {
            success: false,
            message: 'Error de configuración de la función. Contacta al administrador.'
          };
        }
        
        return {
          success: false,
          message: `Error al agregar al carrito: ${error.message}`
        };
      }

      if (data && data.length > 0) {
        const result = data[0];
        console.log('Cart operation result:', result);
        
        if (result.success) {
          await fetchCartItems(); // Refresh cart data
          return {
            success: true,
            message: result.message || 'Producto agregado al carrito'
          };
        } else {
          return {
            success: false,
            message: result.message || 'No se pudo agregar el producto al carrito'
          };
        }
      }

      return {
        success: false,
        message: 'Respuesta inesperada del servidor'
      };

    } catch (error: any) {
      console.error('Unexpected error adding to cart:', error);
      
      // Handle network errors or other unexpected errors
      if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
        return {
          success: false,
          message: 'Error de conexión. Verifica tu internet e intenta nuevamente.'
        };
      }
      
      return {
        success: false,
        message: 'Error inesperado al agregar al carrito'
      };
    }
  };

  // Update cart item quantity
  const updateCartItem = async (itemId: string, quantity: number) => {
    if (!user || quantity < 0) return;

    try {
      if (quantity === 0) {
        // Remove item if quantity is 0
        await removeFromCart(itemId);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating cart item:', error);
        return;
      }

      await fetchCartItems();
    } catch (error) {
      console.error('Unexpected error updating cart item:', error);
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing from cart:', error);
        return;
      }

      await fetchCartItems();
    } catch (error) {
      console.error('Unexpected error removing from cart:', error);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart:', error);
        return;
      }

      setItems([]);
    } catch (error) {
      console.error('Unexpected error clearing cart:', error);
    }
  };

  // Calculate total price using embedded product data
  const getCartTotal = () => {
    return items.reduce((total, item) => {
      const price = item.product_price || item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  // Get total item count
  const getCartItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  // Get seller information from cart
  const getSellerInfo = () => {
    if (items.length === 0) {
      return { sellerId: null, sellerName: null };
    }

    const firstItem = items[0];
    return {
      sellerId: firstItem.seller_id || null,
      sellerName: null // TODO: Get seller name from sellers table if needed
    };
  };

  // Refresh cart data
  const refreshCart = async () => {
    await fetchCartItems();
  };

  // Fetch cart items when user changes
  useEffect(() => {
    fetchCartItems();
  }, [user]);

  // Auto-refresh cart every 30 seconds to clean up expired items
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchCartItems();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const value = {
    items,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
    refreshCart,
    getSellerInfo,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}