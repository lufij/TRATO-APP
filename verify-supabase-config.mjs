#!/usr/bin/env node

/**
 * Script para verificar la configuración de Supabase
 * Ejecutar con: node verify-supabase-config.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 Verificando configuración de Supabase...\n');

// Función para verificar variables de entorno
function checkEnvFile() {
  const envPath = resolve('.env.local');
  
  try {
    const envContent = readFileSync(envPath, 'utf8');
    
    // Buscar las variables importantes
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
    
    const url = urlMatch ? urlMatch[1].trim() : null;
    const key = keyMatch ? keyMatch[1].trim() : null;
    
    console.log('📁 Archivo .env.local encontrado');
    
    if (url && url !== 'https://placeholder.supabase.co') {
      console.log('✅ VITE_SUPABASE_URL configurada');
      console.log(`   📡 URL: ${url}`);
    } else {
      console.log('❌ VITE_SUPABASE_URL no configurada o usando placeholder');
    }
    
    if (key && key !== 'placeholder_anon_key') {
      console.log('✅ VITE_SUPABASE_ANON_KEY configurada');
      console.log(`   🔑 Key: ${key.substring(0, 20)}...`);
    } else {
      console.log('❌ VITE_SUPABASE_ANON_KEY no configurada o usando placeholder');
    }
    
    return { url, key, valid: url && key && 
      url !== 'https://placeholder.supabase.co' && 
      key !== 'placeholder_anon_key' };
      
  } catch (error) {
    console.log('❌ No se encontró archivo .env.local');
    return { url: null, key: null, valid: false };
  }
}

// Función para verificar el formato de URL
function validateSupabaseUrl(url) {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('supabase.co') || 
           parsed.hostname.includes('localhost') ||
           parsed.hostname.includes('127.0.0.1');
  } catch {
    return false;
  }
}

// Función principal
function main() {
  const { url, key, valid } = checkEnvFile();
  
  console.log('\n📋 Resumen:');
  
  if (valid) {
    const urlValid = validateSupabaseUrl(url);
    
    if (urlValid) {
      console.log('✅ Configuración parece correcta');
      console.log('✅ La aplicación debería funcionar normalmente');
    } else {
      console.log('⚠️  URL de Supabase tiene formato inválido');
    }
  } else {
    console.log('❌ Configuración incompleta');
    console.log('\n🔧 Para corregir:');
    console.log('1. Edita el archivo .env.local');
    console.log('2. Agrega tus credenciales reales de Supabase');
    console.log('3. Reinicia el servidor de desarrollo (npm run dev)');
    console.log('\n📚 Consulta SOLUCION_BUCLE_INFINITO.md para más detalles');
  }
  
  console.log('\n🚀 Estado del servidor: npm run dev debe estar corriendo');
  console.log('🌐 URL local: http://localhost:5173/');
}

main();
