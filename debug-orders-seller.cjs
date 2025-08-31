// Script para verificar órdenes - CommonJS
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://gnbruemdcwtvgpxgcqhy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYnJ1ZW1kY3d0dmdweGdjcWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwMDQ1ODYsImV4cCI6MjA1MDU4MDU4Nn0.vZrnOhWXlvPtaQcGh7u7YJQJcTQNdGGJ-iC3gJnLdFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrders() {
  try {
    console.log('🔍 Verificando órdenes...\n');
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Encontradas ${orders?.length || 0} órdenes:\n`);
    
    if (orders && orders.length > 0) {
      orders.forEach((order, i) => {
        console.log(`${i + 1}. Orden #${order.order_number}`);
        console.log(`   Estado: ${order.status}`);
        console.log(`   Método: ${order.delivery_method || 'NO ESPECIFICADO'}`);
        console.log(`   Vendedor: ${order.seller_id}`);
        console.log(`   ---`);
      });
    } else {
      console.log('⚠️ No hay órdenes');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugOrders();
