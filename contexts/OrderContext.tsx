import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_type: 'pickup' | 'dine-in' | 'delivery';
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  customer_notes?: string;
  phone_number: string;
  customer_name: string;
  status: 'pending' | 'accepted' | 'ready' | 'assigned' | 'picked-up' | 'in-transit' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  estimated_time: number;
  driver_id?: string;
  seller_rating?: number;
  driver_rating?: number;
  rejection_reason?: string;
  created_at: string;
  accepted_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  completed_at?: string;
  updated_at: string;
  items?: OrderItem[];
  seller_name?: string;
  driver_name?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  price: number;
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface CreateOrderRequest {
  delivery_type: 'pickup' | 'dine-in' | 'delivery';
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_location?: {
    address_id?: string;
    latitude?: number;
    longitude?: number;
    delivery_instructions?: string;
    landmark?: string;
    access_notes?: string;
    address_type?: string;
    building_type?: string;
    floor_number?: string;
    apartment_number?: string;
  };
  customer_notes?: string;
  phone_number: string;
  customer_name: string;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;
  currentOrder: Order | null;
  createOrder: (request: CreateOrderRequest) => Promise<{ success: boolean; message: string; orderId?: string }>;
  updateOrderStatus: (orderId: string, status: Order['status'], notes?: string) => Promise<{ success: boolean; message: string }>;
  assignDriver: (orderId: string, driverId: string) => Promise<{ success: boolean; message: string }>; 
  rateOrder: (orderId: string, rating: number, type: 'seller' | 'driver', comment?: string) => Promise<{ success: boolean; message: string }>;
  getOrderById: (orderId: string) => Promise<Order | null>;
  refreshOrders: () => Promise<void>;
  getOrdersByStatus: (status: Order['status']) => Order[];
  getActiveOrders: () => Order[];
  cancelOrder: (orderId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  deleteUnconfirmedOrder: (orderId: string) => Promise<{ success: boolean; message: string }>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Fetch orders for the current user
  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if orders table exists
      const { error: tableCheckError } = await supabase
        .from('orders')
        .select('count', { count: 'exact', head: true });

      if (tableCheckError?.code === 'PGRST205') {
        console.log('Orders table does not exist yet');
        setOrders([]);
        return;
      }

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `);

      // Filter based on user role
      switch (user.role) {
        case 'comprador':
          query = query.eq('buyer_id', user.id);
          break;
        case 'vendedor':
          query = query.eq('seller_id', user.id);
          break;
        case 'repartidor':
          query = query.or(`driver_id.eq.${user.id},status.eq.ready,status.eq.assigned`);
          break;
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching orders:', fetchError);
        setError('Error al cargar las órdenes');
        return;
      }

      // Get additional user info for each order
      const enrichedOrders = await Promise.all(
        (data || []).map(async (order) => {
          let sellerName = '';
          let driverName = '';

          // Get seller name
          if (order.seller_id) {
            const { data: sellerData } = await supabase
              .from('users')
              .select('name')
              .eq('id', order.seller_id)
              .single();
            sellerName = sellerData?.name || '';
          }

          // Get driver name
          if (order.driver_id) {
            const { data: driverData } = await supabase
              .from('users')
              .select('name')
              .eq('id', order.driver_id)
              .single();
            driverName = driverData?.name || '';
          }

          return {
            ...order,
            items: order.order_items || [],
            seller_name: sellerName,
            driver_name: driverName
          };
        })
      );

      setOrders(enrichedOrders);

    } catch (error) {
      console.error('Unexpected error fetching orders:', error);
      setError('Error inesperado al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  // Create a new order from cart
  const createOrder = async (request: CreateOrderRequest): Promise<{ success: boolean; message: string; orderId?: string }> => {
    if (!user) {
      return { success: false, message: 'Debes iniciar sesión para crear una orden' };
    }

    try {
      setLoading(true);
      setError(null);

      // Get cart items with product verification
      const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          products!inner (
            id,
            name,
            price,
            seller_id,
            is_public
          )
        `)
        .eq('user_id', user.id);

      if (cartError) {
        console.error('Error fetching cart items:', cartError);
        return { success: false, message: 'Error al obtener los productos del carrito' };
      }

      if (!cartItems || cartItems.length === 0) {
        return { success: false, message: 'El carrito está vacío' };
      }

      // Filter out items with invalid products
      const validCartItems = cartItems.filter(item => {
        if (!item.products) {
          console.warn(`Cart item ${item.id} has no associated product`);
          return false;
        }
        if (!item.products.is_public) {
          console.warn(`Product ${item.product_id} is not public`);
          return false;
        }
        return true;
      });

      if (validCartItems.length === 0) {
        return { success: false, message: 'No hay productos válidos en el carrito' };
      }

      if (validCartItems.length !== cartItems.length) {
        // Some items were invalid, inform the user
        return { 
          success: false, 
          message: 'Algunos productos en tu carrito ya no están disponibles. Por favor actualiza tu carrito.' 
        };
      }

      // Verify all items are from the same seller
      const sellerIds = [...new Set(validCartItems.map(item => item.products.seller_id))];
      if (sellerIds.length > 1) {
        return { success: false, message: 'Todos los productos deben ser del mismo vendedor' };
      }

      const sellerId = sellerIds[0];
      if (!sellerId) {
        return { success: false, message: 'Error: productos sin vendedor asignado' };
      }

      // Calculate totals using verified product prices
      const subtotal = validCartItems.reduce((total, item) => {
        const productPrice = item.products.price || item.product_price || 0;
        return total + (productPrice * item.quantity);
      }, 0);
      
      let deliveryFee = 0;
      
      // Set delivery fee based on type
      if (request.delivery_type === 'delivery') {
        deliveryFee = 15.00; // Q15 delivery fee
      }

      const total = subtotal + deliveryFee;

      // Prepare order data with location information
      const orderInsertData: any = {
        buyer_id: user.id,
        seller_id: sellerId,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_type: request.delivery_type,
        delivery_address: request.delivery_address,
        customer_notes: request.customer_notes,
        phone_number: request.phone_number,
        customer_name: request.customer_name,
        status: 'pending',
        estimated_time: 30 // Default 30 minutes
      };

      // Add location data if available
      if (request.delivery_location) {
        orderInsertData.delivery_latitude = request.delivery_location.latitude;
        orderInsertData.delivery_longitude = request.delivery_location.longitude;
        
        // Store additional location data as JSON
        if (request.delivery_location.address_id || 
            request.delivery_location.delivery_instructions ||
            request.delivery_location.landmark) {
          orderInsertData.delivery_location = request.delivery_location;
        }
      } else {
        // Fallback for backward compatibility
        orderInsertData.delivery_latitude = request.delivery_latitude;
        orderInsertData.delivery_longitude = request.delivery_longitude;
      }

      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertData)
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('Error creating order:', orderError);
        return { success: false, message: 'Error al crear la orden' };
      }

      // Create order items with verified product data
      const orderItems = validCartItems.map(item => {
        const productPrice = item.products.price || item.product_price || 0;
        return {
          order_id: orderData.id,
          product_id: item.product_id, // This is now verified to exist
          product_name: item.products.name || item.product_name || '',
          product_image: item.product_image,
          price: productPrice,
          quantity: item.quantity,
          notes: ''
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Try to cleanup the order
        await supabase.from('orders').delete().eq('id', orderData.id);
        
        // Provide more specific error message
        if (itemsError.code === '23503') {
          return { success: false, message: 'Error: algunos productos ya no están disponibles' };
        }
        return { success: false, message: 'Error al crear los items de la orden' };
      }

      // Create notification for seller
      try {
        await supabase.from('notifications').insert({
          recipient_id: sellerId,
          type: 'new_order',
          title: 'Nueva Orden',
          message: `Nueva orden por Q${total.toFixed(2)} - ${request.delivery_type}`,
          data: { order_id: orderData.id }
        });
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the entire order creation for notification issues
      }

      // Clear the cart
      try {
        await clearCart();
      } catch (clearCartError) {
        console.warn('Failed to clear cart:', clearCartError);
        // Don't fail the order creation if cart clearing fails
      }
      
      // Set as current order
      setCurrentOrder(orderData);
      
      // Refresh orders
      await fetchOrders();

      return { 
        success: true, 
        message: 'Orden creada exitosamente', 
        orderId: orderData.id 
      };

    } catch (error) {
      console.error('Unexpected error creating order:', error);
      return { success: false, message: 'Error inesperado al crear la orden' };
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: Order['status'], notes?: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Debes iniciar sesión' };
    }

    try {
      setLoading(true);
      
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      // Set timestamp fields based on status
      switch (status) {
        case 'accepted':
          updateData.accepted_at = new Date().toISOString();
          break;
        case 'ready':
          updateData.ready_at = new Date().toISOString();
          break;
        case 'picked-up':
          updateData.picked_up_at = new Date().toISOString();
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          break;
        case 'completed':
          updateData.completed_at = new Date().toISOString();
          break;
        case 'rejected':
          updateData.rejection_reason = notes || 'Sin razón especificada';
          break;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return { success: false, message: 'Error al actualizar el estado de la orden' };
      }

      // Get order details for notifications
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderData) {
        // Create notifications based on status change
        const notifications = [];
        
        switch (status) {
          case 'accepted':
            notifications.push({
              recipient_id: orderData.buyer_id,
              type: 'order_accepted',
              title: 'Orden Aceptada',
              message: `Tu orden ha sido aceptada y será preparada en ${orderData.estimated_time} minutos`,
              data: { order_id: orderId }
            });
            break;
            
          case 'ready':
            notifications.push({
              recipient_id: orderData.buyer_id,
              type: 'order_ready',
              title: 'Orden Lista',
              message: orderData.delivery_type === 'pickup' 
                ? 'Tu orden está lista para recoger'
                : 'Tu orden está lista para entrega',
              data: { order_id: orderId }
            });
            
            // If delivery, notify available drivers
            if (orderData.delivery_type === 'delivery') {
              const { data: drivers } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'repartidor')
                .eq('is_available', true);
                
              if (drivers) {
                drivers.forEach(driver => {
                  notifications.push({
                    recipient_id: driver.id,
                    type: 'delivery_available',
                    title: 'Entrega Disponible',
                    message: `Nueva entrega disponible - Q${orderData.delivery_fee.toFixed(2)}`,
                    data: { order_id: orderId }
                  });
                });
              }
            }
            break;
            
          case 'delivered':
            notifications.push({
              recipient_id: orderData.buyer_id,
              type: 'order_delivered',
              title: 'Orden Entregada',
              message: 'Tu orden ha sido entregada exitosamente',
              data: { order_id: orderId }
            });
            break;
        }

        if (notifications.length > 0) {
          try {
            await supabase.from('notifications').insert(notifications);
          } catch (notificationError) {
            console.warn('Failed to create notifications:', notificationError);
          }
        }
      }

      await fetchOrders();
      return { success: true, message: 'Estado actualizado exitosamente' };

    } catch (error) {
      console.error('Unexpected error updating order status:', error);
      return { success: false, message: 'Error inesperado al actualizar el estado' };
    } finally {
      setLoading(false);
    }
  };

  // Assign driver to order
  const assignDriver = async (orderId: string, driverId: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Debes iniciar sesión' };
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          driver_id: driverId, 
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error assigning driver:', error);
        return { success: false, message: 'Error al asignar repartidor' };
      }

      // Notify buyer and driver
      const { data: orderData } = await supabase
        .from('orders')
        .select('buyer_id, seller_id')
        .eq('id', orderId)
        .single();

      if (orderData) {
        const notifications = [
          {
            recipient_id: orderData.buyer_id,
            type: 'driver_assigned',
            title: 'Repartidor Asignado',
            message: 'Un repartidor ha sido asignado a tu orden',
            data: { order_id: orderId }
          },
          {
            recipient_id: driverId,
            type: 'delivery_assigned',
            title: 'Entrega Asignada',
            message: 'Se te ha asignado una nueva entrega',
            data: { order_id: orderId }
          }
        ];

        try {
          await supabase.from('notifications').insert(notifications);
        } catch (notificationError) {
          console.warn('Failed to create assignment notifications:', notificationError);
        }
      }

      await fetchOrders();
      return { success: true, message: 'Repartidor asignado exitosamente' };

    } catch (error) {
      console.error('Unexpected error assigning driver:', error);
      return { success: false, message: 'Error inesperado al asignar repartidor' };
    }
  };

  // Rate an order (seller or driver)
  const rateOrder = async (orderId: string, rating: number, type: 'seller' | 'driver', comment?: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Debes iniciar sesión' };
    }

    try {
      // Get order info
      const { data: orderData } = await supabase
        .from('orders')
        .select('buyer_id, seller_id, driver_id')
        .eq('id', orderId)
        .single();

      if (!orderData) {
        return { success: false, message: 'Orden no encontrada' };
      }

      const revieweeId = type === 'seller' ? orderData.seller_id : orderData.driver_id;
      
      if (!revieweeId) {
        return { success: false, message: `No hay ${type === 'seller' ? 'vendedor' : 'repartidor'} asignado`};
      }

      // Create review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          reviewee_type: type,
          rating,
          comment: comment || ''
        });

      if (reviewError) {
        console.error('Error creating review:', reviewError);
        return { success: false, message: 'Error al crear la calificación' };
      }

      // Update order rating
      const updateField = type === 'seller' ? 'seller_rating' : 'driver_rating';
      const { error: updateError } = await supabase
        .from('orders')
        .update({ [updateField]: rating })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order rating:', updateError);
      }

      await fetchOrders();
      return { success: true, message: 'Calificación enviada exitosamente' };

    } catch (error) {
      console.error('Unexpected error rating order:', error);
      return { success: false, message: 'Error inesperado al calificar' };
    }
  };

  // Get order by ID
  const getOrderById = async (orderId: string): Promise<Order | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (error || !data) {
        console.error('Error fetching order:', error);
        return null;
      }

      return {
        ...data,
        items: data.order_items || []
      };
    } catch (error) {
      console.error('Unexpected error fetching order:', error);
      return null;
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Debes iniciar sesión' };
    }

    return await updateOrderStatus(orderId, 'cancelled', reason);
  };

  // Delete unconfirmed order - specific function for buyers to delete pending orders
  const deleteUnconfirmedOrder = async (orderId: string): Promise<{ success: boolean; message: string }> => {
    if (!user || user.role !== 'comprador') {
      return { success: false, message: 'Solo los compradores pueden eliminar pedidos no confirmados' };
    }

    try {
      setLoading(true);
      
      // First, verify the order belongs to the user and is in pending status
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('status, buyer_id, seller_id, total')
        .eq('id', orderId)
        .single();

      if (fetchError || !orderData) {
        return { success: false, message: 'Orden no encontrada' };
      }

      if (orderData.buyer_id !== user.id) {
        return { success: false, message: 'No tienes permisos para eliminar esta orden' };
      }

      if (orderData.status !== 'pending') {
        return { success: false, message: 'Solo se pueden eliminar pedidos pendientes' };
      }

      // Delete order items first (foreign key constraint)
      const { error: itemsDeleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsDeleteError) {
        console.error('Error deleting order items:', itemsDeleteError);
        return { success: false, message: 'Error al eliminar los items del pedido' };
      }

      // Delete the order
      const { error: orderDeleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderDeleteError) {
        console.error('Error deleting order:', orderDeleteError);
        return { success: false, message: 'Error al eliminar el pedido' };
      }

      // Notify seller that the order was cancelled/deleted
      if (orderData.seller_id) {
        try {
          await supabase.from('notifications').insert({
            recipient_id: orderData.seller_id,
            type: 'order_cancelled',
            title: 'Pedido Eliminado',
            message: `Un pedido por Q${orderData.total.toFixed(2)} fue eliminado por el cliente`,
            data: { order_id: orderId, deleted: true }
          });
        } catch (notificationError) {
          console.warn('Failed to create cancellation notification:', notificationError);
        }
      }

      // Remove the order from local state
      setOrders(prev => prev.filter(order => order.id !== orderId));

      return { success: true, message: 'Pedido eliminado exitosamente' };

    } catch (error) {
      console.error('Unexpected error deleting order:', error);
      return { success: false, message: 'Error inesperado al eliminar el pedido' };
    } finally {
      setLoading(false);
    }
  };

  // Refresh orders
  const refreshOrders = async () => {
    await fetchOrders();
  };

  // Get orders by status
  const getOrdersByStatus = (status: Order['status']): Order[] => {
    return orders.filter(order => order.status === status);
  };

  // Get active orders (not completed, cancelled, or rejected)
  const getActiveOrders = (): Order[] => {
    return orders.filter(order => 
      !['completed', 'cancelled', 'rejected'].includes(order.status)
    );
  };

  // Fetch orders when user changes
  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('orders')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: user.role === 'comprador' 
            ? `buyer_id=eq.${user.id}`
            : user.role === 'vendedor'
            ? `seller_id=eq.${user.id}`
            : `driver_id=eq.${user.id}`
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const value = {
    orders,
    loading,
    error,
    currentOrder,
    createOrder,
    updateOrderStatus,
    assignDriver,
    rateOrder,
    getOrderById,
    refreshOrders,
    getOrdersByStatus,
    getActiveOrders,
    cancelOrder,
    deleteUnconfirmedOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}