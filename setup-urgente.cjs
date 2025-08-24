const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gxdibtqhvwohpqxpcsaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZGlidHFodndvaHBxeHBjc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwMDY3ODIsImV4cCI6MjA0NjU4Mjc4Mn0.d9-E8QfOtPDtHgaYKoIFSNjRFUGq7nqXa8VmNQB5H4I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeUrgentSQL() {
  try {
    console.log('🚀 Ejecutando arreglo urgente...');
    
    // 1. Crear usuarios
    console.log('👤 Creando usuarios...');
    const usersData = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Pizzería Test',
        email: 'vendor@test.com',
        role: 'vendedor',
        address: 'Buenos Aires'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Conductor Test', 
        email: 'driver@test.com',
        role: 'repartidor',
        address: 'Buenos Aires'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Cliente Test',
        email: 'buyer@test.com', 
        role: 'comprador',
        address: 'Buenos Aires'
      }
    ];
    
    for (const user of usersData) {
      const { error } = await supabase.from('users').upsert(user);
      if (error && !error.message.includes('duplicate')) {
        console.error('Error creando usuario:', error.message);
      }
    }
    console.log('✅ Usuarios creados');
    
    // 2. Crear vendedor con coordenadas
    console.log('🏪 Creando vendedor con Google Maps...');
    const { error: sellerError } = await supabase.from('sellers').upsert({
      user_id: '11111111-1111-1111-1111-111111111111',
      business_name: 'Pizzería Test',
      business_address: 'Avenida Corrientes 1500, Buenos Aires, Argentina',
      latitude: -34.6037,
      longitude: -58.3816,
      location_verified: true,
      is_open_now: true,
      category: 'restaurant'
    });
    
    if (sellerError && !sellerError.message.includes('duplicate')) {
      console.error('Error creando vendedor:', sellerError.message);
    } else {
      console.log('✅ Vendedor creado con coordenadas Google Maps');
    }
    
    // 3. Crear orden
    console.log('📦 Creando orden de prueba...');
    const { error: orderError } = await supabase.from('orders').upsert({
      id: '44444444-4444-4444-4444-444444444444',
      buyer_id: '33333333-3333-3333-3333-333333333333',
      seller_id: '11111111-1111-1111-1111-111111111111',
      driver_id: '22222222-2222-2222-2222-222222222222',
      status: 'assigned',
      total_amount: 25.50,
      delivery_address: 'Palermo, Buenos Aires',
      customer_name: 'Cliente Test',
      customer_phone: '+54 11 1234-5678'
    });
    
    if (orderError && !orderError.message.includes('duplicate')) {
      console.error('Error creando orden:', orderError.message);
    } else {
      console.log('✅ Orden creada');
    }
    
    // 4. Verificar datos
    const { data: vendedor } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', '11111111-1111-1111-1111-111111111111')
      .single();
      
    const { data: orden } = await supabase
      .from('orders')
      .select('*')
      .eq('id', '44444444-4444-4444-4444-444444444444')
      .single();
    
    console.log('');
    console.log('📍 VENDEDOR CON GOOGLE MAPS:');
    console.log('  - Nombre:', vendedor?.business_name);
    console.log('  - Dirección:', vendedor?.business_address);
    console.log('  - Coordenadas:', vendedor?.latitude, vendedor?.longitude);
    console.log('  - Verificado:', vendedor?.location_verified);
    
    console.log('');
    console.log('📦 ORDEN PARA REPARTIDOR:');
    console.log('  - ID:', orden?.id);
    console.log('  - Estado:', orden?.status);
    console.log('  - Cliente:', orden?.customer_name);
    console.log('  - Total:', orden?.total_amount);
    
    console.log('');
    console.log('🎉 ¡TODO LISTO! Ahora puedes probar la app con:');
    console.log('   📧 Email repartidor: driver@test.com');
    console.log('   🗺️ Coordenadas vendedor: -34.6037, -58.3816');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

executeUrgentSQL();
