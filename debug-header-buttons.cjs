#!/usr/bin/env node

// Script para debuggear botones del header en BuyerDashboard
const fs = require('fs');
const path = require('path');

console.log('🔍 DEPURANDO BOTONES DEL HEADER...\n');

// Buscar archivos que contengan iconos de Bell o ShoppingCart
const searchPaths = [
  'components/BuyerDashboard.tsx',
  'components/buyer/',
  'components/layout/',
  'components/common/'
];

function searchInFile(filePath, searchTerms) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const matches = [];
  
  lines.forEach((line, index) => {
    searchTerms.forEach(term => {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        matches.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          term
        });
      }
    });
  });
  
  return matches;
}

function searchDirectory(dir, searchTerms) {
  if (!fs.existsSync(dir)) return [];
  
  let allMatches = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      allMatches = allMatches.concat(searchDirectory(fullPath, searchTerms));
    } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js')) {
      allMatches = allMatches.concat(searchInFile(fullPath, searchTerms));
    }
  });
  
  return allMatches;
}

// Términos de búsqueda
const searchTerms = [
  'Bell',
  'ShoppingCart', 
  'campanita',
  'carrito',
  'notification.*icon',
  'cart.*icon',
  'NotificationBell',
  '<Bell',
  '<ShoppingCart'
];

console.log('📂 Buscando en archivos relevantes...\n');

// Buscar en todos los paths relevantes
let allMatches = [];
searchPaths.forEach(searchPath => {
  if (fs.existsSync(searchPath)) {
    if (fs.statSync(searchPath).isDirectory()) {
      allMatches = allMatches.concat(searchDirectory(searchPath, searchTerms));
    } else {
      allMatches = allMatches.concat(searchInFile(searchPath, searchTerms));
    }
  }
});

// Mostrar resultados
if (allMatches.length > 0) {
  console.log('🚨 ENCONTRADOS BOTONES/ICONOS SOSPECHOSOS:\n');
  
  // Agrupar por archivo
  const byFile = {};
  allMatches.forEach(match => {
    if (!byFile[match.file]) {
      byFile[match.file] = [];
    }
    byFile[match.file].push(match);
  });
  
  Object.keys(byFile).forEach(file => {
    console.log(`📄 ${file}:`);
    byFile[file].forEach(match => {
      console.log(`   Línea ${match.line}: ${match.content}`);
      console.log(`   Término: ${match.term}\n`);
    });
  });
} else {
  console.log('✅ No se encontraron referencias a botones de campanita o carrito\n');
}

// Verificar el estado actual del BuyerDashboard
const buyerDashboardPath = 'components/BuyerDashboard.tsx';
if (fs.existsSync(buyerDashboardPath)) {
  console.log('🔎 VERIFICANDO BUYERDASHBOARD ACTUAL...\n');
  
  const content = fs.readFileSync(buyerDashboardPath, 'utf8');
  
  // Verificar header section
  const headerMatch = content.match(/header className[^>]*>[\s\S]*?<\/header>/gi);
  if (headerMatch) {
    console.log('🎯 SECCIÓN HEADER ENCONTRADA:');
    headerMatch.forEach((header, index) => {
      console.log(`\nHeader ${index + 1}:`);
      console.log(header);
    });
  }
  
  // Verificar imports relacionados con Bell o ShoppingCart
  const importLines = content.split('\n').filter(line => 
    line.includes('import') && (line.includes('Bell') || line.includes('ShoppingCart'))
  );
  
  if (importLines.length > 0) {
    console.log('\n📦 IMPORTS RELACIONADOS:');
    importLines.forEach(line => {
      console.log(`   ${line}`);
    });
  }
} else {
  console.log('❌ No se pudo encontrar BuyerDashboard.tsx');
}

console.log('\n🏁 Depuración completada.');
