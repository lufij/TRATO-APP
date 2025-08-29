// FIX DEFINITIVO - Reemplazar la función markOrderDelivered en SellerOrderManagement.tsx

const markOrderDelivered = async (orderId: string) => {
  try {
    // Actualizar el estado de la orden
    await updateOrderStatus(orderId, 'delivered');
    
    console.log('🚀 INICIANDO ACTUALIZACIÓN SUPER SIMPLE...');
    
    // Obtener items de la orden
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    console.log('📦 Items:', items);
    
    // Procesar cada item
    for (const item of items || []) {
      console.log(`🔄 Procesando: ${item.product_name}`);
      
      // Si contiene "tostada" (case insensitive)
      if (item.product_name?.toLowerCase().includes('tostada')) {
        console.log('🍞 Encontré Tostadas, actualizando...');
        
        // Buscar en daily_products
        const { data: producto, error: buscarError } = await supabase
          .from('daily_products')
          .select('id, name, stock_quantity')
          .eq('name', 'Tostadas')
          .single();
        
        if (buscarError) {
          console.error('❌ Error buscando producto:', buscarError);
          continue;
        }
        
        if (producto) {
          const stockAntes = producto.stock_quantity;
          const stockDespues = stockAntes - item.quantity;
          
          console.log(`📊 Stock: ${stockAntes} → ${stockDespues}`);
          
          // Actualizar stock
          const { error: actualizarError } = await supabase
            .from('daily_products')
            .update({ stock_quantity: stockDespues })
            .eq('id', producto.id);
          
          if (actualizarError) {
            console.error('❌ Error actualizando:', actualizarError);
          } else {
            console.log('✅ Stock actualizado exitosamente!');
          }
        }
      }
    }
    
    toast.success('Orden entregada y stock actualizado');
    
  } catch (error) {
    console.error('💥 Error general:', error);
    toast.error('Error al procesar orden');
  }
};
