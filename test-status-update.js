// Test para verificar que la actualización de estado funciona con los constraints correctos

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase 
const supabaseUrl = 'https://yygiwwqjejkhfxmokrxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Z2l3d3FqZWpraGZ4bW9rcnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3NzIzMzEsImV4cCI6MjA0MDM0ODMzMX0.o8YtI8V3AQIML24WLf1T6aYevhYCEZqzWFxBAJD9GBM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStatusUpdate() {
  try {
    console.log('🧪 Probando actualización de estado de orden...');
    
    // Buscar una orden pendiente para probar
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('status', 'pending')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error al buscar orden:', fetchError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️  No hay órdenes pendientes para probar');
      return;
    }

    const orderId = orders[0].id;
    console.log(`📦 Orden encontrada: ${orderId} (status: ${orders[0].status})`);

    // Probar cambio de pending → accepted
    console.log('🔄 Cambiando estado de pending → accepted...');
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Error al actualizar estado:', updateError);
      return;
    }

    console.log('✅ Estado actualizado correctamente a "accepted"');

    // Verificar el cambio
    const { data: updatedOrder, error: verifyError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (verifyError) {
      console.error('❌ Error al verificar estado:', verifyError);
      return;
    }

    console.log(`✅ Estado verificado: ${updatedOrder.status}`);

    // Probar siguiente cambio: accepted → ready
    console.log('🔄 Cambiando estado de accepted → ready...');
    const { error: updateError2 } = await supabase
      .from('orders')
      .update({ 
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError2) {
      console.error('❌ Error al actualizar a ready:', updateError2);
      return;
    }

    console.log('✅ Estado actualizado correctamente a "ready"');
    console.log('🎉 Prueba completada exitosamente!');

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testStatusUpdate();
