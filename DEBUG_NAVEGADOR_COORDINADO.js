// SCRIPT DE DEBUG PARA NAVEGADOR - VERSIÓN COORDINADA CON SQL
// ============================================================
// Ejecuta este script en la consola del navegador mientras tienes la app abierta

// 🔧 CONFIGURACIÓN INICIAL
const DEBUG_ORDERS = {
    // Configurar estas variables según tu setup
    SELLER_ID: null, // Se detectará automáticamente
    SUPABASE_CLIENT: null, // Se detectará automáticamente
    USER_ID: null, // Se detectará automáticamente
    
    // Función para detectar configuración automáticamente
    async detectarConfiguracion() {
        console.log('🔍 Detectando configuración de la app...');
        
        // Buscar Supabase client
        if (window.supabase) {
            this.SUPABASE_CLIENT = window.supabase;
            console.log('✅ Supabase client encontrado');
        } else if (window.__SUPABASE_CLIENT__) {
            this.SUPABASE_CLIENT = window.__SUPABASE_CLIENT__;
            console.log('✅ Supabase client encontrado en __SUPABASE_CLIENT__');
        } else {
            console.log('❌ No se encontró Supabase client');
            return false;
        }
        
        // Obtener usuario actual
        const { data: { user } } = await this.SUPABASE_CLIENT.auth.getUser();
        if (user) {
            this.USER_ID = user.id;
            console.log('✅ Usuario detectado:', user.email);
            
            // Verificar si es vendedor
            const { data: sellerData } = await this.SUPABASE_CLIENT
                .from('sellers')
                .select('id')
                .eq('user_id', user.id)
                .single();
            
            if (sellerData) {
                this.SELLER_ID = sellerData.id;
                console.log('✅ Seller ID detectado:', this.SELLER_ID);
            }
        }
        
        return true;
    },
    
    // 📊 FUNCIÓN PRINCIPAL: Verificar estado de órdenes
    async verificarEstadoOrdenes() {
        console.log('📊 VERIFICANDO ESTADO DE ÓRDENES...');
        console.log('=====================================');
        
        try {
            // 1. Obtener órdenes que deberían estar disponibles (según UI)
            const { data: ordenesPendientes, error: errorPendientes } = await this.SUPABASE_CLIENT
                .from('orders')
                .select(`
                    id, status, total_amount, customer_name, phone_number,
                    created_at, accepted_at, updated_at, delivery_type
                `)
                .eq('status', 'pending')
                .gte('created_at', new Date().toISOString().split('T')[0]) // Solo de hoy
                .order('created_at', { ascending: false });
            
            if (errorPendientes) {
                console.error('❌ Error obteniendo órdenes pendientes:', errorPendientes);
                return;
            }
            
            console.log('📋 ÓRDENES PENDIENTES (que ve el UI):', ordenesPendientes.length);
            ordenesPendientes.forEach((orden, index) => {
                console.log(`${index + 1}. ID: ${orden.id.substring(0, 8)}... | $${orden.total_amount} | ${orden.customer_name}`);
            });
            
            // 2. Obtener órdenes que están marcadas como aceptadas
            const { data: ordenesAceptadas, error: errorAceptadas } = await this.SUPABASE_CLIENT
                .from('orders')
                .select(`
                    id, status, total_amount, customer_name, phone_number,
                    created_at, accepted_at, updated_at, delivery_type
                `)
                .eq('status', 'accepted')
                .gte('created_at', new Date().toISOString().split('T')[0]) // Solo de hoy
                .order('created_at', { ascending: false });
            
            if (errorAceptadas) {
                console.error('❌ Error obteniendo órdenes aceptadas:', errorAceptadas);
                return;
            }
            
            console.log('\n✅ ÓRDENES ACEPTADAS (en la DB):', ordenesAceptadas.length);
            ordenesAceptadas.forEach((orden, index) => {
                const tiempoAceptacion = orden.accepted_at ? new Date(orden.accepted_at).toLocaleString() : 'Sin timestamp';
                console.log(`${index + 1}. ID: ${orden.id.substring(0, 8)}... | $${orden.total_amount} | Aceptada: ${tiempoAceptacion}`);
            });
            
            // 3. DETECTAR EL PROBLEMA: Órdenes que deberían estar aceptadas pero aparecen como pendientes
            const problemasDetectados = [];
            
            // Verificar inconsistencias
            const { data: ordenesInconsistentes } = await this.SUPABASE_CLIENT
                .from('orders')
                .select('id, status, accepted_at, customer_name, total_amount')
                .or('and(status.eq.accepted,accepted_at.is.null),and(status.eq.pending,accepted_at.not.is.null)')
                .gte('created_at', new Date().toISOString().split('T')[0]);
            
            if (ordenesInconsistentes && ordenesInconsistentes.length > 0) {
                console.log('\n⚠️ INCONSISTENCIAS DETECTADAS:');
                ordenesInconsistentes.forEach(orden => {
                    const problema = orden.status === 'accepted' && !orden.accepted_at 
                        ? 'Marcada como aceptada pero sin timestamp'
                        : 'Marcada como pendiente pero con timestamp de aceptación';
                    
                    console.log(`❌ ID: ${orden.id.substring(0, 8)}... | ${problema}`);
                    problemasDetectados.push({
                        id: orden.id,
                        problema,
                        orden
                    });
                });
            }
            
            // 4. Verificar qué ve el usuario en la UI actual
            console.log('\n🖥️ VERIFICANDO QUE VE EL UI...');
            const elementosOrden = document.querySelectorAll('[data-order-id], .order-item, .pedido-item');
            console.log(`Elementos de orden encontrados en UI: ${elementosOrden.length}`);
            
            // Comparar IDs entre DB y UI
            const idsEnUI = [];
            elementosOrden.forEach(elemento => {
                const id = elemento.dataset.orderId || elemento.getAttribute('data-id');
                if (id) idsEnUI.push(id);
            });
            
            console.log('IDs de órdenes visibles en UI:', idsEnUI);
            
            // 5. RESUMEN Y DIAGNÓSTICO
            console.log('\n🔍 DIAGNÓSTICO FINAL:');
            console.log('====================');
            console.log(`📊 Órdenes pendientes en DB: ${ordenesPendientes.length}`);
            console.log(`✅ Órdenes aceptadas en DB: ${ordenesAceptadas.length}`);
            console.log(`🖥️ Elementos de orden en UI: ${elementosOrden.length}`);
            console.log(`❌ Inconsistencias detectadas: ${problemasDetectados.length}`);
            
            if (problemasDetectados.length > 0) {
                console.log('\n🚨 PROBLEMA CONFIRMADO:');
                console.log('Hay órdenes con estados inconsistentes entre status y timestamps');
                return { problemas: problemasDetectados, tipo: 'inconsistencia_datos' };
            }
            
            if (ordenesPendientes.length > 0 && elementosOrden.length !== ordenesPendientes.length) {
                console.log('\n🚨 PROBLEMA CONFIRMADO:');
                console.log('Hay diferencia entre órdenes en DB y las que muestra el UI');
                return { 
                    problemas: { dbCount: ordenesPendientes.length, uiCount: elementosOrden.length }, 
                    tipo: 'desync_ui_db' 
                };
            }
            
            console.log('\n✅ No se detectaron problemas obvios');
            return { problemas: [], tipo: 'sin_problemas' };
            
        } catch (error) {
            console.error('❌ Error en verificación:', error);
            return { error: error.message };
        }
    },
    
    // 🔄 FUNCIÓN: Forzar actualización de órdenes
    async forzarActualizacion() {
        console.log('🔄 Forzando actualización de órdenes...');
        
        // Disparar eventos de actualización si existen
        const eventos = ['orders-updated', 'refresh-orders', 'update-orders'];
        eventos.forEach(evento => {
            window.dispatchEvent(new CustomEvent(evento));
            console.log(`📡 Evento disparado: ${evento}`);
        });
        
        // Si hay funciones globales de actualización, llamarlas
        if (window.refreshOrders) {
            await window.refreshOrders();
            console.log('📡 Llamada a window.refreshOrders()');
        }
        
        if (window.updateOrdersList) {
            await window.updateOrdersList();
            console.log('📡 Llamada a window.updateOrdersList()');
        }
    },
    
    // 🧪 FUNCIÓN: Probar aceptar una orden específica
    async probarAceptarOrden(orderId) {
        console.log(`🧪 Probando aceptar orden: ${orderId.substring(0, 8)}...`);
        
        try {
            // Llamar a la función RPC
            const { data, error } = await this.SUPABASE_CLIENT
                .rpc('seller_accept_order', { p_order_id: orderId });
            
            if (error) {
                console.error('❌ Error en seller_accept_order:', error);
                
                // Probar con función alternativa
                console.log('🔄 Probando función alternativa...');
                const { data: data2, error: error2 } = await this.SUPABASE_CLIENT
                    .from('orders')
                    .update({ 
                        status: 'accepted', 
                        accepted_at: new Date().toISOString() 
                    })
                    .eq('id', orderId);
                
                if (error2) {
                    console.error('❌ Error en update directo:', error2);
                    return false;
                } else {
                    console.log('✅ Actualización directa exitosa');
                    return true;
                }
            } else {
                console.log('✅ seller_accept_order exitosa:', data);
                return true;
            }
        } catch (error) {
            console.error('❌ Error inesperado:', error);
            return false;
        }
    }
};

// 🚀 INICIALIZACIÓN AUTOMÁTICA
console.log('🚀 DEBUG DE ÓRDENES CARGADO');
console.log('========================');
console.log('Comandos disponibles:');
console.log('• await DEBUG_ORDERS.detectarConfiguracion()');
console.log('• await DEBUG_ORDERS.verificarEstadoOrdenes()');
console.log('• await DEBUG_ORDERS.forzarActualizacion()');
console.log('• await DEBUG_ORDERS.probarAceptarOrden("order_id")');
console.log('');
console.log('Para iniciar el debug completo, ejecuta:');
console.log('await DEBUG_ORDERS.detectarConfiguracion() && await DEBUG_ORDERS.verificarEstadoOrdenes()');

// Detectar configuración automáticamente
DEBUG_ORDERS.detectarConfiguracion().then(() => {
    console.log('\n🎯 Configuración detectada. Listo para debug.');
});
