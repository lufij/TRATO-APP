/**
 * DIAGNÓSTICO DIRECTO DEL PROBLEMA - CERVEZA
 * =========================================
 * Este script se conecta directamente a Supabase y diagnostica el problema
 */

// Importar createClient desde supabase-js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjvhxwqahglsfdohqkhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdmh4d3FhaGdsc2Zkb2hxa2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk1MDgsImV4cCI6MjA1MDMxNTUwOH0.bYN5EuCkYFE0eV_pG02_sqoTKMOaXyxYV5FxHRxlKHY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticarCerveza() {
    console.log('🍺 DIAGNÓSTICO DIRECTO DEL PRODUCTO CERVEZA');
    console.log('='.repeat(50));

    try {
        // 1. Buscar productos del día con "Cerveza"
        console.log('\n1️⃣ BUSCANDO PRODUCTOS CON CERVEZA:');
        const { data: productos, error } = await supabase
            .from('daily_products')
            .select('*')
            .ilike('name', '%cerveza%');

        if (error) {
            console.error('❌ Error:', error);
            return;
        }

        console.log(`📊 Productos encontrados: ${productos?.length || 0}`);
        
        if (!productos || productos.length === 0) {
            console.log('⚠️ No se encontraron productos con "cerveza"');
            
            // Intentar buscar cualquier producto del día
            const { data: todosProductos } = await supabase
                .from('daily_products')
                .select('id, name, stock_quantity, expires_at, is_available')
                .limit(5);
            
            console.log('\n📋 Productos del día disponibles:');
            todosProductos?.forEach(p => {
                console.log(`   - ${p.name} (Stock: ${p.stock_quantity}, Expira: ${p.expires_at})`);
            });
            return;
        }

        // 2. Analizar cada producto encontrado
        for (const producto of productos) {
            console.log(`\n🔍 ANALIZANDO: ${producto.name}`);
            console.log(`   ID: ${producto.id}`);
            console.log(`   Stock: ${producto.stock_quantity}`);
            console.log(`   Expira: ${producto.expires_at}`);
            console.log(`   Disponible: ${producto.is_available}`);
            console.log(`   Seller ID: ${producto.seller_id}`);

            // Validaciones críticas
            const ahora = new Date();
            const expira = new Date(producto.expires_at);
            const noExpirado = expira > ahora;
            const tieneStock = producto.stock_quantity > 0;
            const disponible = !!producto.is_available;

            console.log(`\n   VALIDACIONES:`);
            console.log(`   ✅ No expirado: ${noExpirado} (${expira.toLocaleString()} > ${ahora.toLocaleString()})`);
            console.log(`   ✅ Tiene stock: ${tieneStock} (${producto.stock_quantity} > 0)`);
            console.log(`   ✅ Está disponible: ${disponible}`);
            
            const validacionCompleta = noExpirado && tieneStock && disponible;
            console.log(`   🎯 VALIDACIÓN COMPLETA: ${validacionCompleta ? '✅ VÁLIDO' : '❌ NO VÁLIDO'}`);

            // 3. Probar la función de validación directamente
            console.log(`\n🧪 PROBANDO validate_and_get_product_data:`);
            try {
                const { data: resultadoValidacion, error: errorValidacion } = await supabase.rpc('validate_and_get_product_data', {
                    p_product_id: producto.id,
                    p_product_type: 'daily'
                });

                if (errorValidacion) {
                    console.error('❌ Error en validación RPC:', errorValidacion);
                } else if (resultadoValidacion && resultadoValidacion.length > 0) {
                    const validacion = resultadoValidacion[0];
                    console.log(`   Success: ${validacion.is_valid}`);
                    console.log(`   Message: ${validacion.error_message}`);
                    console.log(`   Product Name: ${validacion.product_name}`);
                    console.log(`   Product Price: ${validacion.product_price}`);
                    console.log(`   Seller ID: ${validacion.seller_id}`);
                } else {
                    console.log('   ⚠️ Sin resultado de validación');
                }
            } catch (validationError) {
                console.error('❌ Error ejecutando validación:', validationError);
            }

            // Si no es válido, explicar por qué
            if (!validacionCompleta) {
                console.log(`\n❌ RAZONES DEL FALLO:`);
                if (!noExpirado) {
                    console.log(`   - EXPIRADO: ${expira.toLocaleString()} <= ${ahora.toLocaleString()}`);
                    console.log(`   - Diferencia: ${Math.round((ahora - expira) / (1000 * 60))} minutos tarde`);
                }
                if (!tieneStock) {
                    console.log(`   - SIN STOCK: ${producto.stock_quantity} <= 0`);
                }
                if (!disponible) {
                    console.log(`   - NO DISPONIBLE: is_available = ${producto.is_available}`);
                }
            }
        }

        // 4. Verificar estructura de tabla
        console.log(`\n📊 ESTRUCTURA DE DAILY_PRODUCTS:`);
        const { data: estructura } = await supabase
            .from('daily_products')
            .select('*')
            .limit(1);
        
        if (estructura && estructura.length > 0) {
            const campos = Object.keys(estructura[0]);
            console.log(`   Campos disponibles: ${campos.join(', ')}`);
        }

    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar diagnóstico
diagnosticarCerveza().then(() => {
    console.log('\n🏁 Diagnóstico completado');
    process.exit(0);
}).catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
});
