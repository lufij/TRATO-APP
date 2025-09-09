  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    console.log(`🚚 SOLUCIÓN DEFINITIVA - ORDEN: ${orderId}, NUEVO ESTADO: ${newStatus}`);
    setProcessingOrderId(orderId);
    
    try {
      // MÉTODO DEFINITIVO: Solo actualización directa, sin RPC functions
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Agregar campos específicos según el estado
      switch(newStatus) {
        case 'picked_up':
          updateData.picked_up_at = new Date().toISOString();
          console.log('📦 Marcando como RECOGIDO...');
          break;
        case 'in_transit':
          console.log('🚚 Marcando como EN TRÁNSITO...');
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          console.log('✅ Marcando como ENTREGADO...');
          break;
      }
      
      console.log('📊 Datos de actualización:', updateData);
      console.log('🎯 Filtros: orderId =', orderId, ', driverId =', user.id);
      
      // ACTUALIZACIÓN DIRECTA DEFINITIVA
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('driver_id', user.id)
        .select('id, status, picked_up_at, delivered_at, updated_at');

      if (error) {
        console.error('❌ ERROR DE BASE DE DATOS:', error);
        toast.error(`Error: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.error('❌ ORDEN NO ENCONTRADA O SIN PERMISOS');
        toast.error('La orden no existe o no tienes permisos para actualizarla');
        return;
      }

      const updatedOrder = data[0];
      console.log('✅ ORDEN ACTUALIZADA EXITOSAMENTE:', updatedOrder);
      
      // Mensajes de éxito específicos
      const messages: Record<string, string> = {
        'picked_up': '📦 Pedido RECOGIDO exitosamente',
        'in_transit': '🚚 Pedido EN TRÁNSITO al cliente',
        'delivered': '✅ Pedido ENTREGADO exitosamente'
      };
      
      const message = messages[newStatus] || 'Estado actualizado';
      toast.success(message);
      console.log(`🎉 ${message.toUpperCase()}`);
      
      // Refrescar datos del dashboard
      console.log('🔄 Actualizando vista del dashboard...');
      await fetchData();
      
      console.log('🏁 PROCESO COMPLETADO - SOLUCIÓN DEFINITIVA FUNCIONANDO');

    } catch (error: any) {
      console.error('💥 ERROR CRÍTICO:', error);
      toast.error(`Error crítico: ${error?.message || 'Error desconocido'}`);
    } finally {
      setProcessingOrderId(null);
    }
  };
