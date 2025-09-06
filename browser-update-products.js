// Script para ejecutar en la consola del navegador (F12 -> Console)
// Para actualizar productos del día expirados

(async function updateExpiredDailyProducts() {
  console.log('🔄 Iniciando actualización de productos del día expirados...');
  
  try {
    // Importar supabase desde el contexto global (debe estar disponible en la app)
    const { supabase } = window;
    
    if (!supabase) {
      console.error('❌ Supabase no disponible en el contexto global');
      return;
    }

    // 1. Verificar productos actuales
    console.log('📊 Consultando productos actuales...');
    const { data: currentProducts, error: fetchError } = await supabase
      .from('daily_products')
      .select('id, name, expires_at, is_available, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error consultando productos:', fetchError);
      return;
    }

    console.log(`📋 Productos encontrados: ${currentProducts?.length || 0}`);
    
    if (currentProducts && currentProducts.length > 0) {
      console.table(currentProducts.map(p => ({
        ID: p.id,
        Nombre: p.name,
        'Fecha Expira': p.expires_at,
        Disponible: p.is_available ? '✅' : '❌',
        'Fecha Creado': p.created_at
      })));
    }

    // 2. Calcular nueva fecha de expiración (mañana a las 23:59)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    
    console.log(`🗓️ Nueva fecha de expiración: ${tomorrow.toISOString()}`);

    // 3. Actualizar TODOS los productos del día
    console.log('⚡ Actualizando productos...');
    const { data: updatedProducts, error: updateError } = await supabase
      .from('daily_products')
      .update({ 
        expires_at: tomorrow.toISOString(),
        is_available: true 
      })
      .select('id, name, expires_at, is_available');

    if (updateError) {
      console.error('❌ Error actualizando productos:', updateError);
      return;
    }

    console.log(`✅ Productos actualizados exitosamente: ${updatedProducts?.length || 0}`);
    
    if (updatedProducts && updatedProducts.length > 0) {
      console.table(updatedProducts.map(p => ({
        ID: p.id,
        Nombre: p.name,
        'Nueva Fecha Expira': p.expires_at,
        Disponible: p.is_available ? '✅' : '❌'
      })));
    }

    console.log('🎉 ¡Actualización completada! Ahora todos los productos del día deberían estar disponibles.');
    console.log('💡 Recarga la página para ver los cambios.');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
})();
