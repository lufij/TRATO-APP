// SCRIPT DE DEBUGGING PARA ÓRDENES DEL VENDEDOR
// ==============================================
// Ejecutar en la consola del navegador (F12)

console.log('🔧 DEBUGGING ÓRDENES VENDEDOR');
console.log('===============================');

// 1. Verificar si supabase está disponible
if (typeof supabase === 'undefined') {
    console.error('❌ PROBLEMA CRÍTICO: supabase no está definido');
    console.log('💡 SOLUCIONES:');
    console.log('   1. Asegúrate de estar en la página de la aplicación (localhost:5173)');
    console.log('   2. Espera a que la aplicación cargue completamente');
    console.log('   3. Si el problema persiste, hay un error en el cliente de Supabase');
    
    // Intentar encontrar supabase en el contexto global
    console.log('� Buscando supabase en el contexto global...');
    console.log('   window.supabase:', typeof window.supabase);
    console.log('   window._supabase:', typeof window._supabase);
    console.log('   globalThis.supabase:', typeof globalThis.supabase);
} else {
    console.log('✅ Supabase está disponible');
}

// 2. Verificar si el usuario está autenticado
async function checkAuth() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('❌ No se puede verificar autenticación: supabase no definido');
            return null;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('❌ Error de autenticación:', error);
            return null;
        }

        console.log('👤 Usuario autenticado:', user?.id || 'No logueado');
        return user;
    } catch (error) {
        console.error('💥 Error verificando autenticación:', error);
        return null;
    }
}

// 3. Verificar órdenes pendientes
async function debugOrders() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('❌ No se puede cargar órdenes: supabase no definido');
            return;
        }

        console.log('📋 Cargando órdenes pendientes...');
        
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    product_name,
                    quantity,
                    unit_price,
                    product_type,
                    product_id,
                    daily_product_id
                ),
                users!orders_buyer_id_fkey (
                    name,
                    phone
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error cargando órdenes:', error);
            return;
        }

        console.log('✅ Órdenes encontradas:', orders?.length || 0);
        
        if (orders && orders.length > 0) {
            orders.forEach((order, index) => {
                console.log(`\n📦 ORDEN ${index + 1}:`);
                console.log('   ID:', order.id);
                console.log('   Número:', order.order_number);
                console.log('   Status:', order.status);
                console.log('   Comprador:', order.users?.name || 'Sin nombre');
                console.log('   Total:', `Q${order.total}`);
                console.log('   Items:', order.order_items?.length || 0);
                
                if (order.order_items && order.order_items.length > 0) {
                    order.order_items.forEach((item, itemIndex) => {
                        console.log(`     Item ${itemIndex + 1}: ${item.product_name} x${item.quantity} (${item.product_type})`);
                    });
                }
            });
        } else {
            console.log('ℹ️ No hay órdenes pendientes');
        }

    } catch (error) {
        console.error('💥 Error en debugOrders:', error);
    }
}

// 3. Función para probar aceptar una orden
async function testAcceptOrder(orderId) {
    try {
        console.log(`🧪 Probando aceptar orden: ${orderId}`);
        
        // Obtener el usuario actual
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('❌ Error de autenticación:', authError);
            return;
        }

        console.log('👤 Usuario logueado:', user.id);

        // Intentar aceptar la orden usando la función RPC
        console.log('🚀 Llamando seller_accept_order...');
        const { data, error } = await supabase.rpc('seller_accept_order', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (error) {
            console.error('❌ Error en seller_accept_order:', error);
        } else {
            console.log('✅ Resultado de seller_accept_order:', data);
        }

    } catch (error) {
        console.error('💥 Error en testAcceptOrder:', error);
    }
}

// 4. Función para verificar funciones SQL
async function checkSQLFunctions() {
    try {
        console.log('🔍 Verificando funciones SQL...');
        
        const { data, error } = await supabase
            .from('information_schema.routines')
            .select('routine_name, routine_type')
            .in('routine_name', ['seller_accept_order', 'seller_mark_ready'])
            .eq('routine_schema', 'public');

        if (error) {
            console.error('❌ Error verificando funciones:', error);
        } else {
            console.log('📋 Funciones SQL encontradas:', data);
        }

    } catch (error) {
        console.error('💥 Error en checkSQLFunctions:', error);
    }
}

// Ejecutar automáticamente el debugging
debugOrders();
checkSQLFunctions();

// Mostrar instrucciones
console.log('\n📚 INSTRUCCIONES:');
console.log('1. Para probar aceptar una orden: testAcceptOrder("ORDER_ID_AQUI")');
console.log('2. Para recargar órdenes: debugOrders()');
console.log('3. Para verificar funciones SQL: checkSQLFunctions()');
