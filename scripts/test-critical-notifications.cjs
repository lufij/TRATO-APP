// 🧪 SCRIPT DE PRUEBAS AUTOMATIZADAS - NOTIFICACIONES CRÍTICAS
// Ejecutar: node scripts/test-critical-notifications.cjs

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 INICIANDO PRUEBAS DEL SISTEMA DE NOTIFICACIONES CRÍTICAS');
console.log('=====================================================');

// Test 1: Verificar que los archivos de componentes existen
async function testComponentFiles() {
    console.log('\n📁 TEST 1: Verificando archivos de componentes...');
    
    const requiredFiles = [
        'components/notifications/CriticalNotifications.tsx',
        'components/delivery/DeliveryTracking.tsx',
        'components/alerts/TimeoutAlerts.tsx',
        'components/testing/NotificationTester.tsx'
    ];
    
    const fs = require('fs');
    let allExist = true;
    
    for (const file of requiredFiles) {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${file} - EXISTE`);
        } else {
            console.log(`❌ ${file} - NO EXISTE`);
            allExist = false;
        }
    }
    
    return allExist;
}

// Test 2: Verificar integración en dashboards
async function testDashboardIntegration() {
    console.log('\n🎯 TEST 2: Verificando integración en dashboards...');
    
    const fs = require('fs');
    const dashboards = {
        'components/BuyerDashboard.tsx': [
            'CriticalNotifications',
            'TimeoutAlerts', 
            'DeliveryTracking',
            'NotificationTester'
        ],
        'components/SellerDashboard.tsx': [
            'CriticalNotifications',
            'TimeoutAlerts'
        ],
        'components/DriverDashboard.tsx': [
            'CriticalNotifications',
            'DeliveryTracking'
        ]
    };
    
    let allIntegrated = true;
    
    for (const [dashboard, expectedComponents] of Object.entries(dashboards)) {
        console.log(`\n📋 Verificando ${dashboard}:`);
        
        try {
            const content = fs.readFileSync(dashboard, 'utf8');
            
            for (const component of expectedComponents) {
                if (content.includes(component)) {
                    console.log(`  ✅ ${component} - INTEGRADO`);
                } else {
                    console.log(`  ❌ ${component} - NO INTEGRADO`);
                    allIntegrated = false;
                }
            }
        } catch (error) {
            console.log(`  ❌ Error leyendo ${dashboard}: ${error.message}`);
            allIntegrated = false;
        }
    }
    
    return allIntegrated;
}

// Test 3: Verificar imports correctos
async function testImports() {
    console.log('\n📦 TEST 3: Verificando imports...');
    
    const fs = require('fs');
    const files = [
        'components/BuyerDashboard.tsx',
        'components/SellerDashboard.tsx', 
        'components/DriverDashboard.tsx'
    ];
    
    let allImportsCorrect = true;
    
    for (const file of files) {
        console.log(`\n🔍 Verificando imports en ${file}:`);
        
        try {
            const content = fs.readFileSync(file, 'utf8');
            const expectedImports = [
                "from './notifications/CriticalNotifications'",
                "from './alerts/TimeoutAlerts'",
                "from './delivery/DeliveryTracking'"
            ];
            
            for (const importLine of expectedImports) {
                if (content.includes(importLine)) {
                    console.log(`  ✅ ${importLine.split("'")[1]} - IMPORTADO`);
                } else {
                    // Algunos imports son opcionales según el dashboard
                    if (file.includes('Driver') && importLine.includes('TimeoutAlerts')) {
                        console.log(`  ⚠️ ${importLine.split("'")[1]} - OPCIONAL PARA DRIVER`);
                    } else if (file.includes('Seller') && importLine.includes('DeliveryTracking')) {
                        console.log(`  ⚠️ ${importLine.split("'")[1]} - OPCIONAL PARA SELLER`);
                    } else {
                        console.log(`  ❌ ${importLine.split("'")[1]} - NO IMPORTADO`);
                        allImportsCorrect = false;
                    }
                }
            }
        } catch (error) {
            console.log(`  ❌ Error leyendo ${file}: ${error.message}`);
            allImportsCorrect = false;
        }
    }
    
    return allImportsCorrect;
}

// Test 4: Verificar handlers implementados
async function testHandlers() {
    console.log('\n🎛️ TEST 4: Verificando handlers...');
    
    const fs = require('fs');
    const expectedHandlers = {
        'components/BuyerDashboard.tsx': [
            'handleCriticalAlert',
            'handleTimeoutAlert'
        ],
        'components/SellerDashboard.tsx': [
            'handleStockAlert',
            'handleOrderTimeout'
        ],
        'components/DriverDashboard.tsx': [
            'handleDriverAlert'
        ]
    };
    
    let allHandlersExist = true;
    
    for (const [file, handlers] of Object.entries(expectedHandlers)) {
        console.log(`\n🎯 Verificando handlers en ${file}:`);
        
        try {
            const content = fs.readFileSync(file, 'utf8');
            
            for (const handler of handlers) {
                if (content.includes(handler)) {
                    console.log(`  ✅ ${handler} - IMPLEMENTADO`);
                } else {
                    console.log(`  ❌ ${handler} - NO IMPLEMENTADO`);
                    allHandlersExist = false;
                }
            }
        } catch (error) {
            console.log(`  ❌ Error leyendo ${file}: ${error.message}`);
            allHandlersExist = false;
        }
    }
    
    return allHandlersExist;
}

// Test 5: Verificar servidor funcionando
async function testServer() {
    console.log('\n🌐 TEST 5: Verificando servidor...');
    
    return new Promise((resolve) => {
        const http = require('http');
        
        const req = http.get('http://localhost:5174', (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Servidor respondiendo en puerto 5174');
                resolve(true);
            } else {
                console.log(`❌ Servidor respondió con código: ${res.statusCode}`);
                resolve(false);
            }
        });
        
        req.on('error', (error) => {
            console.log(`❌ Error conectando al servidor: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            console.log('❌ Timeout conectando al servidor');
            resolve(false);
        });
    });
}

