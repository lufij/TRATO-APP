/**
 * DIAGNÓSTICO ESPECÍFICO DEL PRODUCTO CERVEZA
 * ==========================================
 * Ejecutar en la consola del navegador mientras la app está corriendo
 */

async function diagnosticarProductoCerveza() {
    console.log('🍺 DIAGNÓSTICO ESPECÍFICO DEL PRODUCTO CERVEZA');
    console.log('='.repeat(50));

    const { supabase } = window;
    
    try {
        // 1. Buscar productos del día con "Cerveza"
        console.log('\n1️⃣ PRODUCTOS DEL DÍA CON CERVEZA:');
        const { data: productos, error: errorProductos } = await supabase
            .from('daily_products')
            .select('*')
            .ilike('name', '%cerveza%')
            .order('created_at', { ascending: false });

        if (errorProductos) {
            console.error('❌ Error buscando productos:', errorProductos);
            return;
        }

        console.log(`📊 Encontrados ${productos?.length || 0} productos con "cerveza":`);
        productos?.forEach((producto, index) => {
            console.log(`\n   ${index + 1}. ${producto.name}`);
            console.log(`      ID: ${producto.id}`);
            console.log(`      Stock: ${producto.stock_quantity}`);
            console.log(`      Expira: ${producto.expires_at}`);
            console.log(`      Disponible: ${producto.is_available}`);
            console.log(`      Seller ID: ${producto.seller_id}`);
            
            // Validaciones críticas
            const ahora = new Date();
            const expira = new Date(producto.expires_at);
            const noExpirado = expira > ahora;
            const tieneStock = producto.stock_quantity > 0;
            const estaDisponible = producto.is_available;
            
            console.log(`      ✅ No expirado: ${noExpirado}`);
            console.log(`      ✅ Tiene stock: ${tieneStock}`);
            console.log(`      ✅ Está disponible: ${estaDisponible}`);
            console.log(`      🎯 VALIDACIÓN FINAL: ${noExpirado && tieneStock && estaDisponible ? '✅ VÁLIDO' : '❌ NO VÁLIDO'}`);
        });

        // 2. Probar agregar al carrito manualmente
        if (productos && productos.length > 0) {
            const productoPrueba = productos[0];
            console.log(`\n2️⃣ PRUEBA DE AGREGAR AL CARRITO:`)
            console.log(`   Producto: ${productoPrueba.name}`);
            console.log(`   ID: ${productoPrueba.id}`);

            // Simular llamada a add_to_cart_safe
            console.log('\n🧪 SIMULANDO add_to_cart_safe...');
            
            // Obtener user ID actual (asumiendo que hay una sesión)
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session?.user) {
                console.error('❌ No hay usuario logueado');
                return;
            }
            
            const userId = session.session.user.id;
            console.log(`   User ID: ${userId}`);

            // Llamar a la función RPC
            try {
                const { data: resultado, error: errorRPC } = await supabase.rpc('add_to_cart_safe', {
                    p_user_id: userId,
                    p_product_id: productoPrueba.id,
                    p_quantity: 1,
                    p_product_type: 'daily'
                });

                if (errorRPC) {
                    console.error('❌ Error en RPC add_to_cart_safe:', errorRPC);
                } else {
                    console.log('✅ Resultado de add_to_cart_safe:', resultado);
                    if (resultado && resultado.length > 0) {
                        const res = resultado[0];
                        console.log(`   Success: ${res.success}`);
                        console.log(`   Message: ${res.message}`);
                        console.log(`   Cart Item ID: ${res.cart_item_id}`);
                    }
                }
            } catch (error) {
                console.error('❌ Error ejecutando RPC:', error);
            }
        }

        // 3. Verificar items en carrito
        console.log('\n3️⃣ ITEMS EN CARRITO CON CERVEZA:');
        const { data: itemsCarrito, error: errorCarrito } = await supabase
            .from('cart_items')
            .select('*')
            .or(`product_name.ilike.%cerveza%,product_id.in.(${productos?.map(p => p.id).join(',') || 'null'})`);

        if (errorCarrito) {
            console.error('❌ Error buscando en carrito:', errorCarrito);
        } else {
            console.log(`📊 Items en carrito: ${itemsCarrito?.length || 0}`);
            itemsCarrito?.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.product_name} - Cantidad: ${item.quantity} - Tipo: ${item.product_type}`);
            });
        }

        // 4. Test de validación manual
        if (productos && productos.length > 0) {
            const productoPrueba = productos[0];
            console.log(`\n4️⃣ VALIDACIÓN MANUAL PASO A PASO:`);
            console.log(`   Producto: ${productoPrueba.name}`);
            
            // Hacer exactamente lo que hace validate_and_get_product_data
            const ahora = new Date();
            const expira = new Date(productoPrueba.expires_at);
            
            console.log(`   Condiciones:`);
            console.log(`     - expires_at > NOW(): ${expira} > ${ahora} = ${expira > ahora}`);
            console.log(`     - stock_quantity > 0: ${productoPrueba.stock_quantity} > 0 = ${productoPrueba.stock_quantity > 0}`);
            console.log(`     - is_available: ${productoPrueba.is_available}`);
            
            const esValido = expira > ahora && productoPrueba.stock_quantity > 0 && productoPrueba.is_available;
            console.log(`   🎯 RESULTADO FINAL: ${esValido ? '✅ VÁLIDO' : '❌ NO VÁLIDO'}`);
            
            if (!esValido) {
                console.log('\n❌ RAZONES DEL FALLO:');
                if (expira <= ahora) console.log('   - Producto expirado');
                if (productoPrueba.stock_quantity <= 0) console.log('   - Sin stock');
                if (!productoPrueba.is_available) console.log('   - Marcado como no disponible');
            }
        }

    } catch (error) {
        console.error('❌ Error general en diagnóstico:', error);
    }
}

// Ejecutar automáticamente
diagnosticarProductoCerveza();

// También hacer disponible globalmente para re-ejecutar
window.diagnosticarProductoCerveza = diagnosticarProductoCerveza;
