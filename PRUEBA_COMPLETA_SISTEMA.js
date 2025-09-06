// SCRIPT DE PRUEBA COMPLETA DEL SISTEMA DE ÓRDENES
// ================================================
// Ejecutar en la consola del navegador (F12) después de cargar localhost:5173

console.log('🎯 PRUEBA COMPLETA DEL SISTEMA DE ÓRDENES ACTUALIZADO');
console.log('==================================================');

// Estado global para las pruebas
window.testState = {
    usuarioActual: null,
    ordenesDisponibles: [],
    pruebaEnProgreso: false
};

// Función principal de prueba completa
async function iniciarPruebaCompleta() {
    try {
        console.log('🚀 INICIANDO PRUEBA COMPLETA DEL SISTEMA');
        console.log('=======================================');

        // Paso 1: Verificar conexión y autenticación
        if (!await verificarSistema()) {
            return false;
        }

        // Paso 2: Cargar órdenes disponibles
        if (!await cargarOrdenesParaPrueba()) {
            return false;
        }

        // Paso 3: Mostrar menú de opciones
        mostrarMenuPruebas();

        return true;

    } catch (error) {
        console.error('💥 Error en prueba completa:', error);
        return false;
    }
}

// Verificar que el sistema esté listo
async function verificarSistema() {
    console.log('\n📋 1. VERIFICANDO SISTEMA...');
    
    // Verificar Supabase
    if (typeof supabase === 'undefined') {
        console.error('❌ CRÍTICO: Supabase no está disponible');
        console.log('💡 SOLUCIÓN: Asegúrate de estar en localhost:5173');
        return false;
    }
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('❌ CRÍTICO: Usuario no autenticado', authError);
        console.log('💡 SOLUCIÓN: Inicia sesión como vendedor');
        return false;
    }
    
    window.testState.usuarioActual = user;
    console.log('✅ Usuario autenticado:', user.email);
    console.log('✅ ID de usuario:', user.id);

    // Verificar funciones SQL
    const funcionesEsperadas = [
        'seller_accept_order',
        'seller_mark_ready_safe',
        'seller_mark_completed_pickup_safe'
    ];

    for (const funcion of funcionesEsperadas) {
        try {
            const { data, error } = await supabase
                .from('information_schema.routines')
                .select('routine_name')
                .eq('routine_name', funcion)
                .eq('routine_schema', 'public');

            if (error || !data || data.length === 0) {
                console.error(`❌ Función ${funcion} no encontrada`);
                return false;
            } else {
                console.log(`✅ Función ${funcion} disponible`);
            }
        } catch (error) {
            console.error(`❌ Error verificando ${funcion}:`, error);
            return false;
        }
    }

    return true;
}

