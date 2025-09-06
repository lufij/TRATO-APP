// DEBUG ESPECIFICO PARA BOTON DE PRODUCTO DEL DIA
// ====================================================
// Ejecutar en consola del navegador después de cargar BusinessProfile

console.log('🛒 DEBUGGING ESPECÍFICO DE PRODUCTOS DEL DÍA');

// 1. Verificar que los productos del día estén cargados
console.log('📦 Verificando productos del día en la página...');

// 2. Agregar event listener a TODOS los botones para ver cuál se está clickeando
document.addEventListener('click', function(event) {
  const target = event.target;
  
  // Si es un botón
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    const button = target.tagName === 'BUTTON' ? target : target.closest('button');
    const buttonText = button.textContent.trim();
    
    console.log('🖱️ BOTÓN CLICKEADO:', {
      text: buttonText,
      className: button.className,
      parent: button.parentElement?.className,
      isAddToCartButton: buttonText.includes('Agregar') || buttonText.includes('+') || button.className.includes('bg-orange'),
    });
    
    // Si parece ser un botón de agregar al carrito
    if (buttonText.includes('Agregar') || buttonText.includes('+') || button.className.includes('bg-orange')) {
      console.log('🎯 ESTE PARECE SER EL BOTÓN DE CARRITO');
      console.log('📊 Detalles completos:', {
        button: button,
        onclick: button.onclick,
        listeners: getEventListeners ? getEventListeners(button) : 'No disponible'
      });
    }
  }
}, true);

// 3. Buscar específicamente el botón de productos del día
setTimeout(() => {
  const orangeButtons = document.querySelectorAll('button[class*="bg-orange"]');
  console.log('🟠 BOTONES NARANJA ENCONTRADOS:', orangeButtons.length);
  
  orangeButtons.forEach((button, index) => {
    console.log(`Botón ${index + 1}:`, {
      text: button.textContent.trim(),
      className: button.className,
      disabled: button.disabled,
      productInfo: button.closest('[data-product-id]') || 'No product ID found'
    });
  });
  
  // Buscar productos del día específicamente
  const dailyProductCards = document.querySelectorAll('[class*="bg-orange-50"], [class*="border-orange"]');
  console.log('📅 TARJETAS DE PRODUCTOS DEL DÍA:', dailyProductCards.length);
}, 2000);

console.log('✅ Debug configurado. Haz clic en "Agregar al carrito" de un producto del día y revisa la consola.');