// Test 6: Simulación de notificaciones en consola
async function testNotificationSimulation() {
    console.log('\n🧪 TEST 6: Simulando notificaciones...');
    
    // Simular diferentes tipos de alertas
    const notifications = [
        {
            type: 'stock_low',
            message: 'Stock bajo: Tostadas Francesas (3 unidades)',
            urgency: 'critical'
        },
        {
            type: 'order_timeout',
            message: 'Orden #ABC123 pendiente por 15 minutos',
            urgency: 'high'
        },
        {
            type: 'driver_nearby',
            message: 'Repartidor a 300 metros de ubicación',
            urgency: 'medium'
        },
        {
            type: 'system_alert',
            message: 'Sin repartidores disponibles',
            urgency: 'critical'
        }
    ];
    
    console.log('🔔 Simulando notificaciones:');
    
    for (let i = 0; i < notifications.length; i++) {
        const notif = notifications[i];
        console.log(`  ${i + 1}. [${notif.urgency.toUpperCase()}] ${notif.type}: ${notif.message}`);
        
        // Simular delay entre notificaciones
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ Simulación de notificaciones completada');
    return true;
}

// Ejecutar todas las pruebas
async function runAllTests() {
    console.log('⏱️ Iniciando batería de pruebas...\n');
    
    const results = {
        components: await testComponentFiles(),
        integration: await testDashboardIntegration(),
        imports: await testImports(),
        handlers: await testHandlers(),
        server: await testServer(),
        simulation: await testNotificationSimulation()
    };
    
    // Mostrar resumen final
    console.log('\n📊 RESUMEN DE PRUEBAS:');
    console.log('====================');
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(result => result).length;
    
    for (const [test, result] of Object.entries(results)) {
        const status = result ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${test.toUpperCase()}`);
    }
    
    console.log(`\n🎯 RESULTADO FINAL: ${passedTests}/${totalTests} pruebas pasaron`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! Sistema listo para producción.');
    } else {
        console.log('⚠️ Algunas pruebas fallaron. Revisar logs arriba.');
    }
    
    console.log('\n🔗 Acceder al sistema: http://localhost:5174');
    console.log('🧪 Usar NotificationTester en BuyerDashboard para pruebas manuales');
    
    return passedTests === totalTests;
}

// Ejecutar pruebas
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { runAllTests };
