// Script para diagnosticar el problema de tiempo - VERSION CORREGIDA
// Ejecutar en consola del navegador (F12 -> Console)

console.log('🕐 DIAGNÓSTICO DE TIEMPO - PRODUCTOS DEL DÍA');
console.log('='.repeat(50));

// 1. Verificar fecha/hora actual
const now = new Date();
console.log('📅 Fecha/hora actual (local):', now.toString());
console.log('📅 Fecha/hora actual (UTC):', now.toISOString());
console.log('📅 Zona horaria:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// 2. Simular fechas de los productos que vimos en el SQL
console.log('\n📦 SIMULACIÓN CON FECHAS DE PRODUCTOS:');

// Fecha de expiración que está en la base de datos: 2025-09-05 23:59:59+00
const expiresAtUTC = '2025-09-05T23:59:59.000Z';
const expirationTime = new Date(expiresAtUTC);

console.log('--- Producto: Filtros/Cerveza ---');
console.log('   Expira UTC:', expiresAtUTC);
console.log('   Expira convertido a local:', expirationTime.toString());

// Calcular diferencia
const difference = expirationTime.getTime() - now.getTime();
const hours = Math.floor(difference / (1000 * 60 * 60));
const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

console.log(`   Tiempo restante: ${hours}h ${minutes}m`);

// 3. Comparar con medianoche local
const midnight = new Date();
midnight.setHours(23, 59, 59, 999);
console.log('\n🌙 MEDIANOCHE LOCAL:');
console.log('   Local:', midnight.toString()); 
console.log('   UTC:', midnight.toISOString());

const diffToMidnight = midnight.getTime() - now.getTime();
const hoursToMidnight = Math.floor(diffToMidnight / (1000 * 60 * 60));
const minutesToMidnight = Math.floor((diffToMidnight % (1000 * 60 * 60)) / (1000 * 60));
console.log(`   Faltan: ${hoursToMidnight}h ${minutesToMidnight}m para medianoche local`);

// 4. DIAGNÓSTICO DEL PROBLEMA
console.log('\n🔍 DIAGNÓSTICO:');
console.log(`   ¿Expira en UTC a las 23:59? ${expiresAtUTC.includes('23:59')}`);
console.log(`   ¿Eso equivale a las 17:59 local? ${expirationTime.getHours() === 17 && expirationTime.getMinutes() === 59}`);

if (expirationTime.getHours() === 17) {
    console.log('❌ PROBLEMA ENCONTRADO: La fecha UTC se interpreta como 17:59 local (6 PM)');
    console.log('   Esto explica por qué muestra ~6 horas restantes');
    console.log('   Deberíamos guardar la medianoche LOCAL como UTC');
} else {
    console.log('✅ Las fechas se están interpretando correctamente');
}
