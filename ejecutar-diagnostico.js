// =====================================================
// EJECUTAR DIAGNÓSTICO REPARTIDOR - SUPABASE DIRECT
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticoCompleto() {
    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DE REPARTIDORES');
    console.log('='.repeat(60));

    try {
        // 1. Verificar estructura de tabla drivers
        console.log('\n📋 1. ESTRUCTURA DE TABLA DRIVERS:');
        const { data: columnas, error: errorColumnas } = await supabase
            .rpc('exec_sql', {
                sql: `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'drivers'
                ORDER BY ordinal_position;
                `
            });

        if (errorColumnas) {
            console.log('❌ Error obteniendo columnas:', errorColumnas.message);
            
            // Alternativa: intentar consulta directa
            console.log('\n🔄 Intentando método alternativo...');
            const { data: driversData, error: driversError } = await supabase
                .from('drivers')
                .select('*')
                .limit(1);

            if (!driversError && driversData) {
                console.log('✅ Estructura básica de drivers (primera fila):');
                if (driversData.length > 0) {
                    console.log('Columnas disponibles:', Object.keys(driversData[0]));
                    console.log('Ejemplo de datos:', driversData[0]);
                }
            }
        } else {
            console.table(columnas);
        }

        // 2. Contar todos los repartidores
        console.log('\n👥 2. TOTAL DE REPARTIDORES EN TABLA DRIVERS:');
        const { count: totalDrivers, error: countError } = await supabase
            .from('drivers')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.log('❌ Error contando drivers:', countError.message);
        } else {
            console.log(`Total de registros en tabla drivers: ${totalDrivers}`);
        }

        // 3. Ver todos los drivers completos
        console.log('\n📊 3. TODOS LOS DRIVERS (DATOS COMPLETOS):');
        const { data: allDrivers, error: allDriversError } = await supabase
            .from('drivers')
            .select('*')
            .order('created_at', { ascending: false });

        if (allDriversError) {
            console.log('❌ Error obteniendo drivers:', allDriversError.message);
        } else {
            console.log(`Drivers encontrados: ${allDrivers?.length || 0}`);
            if (allDrivers && allDrivers.length > 0) {
                console.table(allDrivers);
                
                // Analizar las columnas críticas
                const primerDriver = allDrivers[0];
                const tieneCamposCriticos = {
                    is_online: 'is_online' in primerDriver,
                    is_active: 'is_active' in primerDriver,
                    is_verified: 'is_verified' in primerDriver
                };
                
                console.log('\n🔍 CAMPOS CRÍTICOS PARA INDICADOR:');
                console.log('is_online presente:', tieneCamposCriticos.is_online ? '✅' : '❌');
                console.log('is_active presente:', tieneCamposCriticos.is_active ? '✅' : '❌');
                console.log('is_verified presente:', tieneCamposCriticos.is_verified ? '✅' : '❌');

                if (tieneCamposCriticos.is_online && tieneCamposCriticos.is_active && tieneCamposCriticos.is_verified) {
                    // Simular consulta del indicador
                    const { count: indicadorCount, error: indicadorError } = await supabase
                        .from('drivers')
                        .select('*', { count: 'exact', head: true })
                        .eq('is_online', true)
                        .eq('is_active', true)
                        .eq('is_verified', true);

                    console.log('\n🎯 SIMULACIÓN CONSULTA INDICADOR:');
                    if (indicadorError) {
                        console.log('❌ Error en consulta indicador:', indicadorError.message);
                    } else {
                        console.log(`Drivers que aparecerían en indicador: ${indicadorCount}`);
                        
                        // Mostrar valores actuales de cada driver
                        console.log('\n📈 ESTADO ACTUAL DE CADA DRIVER:');
                        allDrivers.forEach(driver => {
                            console.log(`Driver ${driver.id}:`);
                            console.log(`  - is_online: ${driver.is_online}`);
                            console.log(`  - is_active: ${driver.is_active}`);
                            console.log(`  - is_verified: ${driver.is_verified}`);
                            console.log(`  - Aparecería en indicador: ${driver.is_online && driver.is_active && driver.is_verified ? '✅' : '❌'}`);
                        });
                    }
                }
            }
        }

        // 4. Verificar relación con users
        console.log('\n👤 4. REPARTIDORES EN TABLA USERS:');
        const { data: usersRepartidores, error: usersError } = await supabase
            .from('users')
            .select(`
                id,
                name,
                email,
                phone,
                created_at,
                drivers (
                    id,
                    is_online,
                    is_active,
                    is_verified,
                    created_at
                )
            `)
            .eq('role', 'repartidor')
            .order('created_at', { ascending: false });

        if (usersError) {
            console.log('❌ Error obteniendo users repartidores:', usersError.message);
        } else {
            console.log(`Usuarios con role repartidor: ${usersRepartidores?.length || 0}`);
            if (usersRepartidores && usersRepartidores.length > 0) {
                console.table(usersRepartidores.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    user_created: user.created_at,
                    tiene_perfil_driver: user.drivers ? '✅ Sí' : '❌ No',
                    driver_online: user.drivers?.is_online || false,
                    driver_active: user.drivers?.is_active || false,
                    driver_verified: user.drivers?.is_verified || false
                })));
            }
        }

    } catch (error) {
        console.error('💥 Error general en diagnóstico:', error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 DIAGNÓSTICO COMPLETADO');
}

// Ejecutar diagnóstico
diagnosticoCompleto();
