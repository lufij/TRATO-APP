// SCRIPT PARA APLICAR CORRECCIONES AL FLUJO DE ÓRDENES
// ====================================================
// Este script debe ejecutarse en la consola del navegador (F12)

console.log('🚀 APLICANDO CORRECCIONES AL FLUJO DE ÓRDENES');
console.log('==============================================');

// Función principal para aplicar todas las correcciones
async function aplicarCorreccionesCompletas() {
    try {
        console.log('📋 Verificando estado actual del sistema...');
        
        // 1. Verificar órdenes existentes
        const { data: ordenes, error: errorOrdenes } = await supabase
            .from('orders')
            .select('id, order_number, status, created_at')
            .in('status', ['pending', 'accepted', 'ready'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (errorOrdenes) {
            console.error('❌ Error cargando órdenes:', errorOrdenes);
            return;
        }

        console.log('📦 Órdenes encontradas:', ordenes?.length || 0);
        
        if (ordenes && ordenes.length > 0) {
            console.log('🔍 Estados actuales:');
            ordenes.forEach(orden => {
                console.log(`   ${orden.order_number}: ${orden.status}`);
            });
        }

        // 2. Ejecutar las correcciones SQL
        console.log('\n🔧 Aplicando funciones SQL corregidas...');
        
        // Leer y ejecutar el archivo SQL de correcciones
        await ejecutarSQL();
        
        console.log('✅ ¡Correcciones aplicadas exitosamente!');
        
        // 3. Verificar que las funciones estén disponibles
        await verificarFunciones();

    } catch (error) {
        console.error('💥 Error aplicando correcciones:', error);
    }
}

// Función para ejecutar el SQL de correcciones
async function ejecutarSQL() {
    const sqlCorrecciones = `
-- 📦 FUNCIÓN PARA MARCAR ORDEN LISTA (PICKUP/DINE-IN)
CREATE OR REPLACE FUNCTION seller_mark_completed_pickup(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
BEGIN
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        delivery_type
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'ready' THEN
        RETURN QUERY SELECT false, 'La orden debe estar lista primero'::TEXT;
        RETURN;
    END IF;
    
    IF v_delivery_type NOT IN ('pickup', 'dine-in') THEN
        RETURN QUERY SELECT false, 'Esta función es solo para pickup o dine-in'::TEXT;
        RETURN;
    END IF;
    
    -- Marcar como completado
    UPDATE orders 
    SET 
        status = 'completed',
        delivered_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT true, 'Orden completada exitosamente'::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🚚 FUNCIÓN PARA NOTIFICAR REPARTIDORES (DELIVERY)
CREATE OR REPLACE FUNCTION notify_drivers_order_ready(
    p_order_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_driver_count INTEGER;
    v_buyer_id UUID;
BEGIN
    -- Obtener buyer_id de la orden
    SELECT buyer_id INTO v_buyer_id FROM orders WHERE id = p_order_id;
    
    -- Contar repartidores disponibles  
    SELECT COUNT(*) INTO v_driver_count
    FROM users 
    WHERE role = 'repartidor' AND is_active = true;
    
    IF v_driver_count = 0 THEN
        -- Si no hay repartidores, notificar al cliente que recoja
        INSERT INTO notifications (user_id, order_id, message, type)
        VALUES (v_buyer_id, p_order_id, 'No hay repartidores disponibles. Tu orden está lista para recoger', 'order_ready');
        
        RETURN QUERY SELECT false, 'No hay repartidores disponibles. Cliente notificado para pickup.'::TEXT;
        RETURN;
    END IF;
    
    -- Notificar a todos los repartidores activos
    INSERT INTO notifications (user_id, order_id, message, type)
    SELECT 
        u.id, 
        p_order_id, 
        'Nueva orden disponible para entrega', 
        'order_available'
    FROM users u 
    WHERE u.role = 'repartidor' AND u.is_active = true;
    
    RETURN QUERY SELECT true, ('Notificado a ' || v_driver_count || ' repartidores')::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🎯 FUNCIÓN MEJORADA PARA MARCAR READY (CON FLUJO COMPLETO)
CREATE OR REPLACE FUNCTION seller_mark_ready_improved(
    p_order_id UUID,
    p_seller_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_order_seller_id UUID;
    v_current_status TEXT;
    v_delivery_type TEXT;
    v_buyer_id UUID;
    v_notification_result RECORD;
BEGIN
    SELECT 
        EXISTS(SELECT 1 FROM orders WHERE id = p_order_id),
        seller_id,
        status,
        delivery_type,
        buyer_id
    INTO v_order_exists, v_order_seller_id, v_current_status, v_delivery_type, v_buyer_id
    FROM orders 
    WHERE id = p_order_id;
    
    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, 'Orden no encontrada'::TEXT;
        RETURN;
    END IF;
    
    IF v_order_seller_id != p_seller_id THEN
        RETURN QUERY SELECT false, 'No tienes permisos para esta orden'::TEXT;
        RETURN;
    END IF;
    
    IF v_current_status != 'accepted' THEN
        RETURN QUERY SELECT false, 'La orden debe estar aceptada primero'::TEXT;
        RETURN;
    END IF;
    
    -- Actualizar estado a 'ready'
    UPDATE orders 
    SET 
        status = 'ready',
        ready_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Si es delivery, notificar a repartidores
    IF v_delivery_type = 'delivery' THEN
        SELECT * INTO v_notification_result 
        FROM notify_drivers_order_ready(p_order_id);
        
        RETURN QUERY SELECT true, ('Orden lista. ' || v_notification_result.message)::TEXT;
    ELSE
        -- Si es pickup o dine-in, notificar al cliente
        INSERT INTO notifications (user_id, order_id, message, type)
        VALUES (v_buyer_id, p_order_id, 'Tu orden está lista para recoger', 'order_ready');
        
        RETURN QUERY SELECT true, 'Orden marcada como lista. Cliente notificado.'::TEXT;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    try {
        // Dividir el SQL en sentencias individuales y ejecutarlas
        const sentencias = sqlCorrecciones.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
        
        for (let i = 0; i < sentencias.length; i++) {
            const sentencia = sentencias[i].trim();
            if (sentencia) {
                console.log(`   Ejecutando sentencia ${i + 1}/${sentencias.length}...`);
                const { error } = await supabase.rpc('exec_sql', { sql_query: sentencia });
                if (error) {
                    console.error(`❌ Error en sentencia ${i + 1}:`, error);
                } else {
                    console.log(`   ✅ Sentencia ${i + 1} ejecutada correctamente`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error ejecutando SQL:', error);
        console.log('💡 Intentando método alternativo...');
        
        // Si no funciona exec_sql, intentar con las funciones directamente
        await aplicarFuncionesDirectamente();
    }
}

// Función alternativa para aplicar las funciones
async function aplicarFuncionesDirectamente() {
    console.log('🔄 Aplicando funciones usando método directo...');
    
    // Por ahora, las funciones se aplicarían manualmente en el panel SQL de Supabase
    console.log('📝 Las funciones deben aplicarse manualmente en el panel SQL de Supabase');
    console.log('   1. Abre el Dashboard de Supabase');
    console.log('   2. Ve a SQL Editor');
    console.log('   3. Ejecuta el contenido del archivo DIAGNOSTICO_Y_CORRECCION_FLUJO_ORDENES.sql');
}

// Función para verificar que las funciones estén disponibles
async function verificarFunciones() {
    console.log('\n🔍 Verificando funciones disponibles...');
    
    const { data: funciones, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .in('routine_name', [
            'seller_accept_order',
            'seller_mark_ready',
            'seller_mark_ready_improved',
            'seller_mark_completed_pickup',
            'notify_drivers_order_ready'
        ])
        .eq('routine_schema', 'public');

    if (error) {
        console.error('❌ Error verificando funciones:', error);
        return;
    }

    console.log('📋 Funciones encontradas:');
    if (funciones && funciones.length > 0) {
        funciones.forEach(func => {
            console.log(`   ✅ ${func.routine_name} (${func.routine_type})`);
        });
    } else {
        console.log('   ❌ No se encontraron funciones. Deben aplicarse manualmente.');
    }
}

// Función para probar el flujo completo
async function probarFlujoCompleto(orderId) {
    console.log(`\n🧪 PROBANDO FLUJO COMPLETO PARA ORDEN: ${orderId}`);
    console.log('=====================================');

    try {
        // Obtener usuario actual
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('❌ Error de autenticación:', authError);
            return;
        }

        console.log('👤 Usuario logueado:', user.id);

        // Paso 1: Aceptar orden
        console.log('\n🟡 Paso 1: Aceptando orden...');
        const { data: acceptResult, error: acceptError } = await supabase.rpc('seller_accept_order', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (acceptError) {
            console.error('❌ Error aceptando orden:', acceptError);
            return;
        }

        console.log('✅ Resultado:', acceptResult);

        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Paso 2: Marcar como lista
        console.log('\n🟢 Paso 2: Marcando orden como lista...');
        const { data: readyResult, error: readyError } = await supabase.rpc('seller_mark_ready_improved', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (readyError) {
            console.error('❌ Error marcando como lista:', readyError);
            return;
        }

        console.log('✅ Resultado:', readyResult);

        // Verificar estado final
        console.log('\n🔍 Verificando estado final...');
        const { data: finalOrder, error: finalError } = await supabase
            .from('orders')
            .select('id, order_number, status, accepted_at, ready_at, delivery_type')
            .eq('id', orderId)
            .single();

        if (finalError) {
            console.error('❌ Error verificando estado final:', finalError);
            return;
        }

        console.log('🎯 Estado final de la orden:');
        console.log('   Status:', finalOrder.status);
        console.log('   Accepted at:', finalOrder.accepted_at);
        console.log('   Ready at:', finalOrder.ready_at);
        console.log('   Delivery type:', finalOrder.delivery_type);

    } catch (error) {
        console.error('💥 Error en prueba completa:', error);
    }
}

// Iniciar automáticamente la aplicación de correcciones
aplicarCorreccionesCompletas();

// Mostrar instrucciones
console.log('\n📚 INSTRUCCIONES DESPUÉS DE LA APLICACIÓN:');
console.log('1. Para probar una orden: probarFlujoCompleto("ORDER_ID_AQUI")');
console.log('2. Para verificar funciones: verificarFunciones()');
console.log('3. Si hay errores SQL, aplicar manualmente DIAGNOSTICO_Y_CORRECCION_FLUJO_ORDENES.sql');
