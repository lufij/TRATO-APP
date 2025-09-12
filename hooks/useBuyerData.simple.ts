import { useState, useEffect } from 'react';
import { supabase, Product, Seller } from '../utils/supabase/client';
import { getBusinessImageUrl } from '../utils/imageUtils';
import { forceClearSupabaseCache, forceRefreshWithTimestamp } from '../utils/cacheBuster';

// Hook for handling page visibility (optimize for mobile battery)
const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

export interface DailyProduct {
  id: string;
  seller_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock_quantity: number;
  expires_at: string;
  created_at: string;
  seller?: Seller;
}

export interface BusinessListing {
  id: string;
  business_name: string;
  business_description?: string;
  business_address?: string;
  business_phone?: string;
  phone?: string;
  address?: string | null;
  logo_url?: string;
  cover_image_url?: string;
  is_verified: boolean;
  products_count: number;
  rating: number;
  user: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    avatar_url?: string;
  };
  cover_image?: string;
  category?: string;
  phone_number?: string;
  is_open_now?: boolean;
}

export function useBuyerData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyProducts, setDailyProducts] = useState<DailyProduct[]>([]);
  const [businesses, setBusinesses] = useState<BusinessListing[]>([]);
  const [loading, setLoading] = useState({
    products: false,
    dailyProducts: false,
    businesses: false,
  });

  const isVisible = usePageVisibility();

  const fetchProducts = async (filters?: { search?: string; category?: string; sellerId?: string }) => {
    try {
      setLoading(prev => ({ ...prev, products: true }));

      let query = supabase
        .from('products')
        .select(`
          *,
          seller:sellers(
            id,
            business_name,
            business_description,
            logo_url,
            is_verified,
            user:users(name, avatar_url)
          )
        `)
        .eq('is_public', true)
        .gt('stock_quantity', 0);

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } else {
        setProducts((data as any[]) || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchDailyProducts = async (filters?: { search?: string }) => {
    try {
      setLoading(prev => ({ ...prev, dailyProducts: true }));

      let query = supabase
        .from('daily_products')
        .select(`
          *,
          seller:sellers(
            id,
            business_name,
            logo_url,
            is_verified,
            user:users(name, avatar_url)
          )
        `)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .gte('expires_at', new Date().toISOString());

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching daily products:', error);
        setDailyProducts([]);
      } else {
        const uniqueProducts = data ? data.filter((product, index, self) =>
          index === self.findIndex(p => p.name === product.name)
        ) : [];
        setDailyProducts(uniqueProducts);
      }
    } catch (error) {
      console.error('Error fetching daily products:', error);
      setDailyProducts([]);
    } finally {
      setLoading(prev => ({ ...prev, dailyProducts: false }));
    }
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(prev => ({ ...prev, businesses: true }));
      
      console.log('🔍 INICIANDO fetchBusinesses SIMPLIFICADO...');

      const { data, error } = await supabase
        .from('sellers')
        .select(`
          id,
          business_name,
          business_description,
          business_address,
          business_phone,
          logo_url,
          is_verified,
          user:users(name, avatar_url)
        `)
        .not('business_name', 'is', null)
        .order('is_verified', { ascending: false });
        
      console.log('📊 Respuesta de Supabase:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Error en consulta:', error);
        setBusinesses([]);
        return;
      }

      console.log('✅ Datos recibidos:', data?.length || 0, 'negocios');
      
      const businessesWithStats = (data || []).map(business => ({
        id: business.id,
        business_name: business.business_name,
        business_description: business.business_description || undefined,
        business_address: business.business_address || undefined,
        business_phone: business.business_phone || undefined,
        logo_url: getBusinessImageUrl(business.logo_url),
        is_verified: business.is_verified,
        products_count: 0,
        rating: 0,
        user: {
          name: business.user?.name ?? 'Usuario',
          phone: undefined,
          email: undefined,
          address: undefined,
          avatar_url: business.user?.avatar_url ?? undefined
        },
        phone: undefined,
        address: undefined,
        cover_image: undefined,
        category: 'General',
        phone_number: business.business_phone || undefined,
        is_open_now: true
      }));

      console.log('🎯 NEGOCIOS PROCESADOS:', businessesWithStats.length);
      setBusinesses(businessesWithStats);
    } catch (error) {
      console.error('💥 Error general:', error);
      setBusinesses([]);
    } finally {
      setLoading(prev => ({ ...prev, businesses: false }));
    }
  };

  const getBusinessProducts = async (businessId: string): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', businessId)
        .eq('is_public', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching business products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business products:', error);
      return [];
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    fetchProducts();
    fetchDailyProducts();
    fetchBusinesses();
  }, [isVisible]);

  return {
    products,
    dailyProducts,
    businesses,
    loading,
    fetchProducts,
    fetchDailyProducts,
    fetchBusinesses,
    getBusinessProducts,
  };
}
