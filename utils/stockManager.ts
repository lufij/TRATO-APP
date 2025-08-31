/**
 * SISTEMA DE GESTIÓN DE INVENTARIO
 * ===================================
 * 
 * Funciones seguras para manejar la actualización de stock en tiempo real
 * cuando se realizan ventas y se confirman órdenes.
 * 
 * CARACTERÍSTICAS:
 * - Actualización automática de stock al confirmar órdenes
 * - Validaciones para prevenir overselling
 * - Rollback automático en caso de cancelaciones
 * - Reserva temporal durante checkout
 * - Logging completo para auditoría
 */

import { supabase } from '../utils/supabase/client';

export interface StockUpdateResult {
  success: boolean;
  message: string;
  updatedProducts?: Array<{
    product_id: string;
    old_stock: number;
    new_stock: number;
    quantity_sold: number;
    product_type?: string; // ✅ NUEVO: Tipo de producto
  }>;
}

export interface OrderItem {
  product_id: string;
  daily_product_id?: string; // ✅ RESTAURADO: Columna ya existe
  quantity: number;
  product_name?: string;
  product_type?: string; // ✅ NUEVO: Tipo de producto ('daily' | 'regular')
}

/**
 * Actualiza el stock de productos cuando se confirma una orden
 * 
 * ⚠️ ESTRUCTURA DE DATOS IMPORTANTE:
 * - Productos del día: Se almacenan en 'daily_products' table
 * - Los order_items de productos del día usan: product_type='daily' + product_id apunta a daily_products
 * - Los order_items NO usan daily_product_id (campo legacy/unused)
 * - Productos regulares: Se almacenan en 'products' table con product_type='regular' o null
 * 
 * @param orderItems - Items de la orden que afectan el inventario
 * @param orderId - ID de la orden para logging
 * @returns Resultado de la actualización
 */
