// ===============================================
// PRUEBA ESPECÍFICA DEL PRODUCTO PLÁTANOS RELLENOS
// ID: c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47
// ===============================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjvhxwqahglsfdohqkhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSpecificProduct() {
    const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';
    
    console.log('🔍 ANÁLISIS COMPLETO DEL PRODUCTO: Plátanos Rellenos');
    console.log(`📦 ID: ${productId}\n`);
    
    try {
        // 1. VERIFICAR EL PRODUCTO EN DAILY_PRODUCTS
        const { data: dailyProduct, error: dailyError } = await supabase
            .from('daily_products')
            .select('*')
            .eq('id', productId)
            .single();
        
        console.log('1️⃣ PRODUCTO EN DAILY_PRODUCTS:');
        if (dailyError) {
            console.log('❌ Error:', dailyError.message);
        } else {
            console.log(`✅ Nombre: ${dailyProduct.name}`);
            console.log(`📊 Stock actual: ${dailyProduct.stock_quantity}`);
            console.log(`💰 Precio: $${dailyProduct.price}`);
            console.log(`📅 Creado: ${dailyProduct.created_at}`);
            console.log(`⏰ Expira: ${dailyProduct.expires_at}`);
            console.log(`🟢 Disponible: ${dailyProduct.is_available}`);
        }
        
        // 2. BUSCAR ÓRDENES QUE INCLUYAN ESTE PRODUCTO
        console.log('\n2️⃣ BÚSQUEDA DE ÓRDENES:');
        
        // Búsqueda por daily_product_id
        const { data: ordersByDaily, error: ordersDailyError } = await supabase
            .from('order_items')
            .select(`
                *,
                orders!inner(
                    id, 
                    status, 
                    created_at,
                    buyer_id,
                    total_amount
                )
            `)
            .eq('daily_product_id', productId)
            .order('orders.created_at', { ascending: false });
        
        console.log(`🔍 Por daily_product_id: ${ordersByDaily?.length || 0} órdenes`);
        if (ordersByDaily && ordersByDaily.length > 0) {
            ordersByDaily.forEach((order, index) => {
                console.log(`   ${index + 1}. Orden ${order.orders.id} - ${order.orders.status}`);
                console.log(`      Cantidad: ${order.quantity}, Precio: $${order.price}`);
                console.log(`      Fecha: ${order.orders.created_at}`);
            });
        }
        
        // Búsqueda por product_id con product_type='daily'
        const { data: ordersByType, error: ordersTypeError } = await supabase
            .from('order_items')
            .select(`
                *,
                orders!inner(
                    id, 
                    status, 
                    created_at,
                    total_amount
                )
            `)
            .eq('product_id', productId)
            .eq('product_type', 'daily')
            .order('orders.created_at', { ascending: false });
        
        console.log(`🔍 Por product_id + product_type='daily': ${ordersByType?.length || 0} órdenes`);
        if (ordersByType && ordersByType.length > 0) {
            ordersByType.forEach((order, index) => {
                console.log(`   ${index + 1}. Orden ${order.orders.id} - ${order.orders.status}`);
                console.log(`      Cantidad: ${order.quantity}, Precio: $${order.price}`);
                console.log(`      Fecha: ${order.orders.created_at}`);
            });
        }
        
        // 3. CALCULAR EL STOCK QUE DEBERÍA TENER
        console.log('\n3️⃣ CÁLCULO DE STOCK REAL:');
        
        const allOrders = [...(ordersByDaily || []), ...(ordersByType || [])];
        const uniqueOrders = allOrders.filter((order, index, self) => 
            index === self.findIndex(o => o.id === order.id)
        );
        
        const deliveredOrders = uniqueOrders.filter(order => 
            ['delivered', 'completed', 'accepted'].includes(order.orders.status)
        );
        
        const totalSold = deliveredOrders.reduce((sum, order) => sum + order.quantity, 0);
        
        console.log(`📦 Total órdenes encontradas: ${uniqueOrders.length}`);
        console.log(`✅ Órdenes entregadas/completadas: ${deliveredOrders.length}`);
        console.log(`🔢 Cantidad total vendida: ${totalSold}`);
        console.log(`📊 Stock actual en DB: ${dailyProduct?.stock_quantity || 'N/A'}`);
        
        if (dailyProduct) {
            const expectedStock = dailyProduct.stock_quantity + totalSold;
            console.log(`🎯 Stock que debería tener originalmente: ${expectedStock}`);
            console.log(`❓ ¿Stock correcto? ${totalSold === 0 ? '✅ SÍ' : '❌ NO - debería haberse descontado'}`);
        }
        
        // 4. VERIFICAR SI HAY INCONSISTENCIAS
        console.log('\n4️⃣ DIAGNÓSTICO DE PROBLEMAS:');
        
        if (deliveredOrders.length > 0 && dailyProduct?.stock_quantity === 50) {
            console.log('🚨 PROBLEMA DETECTADO:');
            console.log(`   - Hay ${deliveredOrders.length} órdenes entregadas`);
            console.log(`   - Cantidad vendida: ${totalSold}`);
            console.log(`   - Pero el stock sigue en 50 (valor inicial)`);
            console.log(`   - Esto indica que el stock NO se está descontando`);
            
            console.log('\n🔧 POSIBLES CAUSAS:');
            console.log('   1. El stockManager no está encontrando el producto');
            console.log('   2. La función no se está ejecutando en el momento correcto');
            console.log('   3. Hay un error en la lógica de búsqueda');
            console.log('   4. Los triggers de la BD no están funcionando');
        }
        
        // 5. MOSTRAR ÓRDENES DETALLADAS
        if (deliveredOrders.length > 0) {
            console.log('\n5️⃣ ÓRDENES QUE DEBERÍAN HABER DECREMENTADO STOCK:');
            deliveredOrders.forEach((order, index) => {
                console.log(`   ${index + 1}. Orden ${order.orders.id}`);
                console.log(`      📅 Fecha: ${order.orders.created_at}`);
                console.log(`      📦 Cantidad: ${order.quantity}`);
                console.log(`      🔄 Estado: ${order.orders.status}`);
                console.log(`      🆔 Order Item ID: ${order.id}`);
                console.log(`      🏷️ Product Type: ${order.product_type || 'N/A'}`);
                console.log(`      🔗 Daily Product ID: ${order.daily_product_id || 'N/A'}`);
                console.log(`      🔗 Product ID: ${order.product_id || 'N/A'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en análisis:', error);
    }
}

testSpecificProduct();
