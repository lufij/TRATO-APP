
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Supabase URL or Anon Key is missing.");
  console.error("Please ensure your .env.local file is correctly set up with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PRODUCT_ID = 'e87cf8fc-d303-498a-a15b-8a6aa089d418';
const QUANTITY_SOLD = 1; // Based on the user's context of a single sale.

async function correctPastStock() {
  console.log(`Iniciando corrección de stock para el producto del día ID: ${PRODUCT_ID}`);

  try {
    // 1. Obtener el stock actual
    const { data: product, error: fetchError } = await supabase
      .from('daily_products')
      .select('stock_quantity, name')
      .eq('id', PRODUCT_ID)
      .single();

    if (fetchError || !product) {
      console.error(`Error: No se pudo encontrar el producto con ID ${PRODUCT_ID}.`);
      throw fetchError || new Error('Producto no encontrado.');
    }

    const currentStock = product.stock_quantity;
    const productName = product.name;
    console.log(`- Producto: "${productName}"`);
    console.log(`- Stock actual en la base de datos: ${currentStock}`);

    // 2. Calcular el nuevo stock
    const newStock = currentStock - QUANTITY_SOLD;
    console.log(`- Unidades vendidas en el pasado: ${QUANTITY_SOLD}`);
    console.log(`- Nuevo stock calculado: ${newStock}`);

    if (newStock < 0) {
        console.warn(`Advertencia: El nuevo stock es negativo (${newStock}). Esto podría indicar que la venta ya fue descontada o hay un error en los datos.`);
        console.log('No se realizará ninguna actualización para evitar inconsistencias.');
        return;
    }
    
    if (currentStock === newStock) {
        console.log('Información: El stock actual ya parece correcto. No se necesita ninguna actualización.');
        return;
    }

    // 3. Actualizar el stock en la base de datos
    console.log('...Actualizando base de datos...');
    const { error: updateError } = await supabase
      .from('daily_products')
      .update({ stock_quantity: newStock })
      .eq('id', PRODUCT_ID);

    if (updateError) {
      console.error('Error al actualizar el stock en Supabase.');
      throw updateError;
    }

    console.log('✅ ¡Éxito! El stock ha sido corregido.');
    console.log(`El producto "${productName}" ahora tiene un stock de ${newStock}.`);

  } catch (error) {
    console.error('❌ Falló el script de corrección de stock.');
    console.error('Causa:', error.message);
  }
}

correctPastStock();
