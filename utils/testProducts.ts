/**
 * Script temporal para agregar productos de prueba con diferentes niveles de stock
 * Esto nos permitirá probar la funcionalidad del contador de disponibilidad
 */

// Para uso temporal en desarrollo - agregar productos con diferentes stocks
export const createTestProducts = () => {
  console.log('🧪 MODO DESARROLLO: Agregando productos de prueba');
  
  return [
    {
      id: 'test-1',
      name: 'Sopa con esquites',
      description: 'Deliciosa sopa tradicional con esquites y especias',
      price: 40.00,
      stock_quantity: 25, // Stock normal
      is_available: true,
      image_url: '/placeholder-food.jpg',
      category: 'Sopas',
      seller_id: 'test-seller'
    },
    {
      id: 'test-2', 
      name: 'Tacos de carnitas',
      description: 'Tacos con carnitas de cerdo y salsa verde',
      price: 35.00,
      stock_quantity: 3, // Últimas unidades
      is_available: true,
      image_url: '/placeholder-tacos.jpg',
      category: 'Tacos',
      seller_id: 'test-seller'
    },
    {
      id: 'test-3',
      name: 'Quesadillas de queso',
      description: 'Quesadillas hechas con queso oaxaca',
      price: 28.00,
      stock_quantity: 5, // Stock bajo
      is_available: true,
      image_url: '/placeholder-quesadilla.jpg',
      category: 'Quesadillas',
      seller_id: 'test-seller'
    },
    {
      id: 'test-4',
      name: 'Chilaquiles rojos',
      description: 'Chilaquiles con salsa roja y crema',
      price: 45.00,
      stock_quantity: 0, // Sin stock
      is_available: true,
      image_url: '/placeholder-chilaquiles.jpg',
      category: 'Desayunos',
      seller_id: 'test-seller'
    },
    {
      id: 'test-5',
      name: 'Pozole rojo',
      description: 'Pozole tradicional con maíz pozolero',
      price: 55.00,
      stock_quantity: 8, // Stock normal
      is_available: false, // Deshabilitado por el vendedor
      image_url: '/placeholder-pozole.jpg',
      category: 'Sopas',
      seller_id: 'test-seller'
    }
  ];
};

// Solo para desarrollo - verificar si estamos en modo de prueba
export const isTestMode = () => {
  return window.location.hostname === 'localhost' && 
         window.location.search.includes('test=true');
};
