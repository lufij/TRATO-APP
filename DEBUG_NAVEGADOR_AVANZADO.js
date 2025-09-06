// DEBUGGER AVANZADO PARA ÓRDENES - EJECUTAR EN CONSOLA DEL NAVEGADOR
// ===================================================================
// Este script va a investigar exactamente qué está pasando con las órdenes

console.log('🔍 DEBUGGER AVANZADO DE ÓRDENES INICIADO');
console.log('======================================');

// Estado global del debugger
window.debugState = {
    usuario: null,
    ordenesRaw: [],
    problemasEncontrados: [],
    ultimaOrdenProbada: null
};

// Función principal de debugging
async function iniciarDebugCompleto() {
    try {
        console.log('🚀 INICIANDO DEBUG COMPLETO DEL SISTEMA DE ÓRDENES');
        console.log('=================================================');

        // Paso 1: Obtener usuario actual
        if (!await obtenerUsuarioActual()) {
            return;
        }

        // Paso 2: Cargar órdenes con información detallada
        await cargarOrdenesDetalladas();

        // Paso 3: Analizar inconsistencias
        await analizarInconsistencias();

        // Paso 4: Verificar funciones SQL
        await verificarFuncionesSQL();

        // Paso 5: Probar una orden específica paso a paso
        await sugerirPruebaDetallada();

        console.log('\n✅ DEBUG COMPLETO FINALIZADO');
        console.log('📋 FUNCIONES DISPONIBLES PARA CONTINUAR:');
        console.log('• debugearOrden("ORDER_ID") - Debug específico de una orden');
        console.log('• compararEstados() - Comparar estado antes/después');
        console.log('• probarFuncionPasoAPaso("ORDER_ID") - Prueba detallada');
        console.log('• mostrarProblemas() - Ver todos los problemas encontrados');

    } catch (error) {
        console.error('💥 Error en debug completo:', error);
    }
}

// Obtener usuario actual
async function obtenerUsuarioActual() {
    try {
        console.log('\n👤 OBTENIENDO USUARIO ACTUAL...');
        
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            console.error('❌ Usuario no autenticado:', error);
            return false;
        }

        window.debugState.usuario = user;
        console.log('✅ Usuario:', user.email);
        console.log('✅ ID:', user.id);
        console.log('✅ Rol en metadata:', user.user_metadata?.role || 'No especificado');

        return true;
    } catch (error) {
        console.error('💥 Error obteniendo usuario:', error);
        return false;
    }
}

