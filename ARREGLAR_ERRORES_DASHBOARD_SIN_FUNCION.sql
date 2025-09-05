-- 🔧 ARREGLAR ERRORES 400 EN DASHBOARD DEL VENDEDOR (SIN FUNCIÓN)

-- 1️⃣ VERIFICAR SI TABLA daily_products EXISTE
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'daily_products';

-- 2️⃣ VERIFICAR SI COLUMNA business_rating EXISTE EN users
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'business_rating';

-- 3️⃣ CREAR TABLA daily_products SI NO EXISTE
CREATE TABLE IF NOT EXISTS daily_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ HABILITAR RLS EN daily_products
ALTER TABLE daily_products ENABLE ROW LEVEL SECURITY;

-- 5️⃣ POLÍTICAS PARA daily_products
CREATE POLICY "Sellers can manage their daily products" ON daily_products
    FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view available daily products" ON daily_products
    FOR SELECT USING (is_available = true AND expires_at > NOW());

-- 6️⃣ AGREGAR COLUMNA business_rating A users SI NO EXISTE
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- 7️⃣ VERIFICAR QUE TODO ESTÁ FUNCIONANDO
SELECT 'daily_products table' as item, 
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_products') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'business_rating column' as item,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_rating') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'check_seller_can_publish function' as item,
       CASE WHEN EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_seller_can_publish') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
