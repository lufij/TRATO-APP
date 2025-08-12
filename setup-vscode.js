#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE CONFIGURACIÓN AUTOMÁTICA PARA VS CODE
 * 
 * Este script instala y configura automáticamente todas las extensiones
 * y configuraciones necesarias para desarrollar TRATO de manera óptima.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log(`
🚀 ========================================
   CONFIGURACIÓN AUTOMÁTICA VS CODE TRATO
   ========================================
`);

// Extensiones requeridas para TRATO
const requiredExtensions = [
  'ms-vscode.vscode-typescript-next',
  'bradlc.vscode-tailwindcss', 
  'esbenp.prettier-vscode',
  'ms-vscode.vscode-eslint',
  'dsznajder.es7-react-js-snippets',
  'formulahendry.auto-rename-tag',
  'PKief.material-icon-theme',
  'aaron-bond.better-comments',
  'usernamehw.errorlens',
  'eamodio.gitlens',
  'GitHub.vscode-pull-request-github',
  'ms-vscode.vscode-color-picker',
  'streetsidesoftware.code-spell-checker',
  'yzhang.markdown-all-in-one'
];

// Función para ejecutar comando y manejar errores
function execCommand(command, description) {
  try {
    console.log(`🔄 ${description}...`);
    execSync(command, { stdio: 'pipe' });
    console.log(`✅ ${description} completado`);
    return true;
  } catch (error) {
    console.log(`⚠️ ${description} falló: ${error.message}`);
    return false;
  }
}

// Función para verificar si una extensión está instalada
function isExtensionInstalled(extensionId) {
  try {
    const output = execSync(`code --list-extensions`, { encoding: 'utf8' });
    return output.includes(extensionId);
  } catch (error) {
    return false;
  }
}

// Función para instalar extensiones de VS Code
function installExtensions() {
  console.log('\n📦 INSTALANDO EXTENSIONES DE VS CODE');
  console.log('=====================================');
  
  let installed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const extension of requiredExtensions) {
    if (isExtensionInstalled(extension)) {
      console.log(`✅ ${extension} ya está instalada`);
      skipped++;
    } else {
      const success = execCommand(
        `code --install-extension ${extension}`,
        `Instalando ${extension}`
      );
      if (success) {
        installed++;
      } else {
        failed++;
      }
    }
  }
  
  console.log(`\n📊 RESUMEN DE EXTENSIONES:`);
  console.log(`   ✅ Instaladas: ${installed}`);
  console.log(`   ⏭️ Ya existían: ${skipped}`);
  console.log(`   ❌ Fallaron: ${failed}`);
}

// Función para instalar dependencias npm
function installDependencies() {
  console.log('\n📦 INSTALANDO DEPENDENCIAS NPM');
  console.log('===============================');
  
  const devDependencies = [
    '@typescript-eslint/eslint-plugin@^8.15.0',
    '@typescript-eslint/parser@^8.15.0',
    'eslint@^9.15.0',
    'eslint-config-prettier@^9.1.0',
    'eslint-plugin-import@^2.31.0',
    'eslint-plugin-jsx-a11y@^6.10.2',
    'eslint-plugin-prettier@^5.2.1',
    'eslint-plugin-react@^7.37.2',
    'eslint-plugin-react-hooks@^5.0.0',
    'prettier@^3.3.3',
    '@tailwindcss/forms@^0.5.9',
    '@tailwindcss/typography@^0.5.15',
    '@tailwindcss/aspect-ratio@^0.4.2'
  ];
  
  console.log(`🔄 Instalando ${devDependencies.length} dependencias de desarrollo...`);
  
  try {
    execSync(`npm install --save-dev ${devDependencies.join(' ')}`, { 
      stdio: 'inherit' 
    });
    console.log('✅ Dependencias de desarrollo instaladas correctamente');
  } catch (error) {
    console.log('⚠️ Error instalando dependencias de desarrollo');
    console.log('   Puedes instalarlas manualmente con:');
    console.log(`   npm install --save-dev ${devDependencies.join(' ')}`);
  }
}

// Función para verificar configuración
function verifySetup() {
  console.log('\n🔍 VERIFICANDO CONFIGURACIÓN');
  console.log('============================');
  
  const files = [
    '.vscode/settings.json',
    '.vscode/extensions.json', 
    '.vscode/tasks.json',
    '.vscode/launch.json',
    '.prettierrc.json',
    '.eslintrc.json',
    'tailwind.config.js'
  ];
  
  let allGood = true;
  
  for (const file of files) {
    if (existsSync(file)) {
      console.log(`✅ ${file} configurado`);
    } else {
      console.log(`❌ ${file} faltante`);
      allGood = false;
    }
  }
  
  if (allGood) {
    console.log('\n🎉 ¡Toda la configuración está lista!');
  } else {
    console.log('\n⚠️ Algunos archivos de configuración faltan');
    console.log('   Asegúrate de que todos los archivos .vscode/* existan');
  }
}

// Función para mostrar instrucciones finales
function showFinalInstructions() {
  console.log(`
🎯 ¡CONFIGURACIÓN COMPLETADA!
=============================

Tu entorno de desarrollo TRATO está listo. Próximos pasos:

1️⃣ REINICIA VS CODE
   - Cierra completamente VS Code
   - Vuelve a abrirlo desde la terminal con: code .

2️⃣ VERIFICA EXTENSIONES
   - Ve a Extensions (Ctrl+Shift+X)
   - Deberías ver las extensiones de TRATO instaladas

3️⃣ EJECUTA EL PROYECTO
   - Abre terminal: Ctrl+Shift+\`
   - Ejecuta: npm run dev
   - O usa: Ctrl+Shift+P → "Tasks: Run Task" → "🚀 Desarrollo"

4️⃣ DISFRUTA DE LAS NUEVAS FUNCIONES
   ✨ Formateo automático al guardar
   🎨 IntelliSense de Tailwind con colores
   🔍 Errores inline con Error Lens
   📝 Snippets personalizados (trc, trcard, trbtn, etc.)
   🎯 Tasks personalizados para desarrollo

5️⃣ ATAJOS ÚTILES
   - trc + Tab: Componente React rápido
   - F5: Debug en Chrome
   - Ctrl+Shift+P: Paleta de comandos

📚 LEE LA DOCUMENTACIÓN
   - Consulta .vscode/README_DESARROLLO.md para todos los detalles
   - Lista completa de snippets y comandos disponible

🎉 ¡A desarrollar TRATO con estilo profesional! 🚀
`);
}

// Ejecutar script principal
async function main() {
  try {
    // Verificar que VS Code esté instalado
    try {
      execSync('code --version', { stdio: 'pipe' });
      console.log('✅ Visual Studio Code detectado');
    } catch (error) {
      console.log('❌ Visual Studio Code no está instalado o no está en PATH');
      console.log('   Instala VS Code desde: https://code.visualstudio.com/');
      process.exit(1);
    }
    
    // Instalar extensiones
    installExtensions();
    
    // Instalar dependencias
    installDependencies();
    
    // Verificar configuración
    verifySetup();
    
    // Mostrar instrucciones finales
    showFinalInstructions();
    
  } catch (error) {
    console.error(`❌ Error durante la configuración: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { installExtensions, installDependencies, verifySetup };