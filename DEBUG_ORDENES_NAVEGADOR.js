// DEBUG ESPECÍFICO PARA EL PROBLEMA DE ÓRDENES QUE NO SE ACTUALIZAN
// ===================================================================
// Ejecutar en la consola del navegador para diagnosticar el problema

console.log('🔍 DEBUG ESPECÍFICO - PROBLEMA DE ÓRDENES');
console.log('==========================================');

// Función para obtener información detallada de la orden problemática
async function debugOrdenEspecifica() {
    try {
        console.log('📋 OBTENIENDO INFORMACIÓN DETALLADA...');
        
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 Usuario actual:', user?.id);
        
        // Obtener TODAS las órdenes sin filtros
        const { data: todasOrdenes, error: errorTodas } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (errorTodas) {
            console.error('❌ Error cargando todas las órdenes:', errorTodas);
            return;
        }

        console.log(`📦 Total de órdenes encontradas: ${todasOrdenes?.length || 0}`);
        
        // Mostrar todas las órdenes con detalles
        todasOrdenes?.forEach((orden, index) => {
            console.log(`\n📋 ORDEN ${index + 1}:`);
            console.log('   ID:', orden.id);
            console.log('   Número:', orden.order_number);
            console.log('   Status REAL:', orden.status);
            console.log('   Seller ID:', orden.seller_id || 'NULL');
            console.log('   Buyer ID:', orden.buyer_id);
            console.log('   Created:', orden.created_at);
            console.log('   Accepted:', orden.accepted_at || 'NULL');
            console.log('   Ready:', orden.ready_at || 'NULL');
            console.log('   Delivery Type:', orden.delivery_type || orden.delivery_method || 'NULL');
            console.log('   Total:', `Q${orden.total}`);
            
            // Detectar inconsistencias
            const problemas = [];
            if (orden.status === 'accepted' && !orden.accepted_at) {
                problemas.push('Estado accepted pero sin timestamp accepted_at');
            }
            if (orden.status === 'ready' && !orden.ready_at) {
                problemas.push('Estado ready pero sin timestamp ready_at');
            }
            if (orden.status === 'pending' && orden.accepted_at) {
                problemas.push('Estado pending pero con timestamp accepted_at');
            }
            if (!orden.seller_id && orden.status !== 'pending') {
                problemas.push('Sin seller_id asignado');
            }
            
            if (problemas.length > 0) {
                console.log('   ⚠️  PROBLEMAS DETECTADOS:');
                problemas.forEach(problema => console.log(`      - ${problema}`));
            }
        });

        // Buscar la orden que está causando problemas
        const ordenProblematica = todasOrdenes?.find(o => 
            o.order_number === '3 sep 2025-02:09 p. m.' || 
            (o.status === 'pending' && o.accepted_at)
        );

        if (ordenProblematica) {
            console.log('\n🎯 ORDEN PROBLEMÁTICA IDENTIFICADA:');
            console.log('=====================================');
            console.log('ID:', ordenProblematica.id);
            console.log('Esta es la función para probar:', `probarAceptar("${ordenProblematica.id}")`);
            
            // Probar la función directamente aquí
            console.log('\n🧪 PROBANDO FUNCIÓN seller_accept_order DIRECTAMENTE...');
            
            const { data: resultado, error: errorRPC } = await supabase.rpc('seller_accept_order', {
                p_order_id: ordenProblematica.id,
                p_seller_id: user.id
            });

            console.log('📊 Resultado RPC:', resultado);
            if (errorRPC) {
                console.error('❌ Error RPC:', errorRPC);
            }

            // Verificar si cambió después de 2 segundos
            setTimeout(async () => {
                console.log('\n🔍 VERIFICANDO CAMBIOS EN LA BD...');
                const { data: ordenVerificada } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', ordenProblematica.id)
                    .single();

                console.log('📋 Estado después de RPC:');
                console.log('   Status:', ordenVerificada?.status);
                console.log('   Accepted_at:', ordenVerificada?.accepted_at);
                console.log('   Seller_id:', ordenVerificada?.seller_id);

                if (ordenVerificada?.status === 'accepted') {
                    console.log('✅ ¡LA FUNCIÓN SÍ FUNCIONA! El problema podría ser de actualización en tiempo real');
                } else {
                    console.log('❌ La función NO está actualizando correctamente');
                }
            }, 2000);
        }

        return todasOrdenes;

    } catch (error) {
        console.error('💥 Error en debug:', error);
    }
}