// Cargar órdenes con información muy detallada
async function cargarOrdenesDetalladas() {
    console.log('\n📦 CARGANDO ÓRDENES CON DETALLES COMPLETOS...');
    
    try {
        // Query muy detallada para obtener toda la información
        const { data: ordenes, error } = await supabase
            .from('orders')
            .select(`
                *,
                users!orders_buyer_id_fkey (
                    id,
                    name,
                    email,
                    role
                ),
                users!orders_seller_id_fkey (
                    id,
                    name,
                    email,
                    role
                ),
                order_items (
                    id,
                    product_name,
                    quantity,
                    unit_price,
                    product_type,
                    product_id,
                    daily_product_id,
                    daily_products (
                        id,
                        name,
                        is_available,
                        stock
                    )
                )
            `)
            .in('status', ['pending', 'accepted', 'ready'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('❌ Error cargando órdenes detalladas:', error);
            return;
        }

        window.debugState.ordenesRaw = ordenes || [];
        console.log(`📊 Órdenes cargadas: ${ordenes?.length || 0}`);

        if (ordenes && ordenes.length > 0) {
            console.log('\n🔍 ANÁLISIS DETALLADO DE ÓRDENES:');
            ordenes.forEach((orden, index) => {
                console.log(`\n--- ORDEN ${index + 1}: ${orden.order_number} ---`);
                console.log(`ID: ${orden.id}`);
                console.log(`Status: ${orden.status}`);
                console.log(`Seller ID: ${orden.seller_id}`);
                console.log(`Buyer ID: ${orden.buyer_id}`);
                console.log(`Delivery Type: ${orden.delivery_type || 'null'}`);
                console.log(`Delivery Method: ${orden.delivery_method || 'null'}`);
                console.log(`Created: ${orden.created_at}`);
                console.log(`Accepted: ${orden.accepted_at || 'null'}`);
                console.log(`Ready: ${orden.ready_at || 'null'}`);
                console.log(`Updated: ${orden.updated_at}`);
                console.log(`Items: ${orden.order_items?.length || 0}`);
                
                // Verificar inconsistencias
                const problemas = [];
                if (orden.status === 'accepted' && !orden.accepted_at) {
                    problemas.push('Status accepted pero sin accepted_at');
                }
                if (orden.status === 'ready' && !orden.ready_at) {
                    problemas.push('Status ready pero sin ready_at');
                }
                if (orden.accepted_at && orden.status === 'pending') {
                    problemas.push('Tiene accepted_at pero status es pending');
                }
                
                if (problemas.length > 0) {
                    console.log(`⚠️ PROBLEMAS DETECTADOS:`);
                    problemas.forEach(p => console.log(`   - ${p}`));
                    window.debugState.problemasEncontrados.push({
                        orden: orden.order_number,
                        id: orden.id,
                        problemas: problemas
                    });
                }
            });
        }

    } catch (error) {
        console.error('💥 Error cargando órdenes detalladas:', error);
    }
}

// Analizar inconsistencias encontradas
async function analizarInconsistencias() {
    console.log('\n🔍 ANALIZANDO INCONSISTENCIAS...');
    
    const problemas = window.debugState.problemasEncontrados;
    
    if (problemas.length === 0) {
        console.log('✅ No se encontraron inconsistencias en los datos');
        return;
    }

    console.log(`⚠️ TOTAL DE PROBLEMAS ENCONTRADOS: ${problemas.length}`);
    problemas.forEach((problema, index) => {
        console.log(`\n${index + 1}. Orden ${problema.orden} (${problema.id}):`);
        problema.problemas.forEach(p => console.log(`   - ${p}`));
    });

    // Sugerir acciones correctivas
    console.log('\n💡 ACCIONES CORRECTIVAS SUGERIDAS:');
    console.log('1. Ejecutar las consultas SQL de DEBUG_SUPABASE_QUERIES.sql');
    console.log('2. Verificar que las funciones SQL estén actualizando correctamente');
    console.log('3. Revisar triggers o políticas RLS que puedan interferir');
}

// Verificar funciones SQL directamente
async function verificarFuncionesSQL() {
    console.log('\n🔧 VERIFICANDO FUNCIONES SQL...');
    
    const funciones = [
        'seller_accept_order',
        'seller_mark_ready',
        'seller_mark_ready_safe'
    ];

    for (const funcion of funciones) {
        try {
            const { data, error } = await supabase
                .from('information_schema.routines')
                .select('routine_name, routine_definition')
                .eq('routine_name', funcion)
                .eq('routine_schema', 'public');

            if (error) {
                console.error(`❌ Error verificando ${funcion}:`, error);
                continue;
            }

            if (data && data.length > 0) {
                console.log(`✅ Función ${funcion}: Disponible`);
                
                // Mostrar parte de la definición para debug
                if (data[0].routine_definition) {
                    const def = data[0].routine_definition.substring(0, 200) + '...';
                    console.log(`   Definición (primeros 200 chars): ${def}`);
                }
            } else {
                console.log(`❌ Función ${funcion}: NO ENCONTRADA`);
            }
        } catch (error) {
            console.error(`💥 Error verificando ${funcion}:`, error);
        }
    }
}

// Sugerir prueba detallada
async function sugerirPruebaDetallada() {
    console.log('\n🧪 SUGERENCIAS PARA PRUEBA DETALLADA...');
    
    const ordenes = window.debugState.ordenesRaw;
    const pendiente = ordenes.find(o => o.status === 'pending');
    
    if (pendiente) {
        console.log(`🎯 ORDEN SUGERIDA PARA PRUEBA: ${pendiente.order_number}`);
        console.log(`   ID: ${pendiente.id}`);
        console.log(`   Status actual: ${pendiente.status}`);
        console.log(`   Seller ID: ${pendiente.seller_id || 'null'}`);
        console.log('\n📋 COMANDOS PARA PROBAR:');
        console.log(`   probarFuncionPasoAPaso("${pendiente.id}")`);
    } else {
        console.log('❌ No hay órdenes pendientes para probar');
    }
}

// Función para debuggear una orden específica
async function debugearOrden(orderId) {
    console.log(`\n🔍 DEBUGGEANDO ORDEN ESPECÍFICA: ${orderId}`);
    console.log('=======================================');

    try {
        // Obtener datos completos de la orden
        const { data: orden, error } = await supabase
            .from('orders')
            .select(`
                *,
                users!orders_buyer_id_fkey (*),
                users!orders_seller_id_fkey (*),
                order_items (*, daily_products(*))
            `)
            .eq('id', orderId)
            .single();

        if (error) {
            console.error('❌ Error obteniendo orden:', error);
            return;
        }

        console.log('📋 DATOS COMPLETOS DE LA ORDEN:');
        console.log(JSON.stringify(orden, null, 2));

        // Verificar seller_id
        const usuarioActual = window.debugState.usuario;
        console.log(`\n🔍 VERIFICACIÓN DE PERMISOS:`);
        console.log(`Usuario actual: ${usuarioActual.id}`);
        console.log(`Seller de la orden: ${orden.seller_id}`);
        console.log(`¿Coinciden?: ${usuarioActual.id === orden.seller_id ? 'SÍ' : 'NO'}`);

        if (usuarioActual.id !== orden.seller_id) {
            console.log(`⚠️ PROBLEMA: El usuario actual no es el seller de esta orden`);
            console.log(`💡 SOLUCIÓN: Esta orden pertenece a otro seller`);
        }

        return orden;

    } catch (error) {
        console.error('💥 Error en debug de orden específica:', error);
    }
}

// Función para probar paso a paso
async function probarFuncionPasoAPaso(orderId) {
    console.log(`\n🧪 PRUEBA PASO A PASO PARA: ${orderId}`);
    console.log('===================================');

    try {
        // Paso 1: Verificar estado inicial
        console.log('1️⃣ VERIFICANDO ESTADO INICIAL...');
        let { data: estadoInicial, error } = await supabase
            .from('orders')
            .select('id, order_number, status, seller_id, accepted_at, ready_at')
            .eq('id', orderId)
            .single();

        if (error) {
            console.error('❌ Error obteniendo estado inicial:', error);
            return;
        }

        console.log('📊 Estado inicial:', estadoInicial);

        // Paso 2: Verificar usuario actual
        const usuario = window.debugState.usuario;
        console.log(`\n2️⃣ VERIFICANDO USUARIO: ${usuario.id}`);
        console.log(`   Seller de la orden: ${estadoInicial.seller_id}`);

        if (estadoInicial.seller_id !== usuario.id) {
            console.error('❌ PROBLEMA: Usuario no coincide con seller de la orden');
            return;
        }

        // Paso 3: Ejecutar función con logging detallado
        console.log('\n3️⃣ EJECUTANDO FUNCIÓN seller_accept_order...');
        
        const inicioTiempo = Date.now();
        
        const { data: resultado, error: errorRPC } = await supabase.rpc('seller_accept_order', {
            p_order_id: orderId,
            p_seller_id: usuario.id
        });

        const tiempoTranscurrido = Date.now() - inicioTiempo;
        console.log(`⏱️ Tiempo transcurrido: ${tiempoTranscurrido}ms`);

        if (errorRPC) {
            console.error('❌ Error en RPC:', errorRPC);
            console.log('🔍 Detalles del error:', JSON.stringify(errorRPC, null, 2));
            return;
        }

        console.log('✅ Resultado RPC:', resultado);

        // Paso 4: Verificar estado después
        console.log('\n4️⃣ VERIFICANDO ESTADO DESPUÉS DE LA FUNCIÓN...');
        
        // Esperar un poco por si hay propagación
        await new Promise(resolve => setTimeout(resolve, 2000));

        let { data: estadoFinal, error: errorFinal } = await supabase
            .from('orders')
            .select('id, order_number, status, seller_id, accepted_at, ready_at, updated_at')
            .eq('id', orderId)
            .single();

        if (errorFinal) {
            console.error('❌ Error obteniendo estado final:', errorFinal);
            return;
        }

        console.log('📊 Estado final:', estadoFinal);

        // Paso 5: Comparar estados
        console.log('\n5️⃣ COMPARACIÓN DE ESTADOS:');
        console.log('INICIAL vs FINAL:');
        console.log(`Status: ${estadoInicial.status} → ${estadoFinal.status}`);
        console.log(`Accepted_at: ${estadoInicial.accepted_at || 'null'} → ${estadoFinal.accepted_at || 'null'}`);
        console.log(`Updated_at: ${estadoInicial.updated_at} → ${estadoFinal.updated_at}`);

        // Paso 6: Diagnóstico
        console.log('\n6️⃣ DIAGNÓSTICO:');
        if (estadoFinal.status === 'accepted' && estadoFinal.accepted_at) {
            console.log('🎉 ✅ ÉXITO: La función funcionó correctamente');
        } else if (estadoFinal.status === 'accepted' && !estadoFinal.accepted_at) {
            console.log('⚠️ PROBLEMA: Status cambió a accepted pero no se estableció accepted_at');
        } else if (estadoFinal.status === estadoInicial.status) {
            console.log('❌ PROBLEMA: El status no cambió');
        }

        // Guardar para referencia
        window.debugState.ultimaOrdenProbada = {
            id: orderId,
            estadoInicial,
            estadoFinal,
            resultado,
            tiempoTranscurrido
        };

    } catch (error) {
        console.error('💥 Error en prueba paso a paso:', error);
    }
}

// Función para comparar estados
async function compararEstados() {
    if (!window.debugState.ultimaOrdenProbada) {
        console.log('❌ No hay datos de comparación. Ejecuta probarFuncionPasoAPaso() primero.');
        return;
    }

    const datos = window.debugState.ultimaOrdenProbada;
    console.log('\n📊 COMPARACIÓN DETALLADA DE ESTADOS:');
    console.log('=====================================');
    
    console.table([
        {
            Campo: 'status',
            Inicial: datos.estadoInicial.status,
            Final: datos.estadoFinal.status,
            Cambió: datos.estadoInicial.status !== datos.estadoFinal.status ? 'SÍ' : 'NO'
        },
        {
            Campo: 'accepted_at',
            Inicial: datos.estadoInicial.accepted_at || 'null',
            Final: datos.estadoFinal.accepted_at || 'null',
            Cambió: datos.estadoInicial.accepted_at !== datos.estadoFinal.accepted_at ? 'SÍ' : 'NO'
        },
        {
            Campo: 'updated_at',
            Inicial: datos.estadoInicial.updated_at,
            Final: datos.estadoFinal.updated_at,
            Cambió: datos.estadoInicial.updated_at !== datos.estadoFinal.updated_at ? 'SÍ' : 'NO'
        }
    ]);
}

// Función para mostrar todos los problemas
function mostrarProblemas() {
    const problemas = window.debugState.problemasEncontrados;
    
    if (problemas.length === 0) {
        console.log('✅ No se han detectado problemas');
        return;
    }

    console.log('\n⚠️ RESUMEN DE TODOS LOS PROBLEMAS DETECTADOS:');
    console.log('===========================================');
    
    problemas.forEach((problema, index) => {
        console.log(`\n${index + 1}. Orden ${problema.orden}:`);
        console.log(`   ID: ${problema.id}`);
        problema.problemas.forEach(p => console.log(`   ❌ ${p}`));
    });
}

// Ejecutar automáticamente
iniciarDebugCompleto();

console.log('\n🔧 DEBUGGER CARGADO COMPLETAMENTE');
console.log('Funciones disponibles: debugearOrden(), probarFuncionPasoAPaso(), compararEstados(), mostrarProblemas()');
