-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('comprador', 'vendedor', 'repartidor')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sellers table (extends users for sellers)
CREATE TABLE public.sellers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_address TEXT,
  business_phone TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  rating_avg DECIMAL(2,1) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table (extends users for drivers)
CREATE TABLE public.drivers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  vehicle_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  current_location JSONB, -- {lat: number, lng: number}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  image_url TEXT,
  category TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE public.cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled')),
  delivery_address TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id, order_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Users table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Sellers table policies
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller profiles are viewable by everyone" ON public.sellers
  FOR SELECT USING (true);

CREATE POLICY "Sellers can insert their own profile" ON public.sellers
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Sellers can update their own profile" ON public.sellers
  FOR UPDATE USING (auth.uid() = id);

-- Drivers table policies
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver profiles are viewable by everyone" ON public.drivers
  FOR SELECT USING (true);

CREATE POLICY "Drivers can insert their own profile" ON public.drivers
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Drivers can update their own profile" ON public.drivers
  FOR UPDATE USING (auth.uid() = id);

-- Products table policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public products are viewable by everyone" ON public.products
  FOR SELECT USING (is_public = true);

CREATE POLICY "Sellers can view their own products" ON public.products
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = seller_id);

-- Cart items table policies
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart items" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Orders table policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view orders for their products" ON public.orders
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Drivers can view assigned orders" ON public.orders
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Buyers can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update orders for their products" ON public.orders
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Drivers can update assigned orders" ON public.orders
  FOR UPDATE USING (auth.uid() = driver_id);

-- Order items table policies
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items are viewable by order participants" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid() OR orders.driver_id = auth.uid())
    )
  );

CREATE POLICY "Buyers can insert order items for their orders" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.buyer_id = auth.uid()
    )
  );

-- Reviews table policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert reviews for their completed orders" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = reviews.order_id 
      AND orders.buyer_id = auth.uid()
      AND orders.status = 'delivered'
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('products', 'products', true),
  ('avatars', 'avatars', true),
  ('business-logos', 'business-logos', true);

-- Storage policies
CREATE POLICY "Public product images" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Sellers can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Sellers can update their product images" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Sellers can delete their product images" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public business logos" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');
CREATE POLICY "Sellers can upload business logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Sellers can update their business logos" ON storage.objects FOR UPDATE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Sellers can delete their business logos" ON storage.objects FOR DELETE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);