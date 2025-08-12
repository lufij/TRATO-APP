import { useState, useEffect } from 'react';
import { supabase, Product, Seller } from '../utils/supabase/client';
import { getBusinessImageUrl } from '../utils/imageUtils';

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
  logo_url?: string;
  is_verified: boolean;
  products_count: number;
  rating: number;
  user: {
    name: string;
    phone?: string;
    avatar_url?: string;
  };
  // Campos adicionales para compatibilidad con BusinessProfile
  cover_image?: string;
  category?: string;
  address?: string;
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

  // Fetch regular products
  const fetchProducts = async (filters?: {
    category?: string;
    search?: string;
    limit?: number;
  }) => {
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

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  // Fetch daily products (productos del día)
  const fetchDailyProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, dailyProducts: true }));
      
      // First check if daily_products table exists
      const { error: tableCheckError } = await supabase
        .from('daily_products')
        .select('count', { count: 'exact', head: true });

      if (tableCheckError?.code === 'PGRST205') {
        // Table doesn't exist yet
        console.log('daily_products table does not exist yet');
        setDailyProducts([]);
        return;
      }

      const today = new Date();
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
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
        .gt('stock_quantity', 0)
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching daily products:', error);
        return;
      }

      setDailyProducts(data || []);
    } catch (error) {
      console.error('Error fetching daily products:', error);
    } finally {
      setLoading(prev => ({ ...prev, dailyProducts: false }));
    }
  };

  // Fetch businesses/sellers directory with all image fields
  const fetchBusinesses = async () => {
    try {
      setLoading(prev => ({ ...prev, businesses: true }));
      
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
          user:users(name, phone, avatar_url)
        `)
        .not('business_name', 'is', null)
        .order('is_verified', { ascending: false });

      if (error) {
        console.error('Error fetching businesses:', error);
        return;
      }

      console.log('Raw businesses data from Supabase:', data);
      
      // Log individual logo URLs to debug
      data?.forEach((business, index) => {
        console.log(`Business ${index + 1} (${business.business_name}):`, {
          logo_url: business.logo_url,
          user_avatar: business.user?.avatar_url,
          has_logo: !!business.logo_url,
          has_avatar: !!business.user?.avatar_url
        });
      });

      // Get product counts for each business
      const businessesWithStats = await Promise.all(
        (data || []).map(async (business) => {
          // Count products for this seller
          const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', business.id)
            .eq('is_public', true);

          if (countError) {
            console.error('Error counting products for business:', countError);
          }

          // Generar la URL completa de la imagen del negocio
          const businessImageUrl = getBusinessImageUrl(business);
          
          return {
            id: business.id,
            business_name: business.business_name,
            business_description: business.business_description,
            business_address: business.business_address,
            business_phone: business.business_phone,
            logo_url: businessImageUrl, // Usar la URL completa procesada
            is_verified: business.is_verified,
            products_count: count || 0,
            rating: 4.2 + Math.random() * 0.8, // Mock rating between 4.2 and 5.0
            user: business.user,
            // Campos adicionales para compatibilidad
            cover_image: businessImageUrl, // Usar la misma URL procesada
            category: 'General', // Valor por defecto
            address: business.business_address || 'Gualán, Zacapa',
            phone_number: business.business_phone || business.user?.phone,
            is_open_now: true // Valor por defecto
          };
        })
      );

      setBusinesses(businessesWithStats);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(prev => ({ ...prev, businesses: false }));
    }
  };

  // Get products by business
  const getBusinessProducts = async (businessId: string): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:sellers(
            id,
            business_name,
            logo_url,
            is_verified
          )
        `)
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

  // Get daily products by business
  const getBusinessDailyProducts = async (businessId: string): Promise<DailyProduct[]> => {
    try {
      // First check if daily_products table exists
      const { error: tableCheckError } = await supabase
        .from('daily_products')
        .select('count', { count: 'exact', head: true });

      if (tableCheckError?.code === 'PGRST205') {
        // Table doesn't exist yet
        console.log('daily_products table does not exist yet');
        return [];
      }

      const today = new Date();
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
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
        .eq('seller_id', businessId)
        .gt('stock_quantity', 0)
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching business daily products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business daily products:', error);
      return [];
    }
  };

  // Get business details by ID
  const getBusinessById = async (businessId: string): Promise<BusinessListing | null> => {
    try {
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
          rating_avg,
          user:users(name, phone, avatar_url)
        `)
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('Error fetching business:', error);
        return null;
      }

      // Count products for this business
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', businessId)
        .eq('is_public', true);

      // Generar la URL completa de la imagen del negocio
      const businessImageUrl = getBusinessImageUrl(data);
      
      return {
        id: data.id,
        business_name: data.business_name,
        business_description: data.business_description,
        business_address: data.business_address,
        business_phone: data.business_phone,
        logo_url: businessImageUrl, // Usar la URL completa procesada
        is_verified: data.is_verified,
        products_count: count || 0,
        rating: data.rating_avg || 4.2 + Math.random() * 0.8,
        user: data.user,
        // Campos adicionales para compatibilidad
        cover_image: businessImageUrl, // Usar la misma URL procesada
        category: 'General',
        address: data.business_address || 'Gualán, Zacapa',
        phone_number: data.business_phone || data.user?.phone,
        is_open_now: true
      };
    } catch (error) {
      console.error('Error fetching business by ID:', error);
      return null;
    }
  };

  // Search across all data
  const searchAll = async (query: string) => {
    await Promise.all([
      fetchProducts({ search: query }),
      // Daily products don't need search as they're time-limited
    ]);
  };

  // Get featured products (could be based on sales, ratings, etc.)
  const getFeaturedProducts = async (limit = 8) => {
    try {
      const { data, error } = await supabase
        .from('products')
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
        .eq('is_public', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching featured products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  };

  // Get time remaining for daily products
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expirado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`;
    } else {
      return `${minutes}m restantes`;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchProducts();
    fetchDailyProducts();
    fetchBusinesses();

    // Set up interval to refresh daily products every 5 minutes
    const interval = setInterval(() => {
      fetchDailyProducts();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Data
    products,
    dailyProducts,
    businesses,
    loading,

    // Functions
    fetchProducts,
    fetchDailyProducts,
    fetchBusinesses,
    getBusinessProducts,
    getBusinessDailyProducts,
    getBusinessById,
    searchAll,
    getFeaturedProducts,
    getTimeRemaining,
  };
}