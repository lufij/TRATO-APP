import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gxdibtqhvwohpqxpcsaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZGlidHFodndvaHBxeHBjc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwMDY3ODIsImV4cCI6MjA0NjU4Mjc4Mn0.d9-E8QfOtPDtHgaYKoIFSNjRFUGq7nqXa8VmNQB5H4I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDriverQuery() {
  try {
    console.log('🔍 Probando query corregida del DriverDashboard...');
    
    // Probar la query específica que debe funcionar ahora
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:users!buyer_id (
          name,
          phone
        ),
        seller:sellers!seller_id (
          business_name,
          address,
          latitude,
          longitude
        )
      `)
      .eq('driver_id', '00b384bc-6a52-4f25-b691-1700abd7ad89')
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error en query:', error.message);
      console.error('Detalles:', error);
    } else {
      console.log('✅ Query exitosa!');
      console.log('📊 Órdenes encontradas:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('🎯 Primera orden:', {
          id: data[0].id,
          status: data[0].status,
          customer_name: data[0].customer_name,
          seller_business: data[0].seller?.business_name
        });
      }
    }
    
  } catch (err) {
    console.error('💥 Error de conexión:', err.message);
  }
}

testDriverQuery();
