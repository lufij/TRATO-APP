const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ikdtfwqkqpfxtxzrxnuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZHRmd3Frcfextxzrxnuq.supabase.co'
);

async function fixDriverSchema() {
  console.log('🔧 Actualizando esquema para sistema de repartidores...');
  
  const queries = [
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP WITH TIME ZONE", 
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_notes TEXT",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT", 
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT 'Dirección del vendedor'",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT 'Dirección del comprador'",
    "CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON orders(driver_id, status)"
  ];

  for (const query of queries) {
    try {
      console.log(`✅ ${query}`);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  ${error.message}`);
      }
    } catch (err) {
      console.log(`⚠️  ${err.message}`);
    }
  }

  // Verificar campos
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, driver_id, status, picked_up_at, in_transit_at, delivery_address')
      .limit(1);
      
    if (error) {
      console.error('❌ Error verificando campos:', error.message);
    } else {
      console.log('✅ Esquema actualizado correctamente');
      console.log('📊 Campos disponibles:', Object.keys(data[0] || {}));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fixDriverSchema();
