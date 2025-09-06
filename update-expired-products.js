import { supabase } from './utils/supabase/client.ts';

async function updateExpiredProducts() {
  console.log('🔄 Actualizando productos expirados...');
  
  try {
    // 1. Verificar productos actuales
    const { data: currentProducts, error: fetchError } = await supabase
      .from('daily_products')
      .select('id, name, expires_at, is_available')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    console.log('📊 Productos encontrados:', currentProducts?.length || 0);
    currentProducts?.forEach(product => {
      console.log(`  - ${product.name}: ${product.expires_at} (disponible: ${product.is_available})`);
    });

    // 2. Actualizar todos los productos para que expiren mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const { data: updatedProducts, error: updateError } = await supabase
      .from('daily_products')
      .update({ 
        expires_at: tomorrow.toISOString(),
        is_available: true 
      })
      .select('id, name, expires_at, is_available');

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Products actualizados:', updatedProducts?.length || 0);
    updatedProducts?.forEach(product => {
      console.log(`  ✓ ${product.name}: nueva fecha ${product.expires_at}`);
    });

    console.log('🎉 Actualización completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error actualizando productos:', error);
  }
}

updateExpiredProducts();
