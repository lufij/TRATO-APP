#!/usr/bin/env node

// Script para verificar que NO hay más iconos de Bell o ShoppingCart en el header del BuyerDashboard
const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN FINAL - BOTONES ELIMINADOS DEL HEADER...\n');

// Leer BuyerDashboard.tsx actual
const buyerDashboardPath = 'components/BuyerDashboard.tsx';
if (fs.existsSync(buyerDashboardPath)) {
  const content = fs.readFileSync(buyerDashboardPath, 'utf8');
  
  console.log('📄 VERIFICANDO BUYERDASHBOARD.TSX:\n');
  
  // Verificar imports
  const hasShoppingCartImport = content.includes('ShoppingCart');
  const hasBellImport = content.includes('Bell');
  
  console.log(`❓ Import ShoppingCart: ${hasShoppingCartImport ? '❌ SÍ' : '✅ NO'}`);
  console.log(`❓ Import Bell: ${hasBellImport ? '❌ SÍ' : '✅ NO'}`);
  
  // Verificar usos en JSX
  const shoppingCartMatches = content.match(/<ShoppingCart/gi);
  const bellMatches = content.match(/<Bell/gi);
  
  console.log(`❓ Componente <ShoppingCart>: ${shoppingCartMatches ? `❌ ${shoppingCartMatches.length} encontrados` : '✅ NINGUNO'}`);
  console.log(`❓ Componente <Bell>: ${bellMatches ? `❌ ${bellMatches.length} encontrados` : '✅ NINGUNO'}`);
  
  // Verificar estado showCart
  const hasShowCart = content.includes('showCart');
  console.log(`❓ Variable showCart: ${hasShowCart ? '❌ SÍ' : '✅ NO'}`);
  
  // Verificar header section
  const headerMatch = content.match(/header className[^>]*>[\s\S]*?<\/header>/gi);
  if (headerMatch) {
    console.log('\n🎯 HEADER ACTUAL:');
    headerMatch.forEach((header, index) => {
      console.log(`\nHeader ${index + 1}:`);
      console.log('----------------------------');
      console.log(header);
      console.log('----------------------------');
      
      // Verificar si el header contiene iconos sospechosos
      const hasIcons = header.includes('Bell') || header.includes('ShoppingCart') || header.includes('campanita') || header.includes('carrito');
      console.log(`❓ Contiene iconos de campana/carrito: ${hasIcons ? '❌ SÍ' : '✅ NO'}`);
    });
  }
  
  console.log('\n📱 NAVEGACIÓN MÓVIL:');
  const mobileNavMatch = content.match(/mobile-bottom-nav[\s\S]*?grid-cols-3[\s\S]*?\]/gi);
  if (mobileNavMatch) {
    console.log('✅ Navegación móvil encontrada (3 botones: Inicio, Pedidos, Perfil)');
  } else {
    console.log('❌ No se encontró navegación móvil');
  }
  
} else {
  console.log('❌ No se pudo encontrar BuyerDashboard.tsx');
}

// Verificar otros archivos problemáticos
console.log('\n🔍 VERIFICANDO OTROS ARCHIVOS...\n');

const problematicFiles = [
  'components/layout/Header.tsx',
  'components/common/NotificationBell.tsx'
];

problematicFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    console.log(`📄 ${file}:`);
    
    const hasShoppingCart = content.includes('<ShoppingCart');
    const hasBell = content.includes('<Bell') || content.includes('NotificationBell');
    
    console.log(`   ❓ Contiene ShoppingCart: ${hasShoppingCart ? '⚠️ SÍ' : '✅ NO'}`);
    console.log(`   ❓ Contiene Bell/NotificationBell: ${hasBell ? '⚠️ SÍ' : '✅ NO'}`);
    
    if (hasShoppingCart || hasBell) {
      console.log(`   ⚠️ ESTE ARCHIVO PODRÍA ESTAR CAUSANDO EL PROBLEMA`);
    }
  } else {
    console.log(`📄 ${file}: ✅ NO EXISTE`);
  }
});

console.log('\n🏁 Verificación completada.');
