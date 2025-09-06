// DIAGNÓSTICO DIRECTO EN LA APLICACIÓN
// ===================================
// Este script se ejecuta directamente en la aplicación

import { supabase } from '../utils/supabase/client';

export async function diagnosticarOrdenes() {
    console.log('🔧 INICIANDO DIAGNÓSTICO COMPLETO DE ÓRDENES');
    console.log('==============================================');

    try {
        // 1. Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('❌ Error de autenticación:', authError);
            return { success: false, error: 'No hay usuario autenticado' };
        }

        console.log('✅ Usuario autenticado:', user.id);

        // 2. Verificar órdenes pendientes
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                status,
                seller_id,
                buyer_id,
                total,
                created_at
            `)
            .eq('seller_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('❌ Error cargando órdenes:', ordersError);
            return { success: false, error: 'Error cargando órdenes' };
        }

        console.log('✅ Órdenes pendientes encontradas:', orders?.length || 0);

        if (!orders || orders.length === 0) {
            console.log('ℹ️ No hay órdenes pendientes para procesar');
            return { success: true, message: 'No hay órdenes pendientes' };
        }

        // 3. Intentar aceptar la primera orden pendiente (SOLO PARA PRUEBA)
        const primeraOrden = orders[0];
        console.log('🧪 Probando aceptar orden:', primeraOrden.order_number);

        const { data: resultado, error: acceptError } = await supabase.rpc('seller_accept_order', {
            p_order_id: primeraOrden.id,
            p_seller_id: user.id
        });

        if (acceptError) {
            console.error('❌ Error en seller_accept_order:', acceptError);
            return { 
                success: false, 
                error: acceptError.message,
                details: acceptError 
            };
        }

        console.log('✅ Resultado de seller_accept_order:', resultado);

        // 4. Verificar si la orden se actualizó
        const { data: ordenActualizada } = await supabase
            .from('orders')
            .select('status')
            .eq('id', primeraOrden.id)
            .single();

        console.log('📊 Estado actual de la orden:', ordenActualizada?.status);

        return {
            success: true,
            message: 'Diagnóstico completado',
            resultado: resultado,
            estadoOrden: ordenActualizada?.status
        };

    } catch (error) {
        console.error('💥 Error en diagnóstico:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            details: error
        };
    }
}

// Función simple para aceptar una orden específica
export async function aceptarOrdenDirecta(orderId: string) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        console.log(`🚀 Intentando aceptar orden ${orderId}...`);

        const { data, error } = await supabase.rpc('seller_accept_order', {
            p_order_id: orderId,
            p_seller_id: user.id
        });

        if (error) {
            console.error('❌ Error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Resultado:', data);
        return { success: true, data };

    } catch (error) {
        console.error('💥 Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}
