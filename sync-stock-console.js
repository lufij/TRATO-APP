/**
 * SCRIPT PARA SINCRONIZAR STOCK HISTÓRICO
 * =======================================
 * 
 * Ejecutar en la consola del navegador en la aplicación TRATO
 * para sincronizar el stock con las ventas históricas.
 */

async function sincronizarStockHistorico() {
  console.log('🔄 Iniciando sincronización de stock histórico...');
  
  try {
    // Obtener cliente de Supabase desde la ventana global
    const supabase = window.supabase || window._supabase;
    
    if (!supabase) {
      console.error('❌ No se encontró el cliente de Supabase');
      return;
    }

    // 1. Obtener todos los productos con stock
    console.log('📦 Obteniendo productos...');
    const { data: productos, error: productosError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, is_available')
      .not('stock_quantity', 'is', null);

    if (productosError) {
      console.error('❌ Error obteniendo productos:', productosError);
      return;
    }

    console.log(`📊 Encontrados ${productos.length} productos`);

    // 2. Para cada producto, calcular ventas históricas
    const actualizaciones = [];
    
    for (const producto of productos) {
      console.log(`🔍 Analizando: ${producto.name}`);
      
      // Obtener ventas confirmadas de este producto
      const { data: ventas, error: ventasError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          orders!inner(status)
        `)
        .eq('product_id', producto.id)
        .in('orders.status', ['completed', 'delivered', 'accepted', 'ready', 'picked-up']);

      if (ventasError) {
        console.warn(`⚠️ Error obteniendo ventas para ${producto.name}:`, ventasError);
        continue;
      }

      // Calcular total vendido
      const totalVendido = ventas.reduce((sum, venta) => sum + venta.quantity, 0);
      const stockOriginal = producto.stock_quantity + totalVendido;
      const stockCorregido = Math.max(0, producto.stock_quantity - totalVendido);

      if (stockCorregido !== producto.stock_quantity) {
        actualizaciones.push({
          id: producto.id,
          name: producto.name,
          stock_actual: producto.stock_quantity,
          total_vendido: totalVendido,
          stock_original: stockOriginal,
          stock_corregido: stockCorregido,
          is_available: stockCorregido > 0
        });
        
        console.log(`📝 ${producto.name}: ${producto.stock_quantity} → ${stockCorregido} (vendido: ${totalVendido})`);
      }
    }

    console.log(`🎯 Productos a actualizar: ${actualizaciones.length}`);

    if (actualizaciones.length === 0) {
      console.log('✅ No hay productos que necesiten actualización');
      return;
    }

    // 3. Aplicar actualizaciones
    console.log('💾 Aplicando actualizaciones...');
    
    for (const update of actualizaciones) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_quantity: update.stock_corregido,
          is_available: update.is_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Error actualizando ${update.name}:`, updateError);
      } else {
        console.log(`✅ ${update.name}: Stock actualizado a ${update.stock_corregido}`);
      }
    }

    // 4. Mostrar resumen
    console.log('\n📊 RESUMEN DE SINCRONIZACIÓN:');
    console.table(actualizaciones.map(u => ({
      Producto: u.name,
      'Stock Anterior': u.stock_actual,
      'Total Vendido': u.total_vendido,
      'Stock Corregido': u.stock_corregido,
      'Disponible': u.is_available ? 'Sí' : 'No'
    })));

    console.log('🎉 Sincronización completada exitosamente!');
    console.log('🔄 Recarga la página para ver los cambios');

  } catch (error) {
    console.error('💥 Error durante la sincronización:', error);
  }
}

// Ejecutar automáticamente
sincronizarStockHistorico();
