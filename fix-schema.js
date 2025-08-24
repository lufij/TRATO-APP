import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Configuración de Supabase
const supabaseUrl = 'https://ikdtfwqkqpfxtxzrxnuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHRmd3Frcf...'; // Service key

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSchemaFix() {
  console.log('🔧 Iniciando corrección del esquema de base de datos...');
  
  try {
    // 1. Agregar columnas faltantes a orders
    console.log('📝 Agregando columnas faltantes a orders...');
    
    const alterCommands = [
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id UUID`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_id UUID`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'pickup'`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`
    ];
    
    for (const command of alterCommands) {
      try {
        await supabase.rpc('execute_sql', { sql_query: command });
        console.log(`✅ ${command}`);
      } catch (err) {
        console.log(`⚠️  ${command} - ${err.message}`);
      }
    }
    
    // 2. Crear tabla order_items
    console.log('📝 Creando tabla order_items...');
    const createOrderItems = `
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    try {
      await supabase.rpc('execute_sql', { sql_query: createOrderItems });
      console.log('✅ Tabla order_items creada/verificada');
    } catch (err) {
      console.log(`⚠️  Error al crear order_items: ${err.message}`);
    }
    
    // 3. Crear índices
    console.log('📝 Creando índices...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`
    ];
    
    for (const index of indexes) {
      try {
        await supabase.rpc('execute_sql', { sql_query: index });
        console.log(`✅ ${index}`);
      } catch (err) {
        console.log(`⚠️  ${index} - ${err.message}`);
      }
    }
    
    // 4. Verificar datos
    console.log('📊 Verificando datos...');
    
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact' });
    
    if (ordersError) {
      console.log('⚠️  Error al consultar orders:', ordersError.message);
    } else {
      console.log(`✅ Tabla orders: ${ordersData?.length || 0} registros`);
    }
    
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*', { count: 'exact' });
    
    if (itemsError) {
      console.log('⚠️  Error al consultar order_items:', itemsError.message);
    } else {
      console.log(`✅ Tabla order_items: ${itemsData?.length || 0} registros`);
    }
    
    console.log('🎉 Corrección del esquema completada!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar
executeSchemaFix();
