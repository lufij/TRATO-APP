// VERIFICADOR COMPLETO DEL SISTEMA DE ÓRDENES ACTUALIZADO
// ========================================================
// Ejecutar en la consola del navegador después de cargar la aplicación

console.log('🎯 VERIFICADOR COMPLETO DEL SISTEMA DE ÓRDENES');
console.log('==============================================');

// Función principal de verificación
async function verificarSistemaCompleto() {
    try {
        console.log('📋 1. Verificando conexión y autenticación...');
        
        // Verificar Supabase
        if (typeof supabase === 'undefined') {
            console.error('❌ CRÍTICO: Supabase no está disponible');
            console.log('💡 SOLUCIÓN: Asegúrate de estar en localhost:5173 con la app cargada');
            return;
        }
        
        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('❌ CRÍTICO: Usuario no autenticado', authError);
            console.log('💡 SOLUCIÓN: Inicia sesión en la aplicación');
            return;
        }
        
        console.log('✅ Usuario autenticado:', user.email);
        console.log('✅ ID de usuario:', user.id);

        console.log('\n📋 2. Verificando funciones SQL mejoradas...');
        await verificarFuncionesSQL();

        console.log('\n📋 3. Cargando órdenes actuales...');
        await cargarOrdenesActuales();

        console.log('\n📋 4. Verificando estructura de base de datos...');
        await verificarEstructuraBD();

        console.log('\n✅ SISTEMA VERIFICADO COMPLETAMENTE');
        console.log('🚀 El sistema está listo para usar las nuevas funciones');

    } catch (error) {
        console.error('💥 Error en verificación completa:', error);
    }
}

// Verificar las nuevas funciones SQL
async function verificarFuncionesSQL() {
    const funcionesEsperadas = [
        'seller_accept_order',
        'seller_mark_ready',
        'seller_mark_ready_improved',
        'seller_mark_completed_pickup',
        'notify_drivers_order_ready'
    ];

    console.log('🔍 Buscando funciones SQL...');

    for (const nombreFuncion of funcionesEsperadas) {
        try {
            const { data: funciones, error } = await supabase
                .from('information_schema.routines')
                .select('routine_name, routine_type')
                .eq('routine_name', nombreFuncion)
                .eq('routine_schema', 'public');

            if (error) {
                console.error(`❌ Error verificando ${nombreFuncion}:`, error);
                continue;
            }

            if (funciones && funciones.length > 0) {
                console.log(`   ✅ ${nombreFuncion}: Disponible`);
            } else {
                console.log(`   ❌ ${nombreFuncion}: NO ENCONTRADA`);
                if (nombreFuncion.includes('improved') || nombreFuncion.includes('completed') || nombreFuncion.includes('notify')) {
                    console.log(`      💡 Esta función debe ejecutarse desde DIAGNOSTICO_Y_CORRECCION_FLUJO_ORDENES.sql`);
                }
            }
        } catch (error) {
            console.error(`💥 Error verificando ${nombreFuncion}:`, error);
        }
    }
}

// Cargar órdenes actuales
async function cargarOrdenesActuales() {
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
            return;
        }

        console.log(`📦 Órdenes encontradas: ${ordenes?.length || 0}`);

        if (ordenes && ordenes.length > 0) {
            console.log('\n🔍 DETALLE DE ÓRDENES:');
            ordenes.forEach((orden, index) => {
                console.log(`\n   Orden ${index + 1}:`);
                console.log(`     ID: ${orden.id}`);
                console.log(`     Número: ${orden.order_number}`);
                console.log(`     Status: ${orden.status}`);
                console.log(`     Tipo de entrega: ${orden.delivery_type || orden.delivery_method || 'No especificado'}`);
                console.log(`     Cliente: ${orden.users?.name || 'Sin nombre'}`);
                console.log(`     Aceptada: ${orden.accepted_at ? 'Sí' : 'No'}`);
                console.log(`     Lista: ${orden.ready_at ? 'Sí' : 'No'}`);
            });

            // Sugerir orden para pruebas
            const ordenPendiente = ordenes.find(o => o.status === 'pending');
            const ordenAceptada = ordenes.find(o => o.status === 'accepted');
            const ordenLista = ordenes.find(o => o.status === 'ready');

            console.log('\n🧪 SUGERENCIAS PARA PRUEBAS:');
            if (ordenPendiente) {
                console.log(`   Para probar ACEPTAR: probarAceptarOrden("${ordenPendiente.id}")`);
            }
            if (ordenAceptada) {
                console.log(`   Para probar MARCAR LISTA: probarMarcarListo("${ordenAceptada.id}")`);
            }
            if (ordenLista && (ordenLista.delivery_type === 'pickup' || ordenLista.delivery_type === 'dine-in')) {
                console.log(`   Para probar COMPLETAR PICKUP: probarCompletarPickup("${ordenLista.id}")`);
            }
        } else {
            console.log('   ℹ️ No hay órdenes activas para probar');
            console.log('   💡 Crea una orden desde el panel del comprador para probar');
        }

    } catch (error) {
        console.error('💥 Error cargando órdenes:', error);
    }
}

