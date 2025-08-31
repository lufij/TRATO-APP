## 🧪 PRUEBA MANUAL: Fix de Stock de Productos del Día

### 📋 **PASOS PARA PROBAR:**

#### **PASO 1: Preparación**
1. Abrir http://localhost:5176 en el navegador
2. Abrir DevTools (F12) y ir a la pestaña **Console**
3. **IMPORTANTE**: Verificar que hay productos del día disponibles

#### **PASO 2: Como Comprador**
1. Iniciar sesión como comprador o crear cuenta
2. Ir a la página principal y buscar **productos del día**
3. **Anotar el stock inicial** de un producto del día (ej: "Tostadas - Stock: 10")
4. Agregar ese producto al carrito (ej: 2 unidades)
5. Completar la compra (delivery, pickup, o dine-in)
6. Confirmar el pedido

#### **PASO 3: Como Vendedor**
1. Abrir nueva pestaña o ventana de incógnito
2. Iniciar sesión como **vendedor** (del mismo producto del día)
3. Ir a "Gestión de Pedidos"
4. **Buscar el pedido recién creado** (estado: "pending")
5. **CLIC en "Aceptar Pedido"** ← ⭐ MOMENTO CRÍTICO
6. **OBSERVAR la consola del navegador** - Debería mostrar:
   ```
   🔄 Orden aceptada, actualizando stock...
   🔍 Procesando producto, cantidad: 2, tipo: daily
   📊 Producto del día "Tostadas": 10 → 8 (vendido: 2)
   ✅ Stock actualizado exitosamente
   ```

#### **PASO 4: Verificación**
1. Volver a la vista del comprador
2. Refrescar la página principal
3. **Verificar que el stock disminuyó correctamente**
   - Antes: "Tostadas - Stock: 10"
   - Después: "Tostadas - Stock: 8"

### 🔍 **QUÉ BUSCAR EN LA CONSOLA:**

#### ✅ **ÉXITO** - Deberías ver:
```
🔄 Orden aceptada, actualizando stock...
🔍 Procesando producto, cantidad: 2, tipo: daily
    Product ID: abc123, Daily Product ID: abc123
✅ Producto encontrado por ID: abc123
📊 Producto del día "Tostadas": 10 → 8 (vendido: 2)
✅ Stock actualizado exitosamente para "Tostadas" (producto del día)
🎉 Actualización de stock completada exitosamente
✅ Stock actualizado exitosamente: [...]
Orden aceptada y stock actualizado
```

#### ❌ **ERROR** - Si ves:
```
❌ Error obteniendo items de la orden: [error]
❌ Error actualizando stock: [mensaje]
❌ No se encontró producto por ID [id]
❌ Stock insuficiente para [producto]
```

### 🔧 **SOLUCIÓN DE PROBLEMAS:**

#### Si el stock NO se descuenta:
1. **Verificar consola**: ¿Aparecen los logs de stock?
2. **Verificar base de datos**: ¿Los order_items tienen `product_type: 'daily'`?
3. **Verificar product_id**: ¿Coincide con el ID en `daily_products`?

#### Si hay errores en consola:
1. **Error de permisos**: Verificar RLS en Supabase
2. **Producto no encontrado**: Verificar que `daily_product_id` esté correctamente configurado
3. **Error de conexión**: Verificar conexión a Supabase

### 📊 **RESULTADOS ESPERADOS:**

- ✅ Stock se descuenta inmediatamente al aceptar la orden
- ✅ Los compradores ven el stock actualizado al refrescar
- ✅ No hay errores en la consola del navegador
- ✅ El mensaje de éxito aparece: "Orden aceptada y stock actualizado"

---

**🔥 NOTA IMPORTANTE**: Este fix resuelve el problema donde los productos del día no decrementaban su inventario después de las ventas exitosas. Ahora el stock se actualiza automáticamente cuando el vendedor acepta la orden.
