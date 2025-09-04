// 🎯 SCRIPT DE PRUEBA VISUAL DE NOTIFICACIONES
// Este script se ejecuta en la consola del navegador para probar notificaciones

console.log('🧪 INICIANDO PRUEBAS VISUALES DE NOTIFICACIONES CRÍTICAS');
console.log('=========================================================');

// Función para crear notificaciones de prueba
function createTestNotification(type, message, urgency = 'medium') {
    const notification = {
        id: Date.now().toString(),
        type: type,
        message: message,
        urgency: urgency,
        timestamp: new Date().toISOString()
    };
    
    console.log(`🔔 [${urgency.toUpperCase()}] ${type}: ${message}`);
    
    // Disparar evento personalizado para que lo capturen los componentes
    const event = new CustomEvent('testNotification', {
        detail: notification
    });
    window.dispatchEvent(event);
    
    return notification;
}

// Prueba 1: Stock crítico
console.log('\n📦 PRUEBA 1: Alertas de Stock...');
setTimeout(() => {
    createTestNotification('stock_low', 'Stock bajo: Tostadas Francesas (3 unidades)', 'critical');
}, 1000);

setTimeout(() => {
    createTestNotification('stock_out', 'AGOTADO: Rellenitos de Plátano', 'critical');
}, 2000);

// Prueba 2: Timeouts de órdenes
console.log('\n⏰ PRUEBA 2: Alertas de Timeout...');
setTimeout(() => {
    createTestNotification('order_timeout', 'Orden #ABC123 pendiente por 15 minutos', 'high');
}, 3000);

setTimeout(() => {
    createTestNotification('preparation_timeout', 'Orden #DEF456 en preparación por 35 minutos', 'critical');
}, 4000);

// Prueba 3: Tracking y ubicación
console.log('\n📍 PRUEBA 3: Alertas de Ubicación...');
setTimeout(() => {
    createTestNotification('driver_nearby', 'Tu repartidor está a 300 metros', 'medium');
}, 5000);

setTimeout(() => {
    createTestNotification('driver_arrived', 'Tu repartidor ha llegado', 'high');
}, 6000);

// Prueba 4: Alertas de sistema
console.log('\n🔧 PRUEBA 4: Alertas de Sistema...');
setTimeout(() => {
    createTestNotification('no_drivers', 'Sin repartidores disponibles', 'critical');
}, 7000);

setTimeout(() => {
    createTestNotification('high_volume', '15 órdenes esperando entrega', 'high');
}, 8000);

// Prueba 5: Verificar que los componentes están cargados
console.log('\n🔍 PRUEBA 5: Verificando componentes en DOM...');
setTimeout(() => {
    const components = [
        'CriticalNotifications',
        'TimeoutAlerts', 
        'DeliveryTracking',
        'NotificationTester'
    ];
    
    components.forEach(component => {
        const elements = document.querySelectorAll(`[data-component="${component}"]`);
        if (elements.length > 0) {
            console.log(`✅ ${component} encontrado en DOM`);
        } else {
            console.log(`⚠️ ${component} no encontrado (puede ser normal si no está visible)`);
        }
    });
}, 9000);

// Prueba 6: Simular interacciones del NotificationTester
console.log('\n🎮 PRUEBA 6: Simulando clicks en NotificationTester...');
setTimeout(() => {
    const testerButtons = document.querySelectorAll('button');
    const targetTexts = ['Stock Bajo', 'Timeout', 'Ubicación', 'Sistema', 'Prueba Completa'];
    
    testerButtons.forEach(button => {
        const buttonText = button.textContent || '';
        if (targetTexts.some(text => buttonText.includes(text))) {
            console.log(`🎯 Botón encontrado: "${buttonText}"`);
            // Simular click (comentado para evitar interferir)
            // button.click();
        }
    });
}, 10000);

// Resumen final
setTimeout(() => {
    console.log('\n📊 RESUMEN DE PRUEBAS VISUALES:');
    console.log('===============================');
    console.log('✅ Stock crítico - Simulado');
    console.log('✅ Timeouts de órdenes - Simulado');
    console.log('✅ Alertas de ubicación - Simulado');  
    console.log('✅ Alertas de sistema - Simulado');
    console.log('✅ Verificación DOM - Completada');
    console.log('✅ Detección de botones - Completada');
    
    console.log('\n🎯 PARA PROBAR MANUALMENTE:');
    console.log('1. Buscar el componente "Tester de Notificaciones Críticas"');
    console.log('2. Hacer clic en los botones: Stock Bajo, Timeout, Ubicación, Sistema');
    console.log('3. Observar las notificaciones que aparecen');
    console.log('4. Verificar logs en esta consola');
    console.log('5. Usar "Prueba Completa" para ejecutar todas en secuencia');
    
    console.log('\n🎉 ¡PRUEBAS VISUALES COMPLETADAS!');
}, 11000);

// Función helper para pruebas manuales
window.testNotifications = {
    stock: () => createTestNotification('stock_low', 'Prueba manual: Stock bajo', 'critical'),
    timeout: () => createTestNotification('order_timeout', 'Prueba manual: Orden timeout', 'high'),
    location: () => createTestNotification('driver_nearby', 'Prueba manual: Repartidor cerca', 'medium'),
    system: () => createTestNotification('no_drivers', 'Prueba manual: Sin repartidores', 'critical'),
    all: function() {
        this.stock();
        setTimeout(() => this.timeout(), 1000);
        setTimeout(() => this.location(), 2000);
        setTimeout(() => this.system(), 3000);
    }
};

console.log('\n💡 FUNCIONES DISPONIBLES:');
console.log('- testNotifications.stock() - Probar alerta de stock');
console.log('- testNotifications.timeout() - Probar alerta de timeout');
console.log('- testNotifications.location() - Probar alerta de ubicación');  
console.log('- testNotifications.system() - Probar alerta de sistema');
console.log('- testNotifications.all() - Probar todas las alertas');

console.log('\n🔗 URL del sistema: http://localhost:5174');
console.log('🧪 Las pruebas se ejecutarán automáticamente en los próximos 11 segundos...');
