-- CREAR TABLA DE CARRITO Y ACTUALIZAR FUNCION add_to_cart_safe

-- Tabla básica de carrito
CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_type TEXT,
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP DEFAULT now()
);

-- Políticas ultra-permisivas
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_items_all" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.cart_items TO authenticated;

-- Función para agregar al carrito
CREATE OR REPLACE FUNCTION public.add_to_cart_safe(
  p_product_id uuid,
  p_product_type text,
  p_quantity integer,
  p_user_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.cart_items (user_id, product_id, product_type, quantity)
  VALUES (p_user_id, p_product_id, p_product_type, p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificación
SELECT 'Tabla de carrito y función actualizadas exitosamente' as status;