// Función para verificar la consulta exacta del componente
async function debugConsultaComponente() {
    console.log('\n🔍 DEBUGGEANDO CONSULTA DEL COMPONENTE...');
    
    try {
        // Esta es la consulta EXACTA que usa el componente SellerOrderManagement
        const { data: ordenes, error } = await supabase
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
            .eq('status', 'pending')  // ← AQUÍ ESTÁ EL FILTRO
            .order('created_at', { ascending: false });

        console.log('📋 Consulta del componente (solo pending):');
        console.log('   Órdenes encontradas:', ordenes?.length || 0);
        
        if (ordenes && ordenes.length > 0) {
            ordenes.forEach((orden, index) => {
                console.log(`   ${index + 1}. ${orden.order_number} - ${orden.status}`);
            });
        }

        // Ahora hacer la consulta SIN el filtro de status
        const { data: todasParaComparar, error: error2 } = await supabase
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
            .order('created_at', { ascending: false })
            .limit(10);

        console.log('\n📋 Consulta SIN filtro (todas):');
        console.log('   Órdenes encontradas:', todasParaComparar?.length || 0);
        
        if (todasParaComparar && todasParaComparar.length > 0) {
            todasParaComparar.forEach((orden, index) => {
                console.log(`   ${index + 1}. ${orden.order_number} - ${orden.status}`);
            });
        }

        // Comparar para encontrar órdenes que deberían estar accepted pero aparecen como pending
        const discrepancias = [];
        todasParaComparar?.forEach(orden => {
            if (orden.accepted_at && orden.status === 'pending') {
                discrepancias.push(orden);
            }
        });

        if (discrepancias.length > 0) {
            console.log('\n⚠️  DISCREPANCIAS ENCONTRADAS:');
            discrepancias.forEach((orden, index) => {
                console.log(`   ${index + 1}. ${orden.order_number}: Status=${orden.status} pero Accepted_at=${orden.accepted_at}`);
            });
        }

    } catch (error) {
        console.error('💥 Error en debug consulta:', error);
    }
}

// Función para verificar subscripciones en tiempo real
function debugSubscripciones() {
    console.log('\n🔍 DEBUGGEANDO SUBSCRIPCIONES TIEMPO REAL...');
    
    // Crear subscripción de prueba
    const subscription = supabase
        .channel('orders_debug')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
                console.log('📡 CAMBIO DETECTADO EN TIEMPO REAL:');
                console.log('   Evento:', payload.eventType);
                console.log('   Datos:', payload.new || payload.old);
            }
        )
        .subscribe((status) => {
            console.log('📡 Estado de subscripción:', status);
        });

    console.log('✅ Subscripción de debug creada. Ahora intenta aceptar una orden y verás los cambios aquí.');
    
    // Función para limpiar la subscripción
    window.limpiarDebugSubscripcion = () => {
        subscription.unsubscribe();
        console.log('🧹 Subscripción de debug eliminada');
    };
}

// Función para forzar actualización de una orden específica
async function forzarActualizacionOrden(orderId) {
    console.log(`\n🔧 FORZANDO ACTUALIZACIÓN DE ORDEN: ${orderId}`);
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select();

        if (error) {
            console.error('❌ Error forzando actualización:', error);
        } else {
            console.log('✅ Orden actualizada:', data);
        }
    } catch (error) {
        console.error('💥 Error en forzar actualización:', error);
    }
}

// Ejecutar todas las funciones de debug
async function ejecutarDebugCompleto() {
    console.log('🚀 EJECUTANDO DEBUG COMPLETO...');
    
    await debugOrdenEspecifica();
    await debugConsultaComponente();
    debugSubscripciones();
    
    console.log('\n📚 FUNCIONES DE DEBUG DISPONIBLES:');
    console.log('• debugOrdenEspecifica() - Ver todas las órdenes con detalles');
    console.log('• debugConsultaComponente() - Comparar consultas del componente');
    console.log('• debugSubscripciones() - Monitorear cambios en tiempo real');
    console.log('• forzarActualizacionOrden("ORDER_ID") - Forzar actualización');
    console.log('• limpiarDebugSubscripcion() - Limpiar subscripciones de debug');
}

// Ejecutar automáticamente
ejecutarDebugCompleto();
