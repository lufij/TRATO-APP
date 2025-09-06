// DEBUG SIMPLE: PRODUCTOS DEL DÍA VS NORMALES
// ===========================================
// Ejecuta este script en la consola del navegador (F12)

async function debugProductosDelDia() {
    const { supabase } = window;
    
    console.log('🔍 DEBUGGING: PRODUCTOS DEL DÍA VS NORMALES');
    console.log('============================================');
    
    // 1. Ver órdenes pendientes de hoy
    const today = new Date().toISOString().split('T')[0];
    const { data: ordenesPendientes } = await supabase
        .from('orders')
        .select(`
            id, status, total_amount, customer_name,
            order_items (
                product_id, daily_product_id, product_name, 
                product_type, quantity, price
            )
        `)
        .eq('status', 'pending')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false });

    console.log(`📋 ÓRDENES PENDIENTES: ${ordenesPendientes?.length || 0}`);
    
    if (!ordenesPendientes || ordenesPendientes.length === 0) {
        console.log('ℹ️ No hay órdenes pendientes para analizar');
        return;
    }

    // 2. Analizar cada orden
    for (const orden of ordenesPendientes) {
        console.log(`\n📦 ORDEN: ${orden.id.substring(0, 8)}... ($${orden.total_amount})`);
        
        let tieneProductosNormales = false;
        let tieneProductosDelDia = false;
        
        for (const item of orden.order_items) {
            const esDelDia = item.product_type === 'daily' || !!item.daily_product_id;
            
            if (esDelDia) {
                tieneProductosDelDia = true;
                console.log(`  🌅 PRODUCTO DEL DÍA: ${item.product_name}`);
                console.log(`     - product_id: ${item.product_id}`);
                console.log(`     - daily_product_id: ${item.daily_product_id}`);
                console.log(`     - product_type: ${item.product_type}`);
                
                // Verificar si el producto existe y tiene stock
                if (item.product_id) {
                    const { data: productData } = await supabase
                        .from('daily_products')
                        .select('id, name, stock_quantity, is_available')
                        .eq('id', item.product_id)
                        .single();
                    
                    if (productData) {
                        console.log(`     ✅ Existe en daily_products: Stock=${productData.stock_quantity}, Disponible=${productData.is_available}`);
                    } else {
                        console.log(`     ❌ NO existe en daily_products`);
                    }
                }
            } else {
                tieneProductosNormales = true;
                console.log(`  📦 PRODUCTO NORMAL: ${item.product_name}`);
            }
        }
        
        // 3. PROBAR ACEPTAR ESTA ORDEN
        console.log(`\n🧪 PROBANDO ACEPTAR ORDEN...`);
        console.log(`   Tiene productos normales: ${tieneProductosNormales}`);
        console.log(`   Tiene productos del día: ${tieneProductosDelDia}`);
        
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            try {
                const { data: result, error } = await supabase.rpc('seller_accept_order', {
                    p_order_id: orden.id,
                    p_seller_id: user.id
                });
                
                if (error) {
                    console.log(`   ❌ ERROR: ${error.message}`);
                    console.log(`   📄 Error completo:`, error);
                } else {
                    console.log(`   ✅ ÉXITO:`, result);
                    
                    // Verificar si cambió el status
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const { data: ordenActualizada } = await supabase
                        .from('orders')
                        .select('status, accepted_at')
                        .eq('id', orden.id)
                        .single();
                    
                    console.log(`   🔍 Nuevo status: ${ordenActualizada?.status}`);
                    
                    if (ordenActualizada?.status === 'accepted') {
                        console.log(`   🎉 CONFIRMADO: Orden aceptada exitosamente`);
                        if (tieneProductosDelDia && !tieneProductosNormales) {
                            console.log(`   ✅ CONCLUSIÓN: Las órdenes SOLO de productos del día SÍ funcionan`);
                        }
                    } else {
                        console.log(`   ⚠️ PROBLEMA: Status no cambió`);
                    }
                }
            } catch (error) {
                console.log(`   💥 ERROR INESPERADO:`, error);
            }
        }
        
        console.log(`\n${'='.repeat(50)}`);
        
        // Solo probar la primera orden para no hacer spam
        break;
    }
}

// Ejecutar automáticamente
debugProductosDelDia();
