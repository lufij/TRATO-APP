import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
import fetchWithControls from '../network/fetcher';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  global: { fetch: fetchWithControls as unknown as typeof fetch },
});

// Types for our database
export type UserRole = 'comprador' | 'vendedor' | 'repartidor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Seller extends User {
  business_name: string;
  business_description?: string;
  business_address?: string;
  business_phone?: string;
  logo_url?: string;
  is_verified: boolean;
  rating_avg?: number;
  total_sales?: number;
}

export interface Driver extends User {
  vehicle_type: string;
  license_number: string;
  is_active: boolean;
  is_verified: boolean;
  current_location?: {
    lat: number;
    lng: number;
  };
}

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  is_public: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  seller?: Seller;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  driver_id?: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_address: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  buyer?: User;
  seller?: Seller;
  driver?: Driver;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user?: User;
  product?: Product;
}