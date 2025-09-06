// EJECUTAR DEBUG DESDE NODE.JS
// ============================
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjvhxwqahglsfdohqkhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProductosDelDiaNode() {
    console.log('🔍 DEBUGGING: PRODUCTOS DEL DÍA - EJECUTADO DESDE NODE');
    console.log('====================================================');
    
    try {
        // 1. Ver órdenes pendientes de hoy
        const today = new Date().toISOString().split('T')[0];
        const { data: ordenesPendientes, error } = await supabase
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

        if (error) {
            console.error('❌ Error obteniendo órdenes:', error);
            return;
        }

        console.log(`📋 ÓRDENES PENDIENTES: ${ordenesPendientes?.length || 0}`);
        
        if (!ordenesPendientes || ordenesPendientes.length === 0) {
            console.log('ℹ️ No hay órdenes pendientes para analizar');
            
            // Verificar si hay órdenes de cualquier estado de hoy
            const { data: todasOrdenes } = await supabase
                .from('orders')
                .select('id, status, total_amount, customer_name')
                .gte('created_at', `${today}T00:00:00`)
                .order('created_at', { ascending: false });
            
            console.log(`📊 Total órdenes de hoy: ${todasOrdenes?.length || 0}`);
            todasOrdenes?.forEach((orden, index) => {
                console.log(`   ${index + 1}. ${orden.status} - $${orden.total_amount} - ${orden.customer_name}`);
            });
            return;
        }

        // 2. Analizar cada orden
        for (const orden of ordenesPendientes) {
            console.log(`\n📦 ORDEN: ${orden.id.substring(0, 8)}... ($${orden.total_amount}) - ${orden.customer_name}`);
            
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
                        const { data: productData, error: prodError } = await supabase
                            .from('daily_products')
                            .select('id, name, stock_quantity, is_available')
                            .eq('id', item.product_id)
                            .single();
                        
                        if (prodError) {
                            console.log(`     ❌ Error verificando producto: ${prodError.message}`);
                        } else if (productData) {
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
            
            console.log(`\n   📊 RESUMEN ORDEN:`);
            console.log(`      Productos normales: ${tieneProductosNormales}`);
            console.log(`      Productos del día: ${tieneProductosDelDia}`);
            
            // Mostrar solo las primeras 3 órdenes para no hacer spam
            if (ordenesPendientes.indexOf(orden) >= 2) break;
        }
        
        console.log('\n🎯 CONCLUSIONES:');
        console.log('================');
        console.log('Si hay órdenes pendientes, el problema puede estar en:');
        console.log('1. La función seller_accept_order con productos del día');
        console.log('2. Validaciones de stock en daily_products');
        console.log('3. Permisos RLS en daily_products');
        console.log('\n📋 Para continuar debugging, necesitamos probar la función RPC directamente.');
        
    } catch (error) {
        console.error('💥 Error inesperado:', error);
    }
}

// Ejecutar
debugProductosDelDiaNode();
