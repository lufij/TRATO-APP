import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gxdibtqhvwohpqxpcsaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZGlidHFodndvaHBxeHBjc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwMDY3ODIsImV4cCI6MjA0NjU4Mjc4Mn0.d9-E8QfOtPDtHgaYKoIFSNjRFUGq7nqXa8VmNQB5H4I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrderData() {
  try {
    console.log('🔍 Verificando datos de orden para repartidor...');
    
    // Query exacta que usa el DriverDashboard
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
      console.error('❌ Error en query:', error);
      return;
    }

    console.log('📊 Órdenes encontradas:', data?.length || 0);
    
    if (data && data.length > 0) {
      const order = data[0];
      console.log('🎯 Datos de la primera orden:');
      console.log('  - ID:', order.id);
      console.log('  - Status:', order.status);
      console.log('  - Seller ID:', order.seller_id);
      console.log('  - Seller data RAW:', order.seller);
      
      if (order.seller) {
        console.log('📍 Datos de ubicación del seller:');
        console.log('  - business_name:', order.seller.business_name);
        console.log('  - address:', order.seller.address);
        console.log('  - latitude:', order.seller.latitude);
        console.log('  - longitude:', order.seller.longitude);
        console.log('  - Tipo latitude:', typeof order.seller.latitude);
        console.log('  - Tipo longitude:', typeof order.seller.longitude);
        
        // Simular el mapeo que hace DriverDashboard
        const mappedData = {
          seller_business: {
            business_name: order.seller?.business_name || 'Vendedor',
            business_address: order.seller?.address || 'Dirección no disponible',
            latitude: order.seller?.latitude,
            longitude: order.seller?.longitude,
            location_verified: true
          }
        };
        
        console.log('🔄 Datos mapeados:');
        console.log('  - seller_business:', mappedData.seller_business);
        
        // Test de navegación
        if (mappedData.seller_business?.latitude && mappedData.seller_business?.longitude) {
          const coords = `${mappedData.seller_business.latitude},${mappedData.seller_business.longitude}`;
          console.log('✅ COORDENADAS DISPONIBLES:', coords);
          console.log('🔗 URL de Google Maps que se generaría:');
          console.log(`https://www.google.com/maps/dir/?api=1&destination=${coords}`);
        } else {
          console.log('❌ NO HAY COORDENADAS DISPONIBLES');
          console.log('🔗 Se usaría dirección de texto:', mappedData.seller_business?.business_address);
        }
      } else {
        console.log('❌ No hay datos de seller en la respuesta');
      }
    }
    
  } catch (err) {
    console.error('💥 Error:', err.message);
  }
}

debugOrderData();
