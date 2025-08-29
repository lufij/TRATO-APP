// Test de conectividad con las credenciales del .env.local

import { createClient } from '@supabase/supabase-js';

// Credenciales del .env.local actual
const supabaseUrl = 'https://deaddzylotqdckublfed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYWRkenlsb3RxZGNrdWJsZmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTU4NjEsImV4cCI6MjA3MTM3MTg2MX0.ktxZ0H7mI9NVdxu48sPd90kqPerSP-vkysQlIM1JpG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Probando conexión con Supabase...');
    console.log('URL:', supabaseUrl);
    
    // Test básico de conexión
    const { data, error } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1);

    if (error) {
      console.error('❌ Error de conexión:', error);
      return false;
    }

    console.log('✅ Conexión exitosa!');
    console.log(`📦 Órdenes encontradas: ${data?.length || 0}`);
    if (data && data.length > 0) {
      console.log('Primera orden:', data[0]);
    }
    return true;

  } catch (error) {
    console.error('💥 Error general:', error);
    return false;
  }
}

testConnection();