// Cargar órdenes para prueba
async function cargarOrdenesParaPrueba() {
    console.log('\n📋 2. CARGANDO ÓRDENES PARA PRUEBA...');
    
    try {
        const { data: ordenes, error } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                status,
                delivery_type,
                delivery_method,
                created_at,
                accepted_at,
                ready_at,
                buyer_id,
                total,
                users!orders_buyer_id_fkey (
                    name,
                    phone
                )
            `)
            .in('status', ['pending', 'accepted', 'ready'])
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('❌ Error cargando órdenes:', error);
            return false;
        }

        window.testState.ordenesDisponibles = ordenes || [];
        console.log(`📦 Órdenes encontradas: ${ordenes?.length || 0}`);

        if (ordenes && ordenes.length > 0) {
            console.log('\n🔍 ÓRDENES DISPONIBLES PARA PRUEBA:');
            ordenes.forEach((orden, index) => {
                const tipo = orden.delivery_type || orden.delivery_method || 'No especificado';
                console.log(`   ${index + 1}. ${orden.order_number} - ${orden.status} - ${tipo} - Q${orden.total}`);
                console.log(`      ID: ${orden.id}`);
                console.log(`      Cliente: ${orden.users?.name || 'Sin nombre'}`);
            });
        } else {
            console.log('ℹ️ No hay órdenes activas para probar');
            console.log('💡 Ve al panel del comprador y crea una orden para poder probar');
        }

        return true;

    } catch (error) {
        console.error('💥 Error cargando órdenes:', error);
        return false;
    }
}

// Mostrar menú de opciones de prueba
function mostrarMenuPruebas() {
    console.log('\n🧪 MENÚ DE PRUEBAS DISPONIBLES:');
    console.log('==============================');
    
    const ordenes = window.testState.ordenesDisponibles;
    
    if (ordenes.length === 0) {
        console.log('❌ No hay órdenes para probar');
        console.log('💡 Crea una orden desde el panel del comprador primero');
        return;
    }

    // Buscar órdenes por estado
    const pendiente = ordenes.find(o => o.status === 'pending');
    const aceptada = ordenes.find(o => o.status === 'accepted');
    const lista = ordenes.find(o => o.status === 'ready' && ['pickup', 'dine-in', 'dine_in'].includes(o.delivery_type || o.delivery_method));

    console.log('📋 FUNCIONES DISPONIBLES:');
    
    if (pendiente) {
        console.log(`1. probarAceptar("${pendiente.id}") - Aceptar orden ${pendiente.order_number}`);
    }
    
    if (aceptada) {
        console.log(`2. probarMarcarListo("${aceptada.id}") - Marcar lista orden ${aceptada.order_number}`);
    }
    
    if (lista) {
        console.log(`3. probarCompletar("${lista.id}") - Completar orden ${lista.order_number}`);
    }
    
    console.log('\n🔄 OTRAS FUNCIONES:');
    console.log('4. recargarOrdenes() - Actualizar lista de órdenes');
    console.log('5. probarFlujoCompleto() - Buscar y probar flujo automático');
    console.log('6. mostrarEstadoActual() - Ver estado de todas las órdenes');
}

// Función para probar aceptar orden
async function probarAceptar(orderId) {
    console.log(`\n🧪 PROBANDO ACEPTAR ORDEN: ${orderId}`);
    console.log('======================================');

    if (window.testState.pruebaEnProgreso) {
        console.log('⏳ Ya hay una prueba en progreso, espera...');
        return;
    }

    window.testState.pruebaEnProgreso = true;

    try {
        const orden = window.testState.ordenesDisponibles.find(o => o.id === orderId);
        if (!orden) {
            console.error('❌ Orden no encontrada en la lista local');
            return;
        }

        console.log(`📋 Orden: ${orden.order_number} - Status: ${orden.status}`);

        if (orden.status !== 'pending') {
            console.error(`❌ La orden debe estar en estado 'pending', actual: ${orden.status}`);
            return;
        }

        console.log('🚀 Ejecutando seller_accept_order...');

        const { data: result, error } = await supabase.rpc('seller_accept_order', {
            p_order_id: orderId,
            p_seller_id: window.testState.usuarioActual.id
        });

        if (error) {
            console.error('❌ Error RPC:', error);
        } else {
            console.log('✅ Resultado RPC:', result);
            
            // Verificar cambio en BD
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: ordenActualizada } = await supabase
                .from('orders')
                .select('status, accepted_at')
                .eq('id', orderId)
                .single();
                
            console.log('🔍 Estado en BD:', ordenActualizada);
            
            if (ordenActualizada?.status === 'accepted') {
                console.log('🎉 ¡ÉXITO! La orden fue aceptada correctamente');
            } else {
                console.error('❌ La orden no cambió de estado en la BD');
            }
        }

    } catch (error) {
        console.error('💥 Error en prueba:', error);
    } finally {
        window.testState.pruebaEnProgreso = false;
        setTimeout(() => recargarOrdenes(), 2000);
    }
}

// Función para probar marcar listo
async function probarMarcarListo(orderId) {
    console.log(`\n🧪 PROBANDO MARCAR LISTA: ${orderId}`);
    console.log('===================================');

    if (window.testState.pruebaEnProgreso) {
        console.log('⏳ Ya hay una prueba en progreso, espera...');
        return;
    }

    window.testState.pruebaEnProgreso = true;

    try {
        const orden = window.testState.ordenesDisponibles.find(o => o.id === orderId);
        if (!orden) {
            console.error('❌ Orden no encontrada en la lista local');
            return;
        }

        console.log(`📋 Orden: ${orden.order_number} - Status: ${orden.status}`);

        if (orden.status !== 'accepted') {
            console.error(`❌ La orden debe estar en estado 'accepted', actual: ${orden.status}`);
            return;
        }

        console.log('🚀 Ejecutando seller_mark_ready_safe...');

        const { data: result, error } = await supabase.rpc('seller_mark_ready_safe', {
            p_order_id: orderId,
            p_seller_id: window.testState.usuarioActual.id
        });

        if (error) {
            console.error('❌ Error RPC:', error);
        } else {
            console.log('✅ Resultado RPC:', result);
            
            // Verificar cambio en BD
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: ordenActualizada } = await supabase
                .from('orders')
                .select('status, ready_at, delivery_type')
                .eq('id', orderId)
                .single();
                
            console.log('🔍 Estado en BD:', ordenActualizada);
            
            if (ordenActualizada?.status === 'ready') {
                console.log('🎉 ¡ÉXITO! La orden fue marcada como lista');
            } else {
                console.error('❌ La orden no cambió de estado en la BD');
            }
        }

    } catch (error) {
        console.error('💥 Error en prueba:', error);
    } finally {
        window.testState.pruebaEnProgreso = false;
        setTimeout(() => recargarOrdenes(), 2000);
    }
}

// Función para probar completar pickup
async function probarCompletar(orderId) {
    console.log(`\n🧪 PROBANDO COMPLETAR PICKUP/DINE-IN: ${orderId}`);
    console.log('=========================================');

    if (window.testState.pruebaEnProgreso) {
        console.log('⏳ Ya hay una prueba en progreso, espera...');
        return;
    }

    window.testState.pruebaEnProgreso = true;

    try {
        const orden = window.testState.ordenesDisponibles.find(o => o.id === orderId);
        if (!orden) {
            console.error('❌ Orden no encontrada en la lista local');
            return;
        }

        console.log(`📋 Orden: ${orden.order_number} - Status: ${orden.status}`);

        if (orden.status !== 'ready') {
            console.error(`❌ La orden debe estar en estado 'ready', actual: ${orden.status}`);
            return;
        }

        const tipo = orden.delivery_type || orden.delivery_method;
        if (!['pickup', 'dine-in', 'dine_in'].includes(tipo)) {
            console.error(`❌ Esta función es solo para pickup/dine-in, tipo actual: ${tipo}`);
            return;
        }

        console.log('🚀 Ejecutando seller_mark_completed_pickup_safe...');

        const { data: result, error } = await supabase.rpc('seller_mark_completed_pickup_safe', {
            p_order_id: orderId,
            p_seller_id: window.testState.usuarioActual.id
        });

        if (error) {
            console.error('❌ Error RPC:', error);
        } else {
            console.log('✅ Resultado RPC:', result);
            
            // Verificar cambio en BD
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: ordenActualizada } = await supabase
                .from('orders')
                .select('status, completed_at, delivered_at')
                .eq('id', orderId)
                .single();
                
            console.log('🔍 Estado en BD:', ordenActualizada);
            
            if (ordenActualizada?.status === 'completed') {
                console.log('🎉 ¡ÉXITO! La orden fue completada correctamente');
            } else {
                console.error('❌ La orden no cambió de estado en la BD');
            }
        }

    } catch (error) {
        console.error('💥 Error en prueba:', error);
    } finally {
        window.testState.pruebaEnProgreso = false;
        setTimeout(() => recargarOrdenes(), 2000);
    }
}

// Función para recargar órdenes
async function recargarOrdenes() {
    console.log('\n🔄 RECARGANDO ÓRDENES...');
    await cargarOrdenesParaPrueba();
    mostrarMenuPruebas();
}

// Función para mostrar estado actual
async function mostrarEstadoActual() {
    console.log('\n📊 ESTADO ACTUAL DEL SISTEMA');
    console.log('============================');
    
    try {
        const { data: ordenes, error } = await supabase
            .from('orders')
            .select('order_number, status, delivery_type, delivery_method, created_at')
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) {
            console.error('❌ Error cargando estado:', error);
            return;
        }

        const estados = {};
        ordenes?.forEach(orden => {
            estados[orden.status] = (estados[orden.status] || 0) + 1;
        });

        console.log('📈 RESUMEN POR ESTADO:');
        Object.entries(estados).forEach(([estado, cantidad]) => {
            console.log(`   ${estado}: ${cantidad} órdenes`);
        });

        console.log('\n📋 ÓRDENES RECIENTES:');
        ordenes?.slice(0, 10).forEach((orden, index) => {
            const tipo = orden.delivery_type || orden.delivery_method || 'N/A';
            console.log(`   ${index + 1}. ${orden.order_number} - ${orden.status} - ${tipo}`);
        });

    } catch (error) {
        console.error('💥 Error mostrando estado:', error);
    }
}

// Función para prueba automática completa
async function probarFlujoCompleto() {
    console.log('\n🤖 BUSCANDO ORDEN PARA FLUJO AUTOMÁTICO...');
    
    const ordenes = window.testState.ordenesDisponibles;
    const pendiente = ordenes.find(o => o.status === 'pending');
    
    if (!pendiente) {
        console.log('❌ No hay órdenes pendientes para flujo automático');
        console.log('💡 Crea una orden desde el panel del comprador');
        return;
    }

    console.log(`🎯 Ejecutando flujo completo con orden: ${pendiente.order_number}`);
    console.log('1️⃣ Aceptando orden...');
    
    await probarAceptar(pendiente.id);
    
    setTimeout(() => {
        console.log('2️⃣ Esperando y marcando lista...');
        probarMarcarListo(pendiente.id);
        
        setTimeout(() => {
            const tipo = pendiente.delivery_type || pendiente.delivery_method;
            if (['pickup', 'dine-in', 'dine_in'].includes(tipo)) {
                console.log('3️⃣ Completando orden pickup/dine-in...');
                probarCompletar(pendiente.id);
            } else {
                console.log('3️⃣ Orden de delivery - no se puede completar automáticamente');
            }
        }, 5000);
    }, 5000);
}

// Ejecutar automáticamente al cargar
iniciarPruebaCompleta();

// Mostrar instrucciones
console.log('\n📚 FUNCIONES DISPONIBLES:');
console.log('• iniciarPruebaCompleta() - Reiniciar todo el sistema de pruebas');
console.log('• probarAceptar("ORDER_ID") - Probar aceptar una orden específica');
console.log('• probarMarcarListo("ORDER_ID") - Probar marcar orden como lista');  
console.log('• probarCompletar("ORDER_ID") - Probar completar pickup/dine-in');
console.log('• recargarOrdenes() - Actualizar lista de órdenes');
console.log('• probarFlujoCompleto() - Prueba automática del flujo completo');
console.log('• mostrarEstadoActual() - Ver resumen del estado actual');
