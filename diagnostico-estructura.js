// ===============================================
// DIAGNÓSTICO CRÍTICO DE ESTRUCTURA DE DATOS
// Ejecuta el SQL de diagnóstico completo
// ===============================================

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usar las credenciales del proyecto)
const supabaseUrl = 'https://sjvhxwqahglsfdohqkhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarEstructura() {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DE ESTRUCTURA...\n');
    
    try {
        // 1. Estructura de daily_products
        console.log('📊 1. ESTRUCTURA DE DAILY_PRODUCTS:');
        const { data: dailyStructure, error: dailyError } = await supabase
            .from('daily_products')
            .select('*')
            .limit(1);
        
        if (dailyStructure && dailyStructure.length > 0) {
            console.log('Columnas disponibles:', Object.keys(dailyStructure[0]));
            console.log('Ejemplo de registro:', dailyStructure[0]);
        }
        
        // 2. Estructura de order_items
        console.log('\n📊 2. ESTRUCTURA DE ORDER_ITEMS:');
        const { data: orderStructure, error: orderError } = await supabase
            .from('order_items')
            .select('*')
            .limit(1);
        
        if (orderStructure && orderStructure.length > 0) {
            console.log('Columnas disponibles:', Object.keys(orderStructure[0]));
            console.log('Ejemplo de registro:', orderStructure[0]);
        }
        
        // 3. Productos del día actuales
        console.log('\n📊 3. PRODUCTOS DEL DÍA ACTUALES:');
        const { data: dailyProducts, error: dailyProductsError } = await supabase
            .from('daily_products')
            .select('id, name, stock_quantity, price, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        
        console.log('Productos del día:', dailyProducts);
        
        // 4. Order items de productos del día
        console.log('\n📊 4. ORDER ITEMS DE PRODUCTOS DEL DÍA:');
        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select(`
                id,
                order_id,
                product_id,
                daily_product_id,
                product_type,
                quantity,
                price,
                orders!inner(status, created_at)
            `)
            .or('product_type.eq.daily,daily_product_id.not.is.null')
            .order('orders.created_at', { ascending: false })
            .limit(10);
        
        console.log('Order items de productos del día:', orderItems);
        
        // 5. Análisis específico del producto mostrado
        const productId = 'c103a8a0-78a3-4c7d-8d09-f9c3db2d4f47';
        console.log(`\n📊 5. ANÁLISIS DEL PRODUCTO ESPECÍFICO (${productId}):`);
        
        const { data: specificProduct, error: specificError } = await supabase
            .from('daily_products')
            .select('*')
            .eq('id', productId)
            .single();
        
        console.log('Producto específico:', specificProduct);
        
        // Buscar órdenes de este producto
        const { data: ordersForProduct, error: ordersError } = await supabase
            .from('order_items')
            .select(`
                *,
                orders!inner(status, created_at)
            `)
            .or(`daily_product_id.eq.${productId},product_id.eq.${productId}`)
            .order('orders.created_at', { ascending: false });
        
        console.log('Órdenes de este producto:', ordersForProduct);
        
        // 6. Resumen de métodos de referencia
        console.log('\n📊 6. ANÁLISIS DE MÉTODOS DE REFERENCIA:');
        const { data: allOrderItems, error: allError } = await supabase
            .from('order_items')
            .select('daily_product_id, product_id, product_type')
            .or('product_type.eq.daily,daily_product_id.not.is.null');
        
        const metodosReferencia = {
            conDailyProductId: allOrderItems?.filter(item => item.daily_product_id !== null).length || 0,
            conProductTypeDailyYProductId: allOrderItems?.filter(item => item.product_type === 'daily' && item.product_id !== null).length || 0,
            conProductTypeDailySinProductId: allOrderItems?.filter(item => item.product_type === 'daily' && item.product_id === null).length || 0
        };
        
        console.log('Métodos de referencia encontrados:', metodosReferencia);
        
        // 7. Órdenes entregadas sin decrementar
        console.log('\n📊 7. ÓRDENES ENTREGADAS QUE PUEDEN NO HABER DECREMENTADO:');
        const { data: deliveredOrders, error: deliveredError } = await supabase
            .from('order_items')
            .select(`
                *,
                orders!inner(status, created_at),
                daily_products(name, stock_quantity)
            `)
            .or('product_type.eq.daily,daily_product_id.not.is.null')
            .in('orders.status', ['delivered', 'completed', 'accepted'])
            .order('orders.created_at', { ascending: false })
            .limit(10);
        
        console.log('Órdenes entregadas:', deliveredOrders);
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

// Ejecutar diagnóstico
diagnosticarEstructura();