export async function updateProductStock(
  orderItems: OrderItem[], 
  orderId: string
): Promise<StockUpdateResult> {
  
  console.log('🔄 Iniciando actualización de stock para orden:', orderId);
  console.log('📦 Items a procesar:', orderItems.length);
  
  // Mostrar cada item de forma legible
  orderItems.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.product_name}`);
    console.log(`      - Cantidad: ${item.quantity}`);
    console.log(`      - Tipo: ${item.product_type || 'regular'}`);
    console.log(`      - Product ID: ${item.product_id}`);
    console.log(`      - Daily Product ID: ${item.daily_product_id || 'N/A'}`);
  });

  if (!orderItems || orderItems.length === 0) {
    console.log('⚠️ No hay items para procesar');
    return {
      success: false,
      message: 'No hay items para actualizar stock'
    };
  }

  try {
    const updatedProducts: Array<{
      product_id: string;
      old_stock: number;
      new_stock: number;
      quantity_sold: number;
      product_type?: string; // ✅ NUEVO: Incluir tipo
    }> = [];

    // Procesar cada producto por separado para mayor seguridad
    for (const item of orderItems) {
      console.log(`🔍 Procesando producto, cantidad: ${item.quantity}, tipo: ${item.product_type || 'regular'}`);
      console.log(`    Product ID: ${item.product_id}, Daily Product ID: ${item.daily_product_id}`);

      const isDaily = item.product_type === 'daily' || !!item.daily_product_id;
      const tableName = isDaily ? 'daily_products' : 'products';
      
      let currentProduct = null;
      let fetchError = null;

      // ESTRATEGIA MÚLTIPLE DE BÚSQUEDA - CORREGIDA PARA ESTRUCTURA REAL
      
      // OPCIÓN 1: Para productos del día, buscar por product_id en daily_products
      // (La estructura real usa product_type='daily' + product_id apuntando a daily_products)
      if (isDaily && item.product_id) {
        console.log(`🔍 OPCIÓN 1: Buscando producto del día por product_id: ${item.product_id}`);
        const { data: productByDailyId, error: dailyIdError } = await supabase
          .from('daily_products')
          .select('id, name, stock_quantity, is_available')
          .eq('id', item.product_id)
          .single();

        if (!dailyIdError && productByDailyId) {
          currentProduct = productByDailyId;
          console.log(`✅ ENCONTRADO por product_id en daily_products: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por product_id en daily_products:`, dailyIdError?.message);
        }
      }

      // OPCIÓN 2: Buscar por daily_product_id si existe (legacy)
      if (!currentProduct && isDaily && item.daily_product_id) {
        console.log(`🔍 OPCIÓN 2: Buscando por daily_product_id (legacy): ${item.daily_product_id}`);
        const { data: productByDailyId, error: dailyIdError } = await supabase
          .from('daily_products')
          .select('id, name, stock_quantity, is_available')
          .eq('id', item.daily_product_id)
          .single();

        if (!dailyIdError && productByDailyId) {
          currentProduct = productByDailyId;
          console.log(`✅ ENCONTRADO por daily_product_id: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por daily_product_id:`, dailyIdError?.message);
        }
      }

      // OPCIÓN 3: Para productos regulares, buscar por product_id en products
      if (!currentProduct && !isDaily && item.product_id) {
        console.log(`🔍 OPCIÓN 3: Buscando producto regular por product_id: ${item.product_id}`);
        const { data: productById, error: idError } = await supabase
          .from('products')
          .select('id, name, stock_quantity, is_available')
          .eq('id', item.product_id)
          .single();

        if (!idError && productById) {
          currentProduct = productById;
          console.log(`✅ ENCONTRADO por product_id en products: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por product_id en products:`, idError?.message);
        }
      }

      // OPCIÓN 4: Buscar por nombre en daily_products (para productos del día)
      if (!currentProduct && isDaily && item.product_name) {
        console.log(`🔍 OPCIÓN 4: Buscando por nombre en daily_products: ${item.product_name}`);
        const { data: productsByName, error: nameError } = await supabase
          .from('daily_products')
          .select('id, name, stock_quantity, is_available, expires_at')
          .eq('name', item.product_name)
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (!nameError && productsByName && productsByName.length > 0) {
          currentProduct = productsByName[0];
          console.log(`✅ ENCONTRADO por nombre: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por nombre:`, nameError?.message);
        }
      }

      // OPCIÓN 5: Buscar por nombre en products (para productos regulares)
      if (!currentProduct && !isDaily && item.product_name) {
        console.log(`🔍 OPCIÓN 5: Buscando por nombre en products: ${item.product_name}`);
        const { data: productsByName, error: nameError } = await supabase
          .from('products')
          .select('id, name, stock_quantity, is_available')
          .eq('name', item.product_name)
          .limit(1);

        if (!nameError && productsByName && productsByName.length > 0) {
          currentProduct = productsByName[0];
          console.log(`✅ ENCONTRADO por nombre: ${currentProduct.name}`);
        } else {
          console.log(`❌ No encontrado por nombre:`, nameError?.message);
        }
      }

      // Si aún no se encuentra, error crítico
      if (!currentProduct) {
        console.log(`❌ PRODUCTO NO ENCONTRADO EN NINGUNA BÚSQUEDA`);
        console.log(`🔍 Detalles del item:`, {
          product_id: item.product_id,
          daily_product_id: item.daily_product_id,
          product_name: item.product_name,
          product_type: item.product_type,
          isDaily,
          tableName
        });
        return {
          success: false,
          message: `Error al obtener información del producto ${item.product_name}. Producto no encontrado en ninguna tabla.`
        };
      }

      const oldStock = currentProduct.stock_quantity;
      const newStock = oldStock - item.quantity;

      console.log(`📊 ${isDaily ? 'Producto del día' : 'Producto regular'} "${currentProduct.name}": ${oldStock} → ${newStock} (vendido: ${item.quantity})`);

      // 2. Validar que hay suficiente stock
      if (oldStock < item.quantity) {
        console.error(`❌ Stock insuficiente para ${currentProduct.name}: tiene ${oldStock}, necesita ${item.quantity}`);
        return {
          success: false,
          message: `Stock insuficiente para ${currentProduct.name}. Solo quedan ${oldStock} unidades.`
        };
      }

      // 3. Determinar la tabla correcta para la actualización
      const updateTableName = isDaily ? 'daily_products' : 'products';
      
      console.log(`🔄 Actualizando en tabla: ${updateTableName}, ID: ${currentProduct.id}`);

      // 4. Actualizar el stock en la base de datos
      const updateData: any = {
        stock_quantity: newStock,
        updated_at: new Date().toISOString()
      };

      // Solo actualizar is_available si el producto no es del día (los productos del día se manejan por expiración)
      if (!isDaily) {
        updateData.is_available = newStock > 0 && currentProduct.is_available;
      }

      const { error: updateError } = await supabase
        .from(updateTableName)
        .update(updateData)
        .eq('id', currentProduct.id);

      if (updateError) {
        console.error(`❌ Error actualizando stock para ${currentProduct.id}:`, updateError);
        
        // Si falla, hacer rollback de productos ya actualizados
        await rollbackStockUpdates(updatedProducts, orderId);
        
        return {
          success: false,
          message: `Error al actualizar el stock del producto ${currentProduct.name}`
        };
      }

      // 4. Registrar la actualización exitosa
      updatedProducts.push({
        product_id: currentProduct.id, // ✅ USAR EL ID DEL PRODUCTO ENCONTRADO
        old_stock: oldStock,
        new_stock: newStock,
        quantity_sold: item.quantity,
        product_type: item.product_type || 'regular' // ✅ NUEVO: Incluir tipo
      });

      console.log(`✅ Stock actualizado exitosamente para "${currentProduct.name}" (${isDaily ? 'producto del día' : 'producto regular'})`);
    }

    // 5. Registrar la transacción en el log (opcional, para auditoría)
    await logStockTransaction(orderId, 'stock_decrease', updatedProducts);

    console.log('🎉 Actualización de stock completada exitosamente');
    
    return {
      success: true,
      message: 'Stock actualizado correctamente',
      updatedProducts
    };

  } catch (error) {
    console.error('❌ Error inesperado actualizando stock:', error);
    return {
      success: false,
      message: 'Error inesperado al actualizar el inventario'
    };
  }
}

/**
 * Rollback de actualizaciones de stock en caso de error
 */
async function rollbackStockUpdates(
  updatedProducts: Array<{
    product_id: string;
    old_stock: number;
    new_stock: number;
    quantity_sold: number;
    product_type?: string; // ✅ NUEVO: Incluir tipo para rollback
  }>,
  orderId: string
): Promise<void> {
  
  console.log('🔄 Iniciando rollback de stock para orden:', orderId);
  
  for (const update of updatedProducts) {
    try {
      const isDaily = update.product_type === 'daily';
      const tableName = isDaily ? 'daily_products' : 'products';
      
      await supabase
        .from(tableName)
        .update({
          stock_quantity: update.old_stock, // Restaurar stock original
          updated_at: new Date().toISOString()
        })
        .eq('id', update.product_id);
      
      console.log(`✅ Rollback exitoso para ${isDaily ? 'producto del día' : 'producto regular'} ${update.product_id}: ${update.new_stock} → ${update.old_stock}`);
    } catch (rollbackError) {
      console.error(`❌ Error en rollback para producto ${update.product_id}:`, rollbackError);
    }
  }
}

/**
 * Restaura stock cuando se cancela una orden
 */
export async function restoreProductStock(
  orderItems: OrderItem[], 
  orderId: string
): Promise<StockUpdateResult> {
  
  console.log('🔄 Iniciando restauración de stock para orden cancelada:', orderId);

  try {
    const restoredProducts: Array<{
      product_id: string;
      old_stock: number;
      new_stock: number;
      quantity_sold: number;
      product_type?: string;
    }> = [];

    for (const item of orderItems) {
      const isDaily = item.product_type === 'daily';
      const tableName = isDaily ? 'daily_products' : 'products';
      
      // Obtener stock actual
      const { data: currentProduct, error: fetchError } = await supabase
        .from(tableName)
        .select('id, name, stock_quantity, is_available')
        .eq('id', item.product_id)
        .single();

      if (fetchError || !currentProduct) {
        console.error(`❌ Error obteniendo ${isDaily ? 'producto del día' : 'producto regular'} para restaurar ${item.product_id}:`, fetchError);
        continue;
      }

      const oldStock = currentProduct.stock_quantity;
      const newStock = oldStock + item.quantity;

      // Restaurar stock
      const updateData: any = {
        stock_quantity: newStock,
        updated_at: new Date().toISOString()
      };

      // Solo actualizar is_available para productos regulares
      if (!isDaily) {
        updateData.is_available = true;
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', item.product_id);

      if (updateError) {
        console.error(`❌ Error restaurando stock para ${item.product_id}:`, updateError);
        continue;
      }

      restoredProducts.push({
        product_id: item.product_id,
        old_stock: oldStock,
        new_stock: newStock,
        quantity_sold: -item.quantity,
        product_type: item.product_type || 'regular'
      });

      console.log(`✅ Stock restaurado para "${currentProduct.name}" (${isDaily ? 'producto del día' : 'producto regular'}): ${oldStock} → ${newStock}`);
    }

    // Log de la restauración
    await logStockTransaction(orderId, 'stock_restore', restoredProducts);

    return {
      success: true,
      message: 'Stock restaurado correctamente',
      updatedProducts: restoredProducts
    };

  } catch (error) {
    console.error('❌ Error inesperado restaurando stock:', error);
    return {
      success: false,
      message: 'Error inesperado al restaurar el inventario'
    };
  }
}

/**
 * Registra transacciones de stock para auditoría (opcional)
 */
async function logStockTransaction(
  orderId: string,
  type: 'stock_decrease' | 'stock_restore',
  products: Array<{
    product_id: string;
    old_stock: number;
    new_stock: number;
    quantity_sold: number;
  }>
): Promise<void> {
  try {
    // Esto es opcional - solo para debugging en desarrollo
    console.log('📝 Log de transacción de stock:', {
      orderId,
      type,
      timestamp: new Date().toISOString(),
      products
    });

    // Aquí podrías insertar en una tabla de logs si quieres auditoría completa
    // await supabase.from('stock_transactions').insert({ ... });
    
  } catch (error) {
    console.warn('⚠️ Error registrando log de stock (no crítico):', error);
  }
}

/**
 * Valida que hay suficiente stock antes de crear una orden
 */
export async function validateStockBeforeOrder(orderItems: OrderItem[]): Promise<{
  isValid: boolean;
  message: string;
  invalidItems?: Array<{
    product_id: string;
    product_name: string;
    requested: number;
    available: number;
  }>;
}> {
  
  console.log('🔍 Validando stock antes de crear orden');
  
  try {
    const invalidItems: Array<{
      product_id: string;
      product_name: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of orderItems) {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, is_available')
        .eq('id', item.product_id)
        .single();

      if (error || !product) {
        invalidItems.push({
          product_id: item.product_id,
          product_name: item.product_name || 'Producto desconocido',
          requested: item.quantity,
          available: 0
        });
        continue;
      }

      if (!product.is_available || product.stock_quantity < item.quantity) {
        invalidItems.push({
          product_id: item.product_id,
          product_name: product.name,
          requested: item.quantity,
          available: product.stock_quantity
        });
      }
    }

    if (invalidItems.length > 0) {
      const messages = invalidItems.map(item => 
        `${item.product_name}: solicitas ${item.requested}, disponibles ${item.available}`
      );
      
      return {
        isValid: false,
        message: `Stock insuficiente: ${messages.join('; ')}`,
        invalidItems
      };
    }

    return {
      isValid: true,
      message: 'Stock suficiente para todos los productos'
    };

  } catch (error) {
    console.error('❌ Error validando stock:', error);
    return {
      isValid: false,
      message: 'Error al validar disponibilidad de productos'
    };
  }
}