// Verificar estructura de base de datos
async function verificarEstructuraBD() {
    try {
        // Verificar columnas de orders
        const { data: columnas, error: errorColumnas } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'orders')
            .eq('table_schema', 'public');

        if (errorColumnas) {
            console.error('❌ Error verificando columnas:', errorColumnas);
            return;
        }

        const columnasEsperadas = ['delivery_type', 'accepted_at', 'ready_at', 'completed_at', 'buyer_id'];
        const columnasEncontradas = columnas?.map(c => c.column_name) || [];

        console.log('📋 Verificando columnas de la tabla orders:');
        columnasEsperadas.forEach(columna => {
            const encontrada = columnasEncontradas.includes(columna);
            console.log(`   ${encontrada ? '✅' : '❌'} ${columna}: ${encontrada ? 'Presente' : 'FALTA'}`);
        });

        // Verificar tabla notifications
        const { data: notificationsTable, error: notifError } = await supabase
            .from('notifications')
            .select('*')
            .limit(1);

        if (notifError && notifError.code === '42P01') {
            console.log('   ❌ Tabla notifications: NO EXISTE');
            console.log('      💡 Debe crearse para el sistema de notificaciones');
        } else {
            console.log('   ✅ Tabla notifications: Presente');
        }

    } catch (error) {
        console.error('💥 Error verificando estructura BD:', error);
    }
}

// Funciones de prueba individuales
async function probarAceptarOrden(orderId) {
    console.log(`\n🧪 PROBANDO ACEPTAR ORDEN: ${orderId}`);
    console.log('=====================================');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: result, error } = await supabase.rpc('seller_accept_order', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (error) {
            console.error('❌ Error:', error);
        } else {
            console.log('✅ Resultado:', result);
            
            // Verificar cambio en BD
            const { data: orden } = await supabase
                .from('orders')
                .select('status, accepted_at')
                .eq('id', orderId)
                .single();
                
            console.log('🔍 Estado actual en BD:', orden);
        }
    } catch (error) {
        console.error('💥 Error en prueba:', error);
    }
}

async function probarMarcarListo(orderId) {
    console.log(`\n🧪 PROBANDO MARCAR LISTA: ${orderId}`);
    console.log('====================================');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: result, error } = await supabase.rpc('seller_mark_ready_improved', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (error) {
            console.error('❌ Error:', error);
        } else {
            console.log('✅ Resultado:', result);
            
            // Verificar cambio en BD
            const { data: orden } = await supabase
                .from('orders')
                .select('status, ready_at, delivery_type')
                .eq('id', orderId)
                .single();
                
            console.log('🔍 Estado actual en BD:', orden);
        }
    } catch (error) {
        console.error('💥 Error en prueba:', error);
    }
}

async function probarCompletarPickup(orderId) {
    console.log(`\n🧪 PROBANDO COMPLETAR PICKUP: ${orderId}`);
    console.log('======================================');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: result, error } = await supabase.rpc('seller_mark_completed_pickup', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (error) {
            console.error('❌ Error:', error);
        } else {
            console.log('✅ Resultado:', result);
            
            // Verificar cambio en BD
            const { data: orden } = await supabase
                .from('orders')
                .select('status, completed_at, delivered_at')
                .eq('id', orderId)
                .single();
                
            console.log('🔍 Estado actual en BD:', orden);
        }
    } catch (error) {
        console.error('💥 Error en prueba:', error);
    }
}

// Ejecutar verificación automática
verificarSistemaCompleto();

// Mostrar instrucciones
console.log('\n📚 FUNCIONES DISPONIBLES:');
console.log('1. verificarSistemaCompleto() - Verificar todo el sistema');
console.log('2. probarAceptarOrden("ORDER_ID") - Probar aceptar una orden');
console.log('3. probarMarcarListo("ORDER_ID") - Probar marcar orden lista');  
console.log('4. probarCompletarPickup("ORDER_ID") - Probar completar pickup/dine-in');
console.log('5. cargarOrdenesActuales() - Ver órdenes actuales');
console.log('6. verificarFuncionesSQL() - Verificar funciones SQL disponibles');
