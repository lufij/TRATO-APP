// FUNCIÓN LIMPIA PARA REEMPLAZAR EN SellerOrderManagement.tsx
// Reemplazar TODA la función markOrderDelivered con esto:

const markOrderDelivered = async (orderId: string) => {
  console.log('🚀 ACTUALIZANDO STOCK - VERSION LIMPIA');
  
  try {
    // 1. Actualizar estado de la orden
    await updateOrderStatus(orderId, 'delivered');
    
    // 2. Obtener items de la orden
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    console.log('📦 Items:', items);
    
    // 3. Procesar cada item
    for (const item of items || []) {
      if (item.product_name?.toLowerCase().includes('tostada')) {
        console.log('🍞 Actualizando Tostadas...');
        
        // 4. Buscar producto en daily_products
        const { data: producto } = await supabase
          .from('daily_products')
          .select('id, stock_quantity')
          .eq('name', 'Tostadas')
          .single();
        
        if (producto) {
          const nuevoStock = producto.stock_quantity - item.quantity;
          console.log(`📊 Stock: ${producto.stock_quantity} → ${nuevoStock}`);
          
          // 5. Actualizar stock
          const { error } = await supabase
            .from('daily_products')
            .update({ stock_quantity: nuevoStock })
            .eq('id', producto.id);
          
          if (error) {
            console.error('❌ Error actualizando stock:', error);
          } else {
            console.log('✅ Stock actualizado exitosamente');
          }
        }
      }
    }
    
    toast.success('Orden entregada y stock actualizado');
    
  } catch (error) {
    console.error('💥 Error:', error);
    toast.error('Error al procesar orden');
  }
};
