// Script para probar estados válidos de órdenes
import { supabase } from './utils/supabase/client.js';

async function testOrderStatuses() {
  console.log('🔍 Probando estados válidos para órdenes...\n');

  // Estados a probar
  const statuses = [
    'pending',
    'confirmed', 
    'preparing',
    'ready',
    'delivered',
    'cancelled',
    'rejected',
    'picked_up',
    'in_progress',
    'accepted',
    'complete',
    'completed'
  ];

  // Tomar una orden existente para probar
  const { data: testOrder } = await supabase
    .from('orders')
    .select('id, status')
    .limit(1);

  if (!testOrder || testOrder.length === 0) {
    console.log('❌ No se encontraron órdenes para probar');
    return;
  }

  const orderId = testOrder[0].id;
  const originalStatus = testOrder[0].status;
  console.log(`Usando orden ${orderId} (estado original: ${originalStatus})\n`);

  for (const status of statuses) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) {
        console.log(`❌ ${status}: ${error.message}`);
      } else {
        console.log(`✅ ${status}: VÁLIDO`);
      }
    } catch (err) {
      console.log(`❌ ${status}: ${err.message}`);
    }
  }

  // Restaurar estado original
  await supabase
    .from('orders')
    .update({ status: originalStatus })
    .eq('id', orderId);

  console.log(`\n🔄 Estado restaurado a: ${originalStatus}`);
}

testOrderStatuses();
