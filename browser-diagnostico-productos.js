// Script de diagnóstico para productos del día
// Ejecutar en consola del navegador (F12 -> Console)

(async function diagnosticarProductosDia() {
  console.log('🔍 DIAGNÓSTICO COMPLETO - PRODUCTOS DEL DÍA');
  console.log('📅 Fecha actual:', new Date().toISOString());
  console.log('=' .repeat(60));
  
  try {
    const { supabase } = window;
    
    if (!supabase) {
      console.error('❌ Supabase no disponible');
      return;
    }

    // 1. CONSULTAR TODOS LOS PRODUCTOS DEL DÍA
    console.log('\n1️⃣ CONSULTANDO TODOS LOS PRODUCTOS DEL DÍA...');
    const { data: allProducts, error: fetchError } = await supabase
      .from('daily_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error:', fetchError);
      return;
    }

    console.log(`📊 Total productos encontrados: ${allProducts?.length || 0}`);
    
    if (!allProducts || allProducts.length === 0) {
      console.log('❌ No hay productos del día en la base de datos');
      return;
    }

    // 2. ANÁLISIS DETALLADO DE CADA PRODUCTO
    console.log('\n2️⃣ ANÁLISIS DETALLADO:');
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final del día actual

    allProducts.forEach((product, index) => {
      console.log(`\n--- PRODUCTO ${index + 1}: ${product.name} ---`);
      console.log(`ID: ${product.id}`);
      console.log(`Seller ID: ${product.seller_id}`);
      console.log(`Creado: ${product.created_at}`);
      console.log(`Expira: ${product.expires_at}`);
      console.log(`Stock: ${product.stock_quantity}`);
      console.log(`Disponible: ${product.is_available}`);
      
      // Validaciones que usa la app
      const expiresAt = new Date(product.expires_at);
      const hasStock = product.stock_quantity > 0;
      const notExpired = expiresAt >= now;
      const expirestoday = expiresAt <= today;
      const isAvailable = product.is_available === true;
      
      console.log('🔍 VALIDACIONES:');
      console.log(`  Stock > 0: ${hasStock ? '✅' : '❌'} (${product.stock_quantity})`);
      console.log(`  No expirado: ${notExpired ? '✅' : '❌'} (${expiresAt.toLocaleString()})`);
      console.log(`  Expira hoy: ${expirestoday ? '✅' : '❌'} (debe expirar antes de ${today.toLocaleString()})`);
      console.log(`  Disponible: ${isAvailable ? '✅' : '❌'} (${product.is_available})`);
      
      const shouldAppear = hasStock && notExpired && expirestoday && isAvailable;
      console.log(`🎯 RESULTADO: ${shouldAppear ? '🟢 DEBERÍA APARECER EN APP' : '🔴 NO APARECE EN APP'}`);
      
      if (!shouldAppear) {
        const problems = [];
        if (!hasStock) problems.push('Sin stock');
        if (!notExpired) problems.push('Expirado');
        if (!expirestoday) problems.push('Expira después de hoy');
        if (!isAvailable) problems.push('Marcado como no disponible');
        console.log(`❌ PROBLEMAS: ${problems.join(', ')}`);
      }
    });

    // 3. RESUMEN FINAL
    console.log('\n3️⃣ RESUMEN FINAL:');
    const validProducts = allProducts.filter(p => {
      const expiresAt = new Date(p.expires_at);
      return p.stock_quantity > 0 && 
             expiresAt >= now && 
             expiresAt <= today && 
             p.is_available === true;
    });
    
    console.log(`✅ Productos válidos para mostrar: ${validProducts.length}/${allProducts.length}`);
    
    if (validProducts.length > 0) {
      console.log('📋 Productos que DEBERÍAN aparecer:');
      validProducts.forEach(p => {
        console.log(`  - ${p.name} (ID: ${p.id})`);
      });
    }

    // 4. PRODUCTOS CREADOS HOY
    console.log('\n4️⃣ PRODUCTOS CREADOS HOY (2025-09-05):');
    const todayProducts = allProducts.filter(p => {
      const createdDate = new Date(p.created_at);
      return createdDate.toDateString() === new Date('2025-09-05').toDateString();
    });
    
    console.log(`📅 Productos creados hoy: ${todayProducts.length}`);
    todayProducts.forEach(p => {
      console.log(`  - ${p.name}: expira ${p.expires_at}, stock ${p.stock_quantity}, disponible ${p.is_available}`);
    });

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
})();
