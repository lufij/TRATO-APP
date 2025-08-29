// Diagnóstico para verificar órdenes y productos del día
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzqmorkoxzaubkfulfd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cW1vcmtveHphdWJrZnVsZmQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTUwOTk5NSwiZXhwIjoyMDUxMDg1OTk1fQ.P8CJ_a8_OESF3feFaThR9sYCJ4GXhV-bCl8GJZhNWMk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarOrdenes() {
  console.log('🔍 Iniciando diagnóstico de órdenes...\n');

  try {
    // 1. Verificar estructura de tabla orders
    console.log('1. Verificando tabla orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);

    if (ordersError) {
      console.error('❌ Error en tabla orders:', ordersError);
    } else {
      console.log('✅ Tabla orders:', orders?.length || 0, 'registros');
      if (orders && orders.length > 0) {
        console.log('   Columnas disponibles:', Object.keys(orders[0]));
        console.log('   Ejemplo:', orders[0]);
      }
    }

    // 2. Verificar tabla order_items
    console.log('\n2. Verificando tabla order_items...');
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(5);

    if (itemsError) {
      console.error('❌ Error en tabla order_items:', itemsError);
    } else {
      console.log('✅ Tabla order_items:', orderItems?.length || 0, 'registros');
      if (orderItems && orderItems.length > 0) {
        console.log('   Columnas disponibles:', Object.keys(orderItems[0]));
      }
    }

    // 3. Verificar tabla users
    console.log('\n3. Verificando tabla users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, phone, user_type')
      .limit(3);

    if (usersError) {
      console.error('❌ Error en tabla users:', usersError);
    } else {
      console.log('✅ Tabla users:', users?.length || 0, 'registros');
    }

    // 4. Verificar productos del día
    console.log('\n4. Verificando daily_products...');
    const { data: dailyProducts, error: dailyError } = await supabase
      .from('daily_products')
      .select('*')
      .limit(5);

    if (dailyError) {
      console.error('❌ Error en tabla daily_products:', dailyError);
    } else {
      console.log('✅ Tabla daily_products:', dailyProducts?.length || 0, 'registros');
      if (dailyProducts && dailyProducts.length > 0) {
        console.log('   Ejemplo:', dailyProducts[0]);
      }
    }

    // 5. Intentar la consulta compleja que falla
    console.log('\n5. Probando consulta compleja...');
    const { data: complexQuery, error: complexError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          product_image,
          notes
        ),
        users!orders_buyer_id_fkey (
          full_name,
          phone
        ),
        drivers:users!orders_driver_id_fkey (
          full_name
        )
      `)
      .limit(2);

    if (complexError) {
      console.error('❌ Error en consulta compleja:', complexError);
      
      // Intentar consulta simplificada
      console.log('\n   Probando consulta simplificada...');
      const { data: simpleQuery, error: simpleError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .limit(2);

      if (simpleError) {
        console.error('❌ Error en consulta simplificada:', simpleError);
      } else {
        console.log('✅ Consulta simplificada funciona:', simpleQuery?.length || 0, 'registros');
      }
    } else {
      console.log('✅ Consulta compleja funciona:', complexQuery?.length || 0, 'registros');
    }

    // 6. Verificar foreign keys
    console.log('\n6. Verificando relaciones...');
    
    // Verificar si hay órdenes con buyer_id válido
    const { data: ordersWithBuyers, error: buyersError } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id')
      .not('buyer_id', 'is', null)
      .limit(3);

    if (!buyersError && ordersWithBuyers) {
      console.log('✅ Órdenes con buyer_id:', ordersWithBuyers.length);
      
      // Verificar si esos buyer_id existen en users
      if (ordersWithBuyers.length > 0) {
        const buyerIds = ordersWithBuyers.map(o => o.buyer_id);
        const { data: existingBuyers, error: existingError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', buyerIds);

        if (!existingError) {
          console.log('   Buyers encontrados en users:', existingBuyers?.length || 0);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

diagnosticarOrdenes();
