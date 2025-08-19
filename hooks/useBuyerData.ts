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
      
      // Try with relationships first; fallback to plain select(*) if the
      // relationship or columns are not configured/accessible under RLS.
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

      let { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        const code = (error as any)?.code || '';
        const msg = (error as any)?.message?.toLowerCase?.() || '';
        const isRelIssue =
          code === 'PGRST200' || // relationship not found
          code === '42P01' || // relation does not exist
          code === '42703' || // column does not exist
          msg.includes('relationship') || msg.includes('column') || msg.includes('relation');

        if (isRelIssue) {
          // Fallback: plain select(*)
          let fb = supabase
            .from('products')
            .select('*')
            .eq('is_public', true)
            .gt('stock_quantity', 0);
          if (filters?.search) {
            fb = fb.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
          }
          if (filters?.category && filters.category !== 'all') {
            fb = fb.eq('category', filters.category);
          }
          if (filters?.limit) {
            fb = fb.limit(filters.limit);
          }
          const r = await fb.order('created_at', { ascending: false });
          data = r.data as any[] | null;
          error = r.error as any;
        }
      }

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } else {
        setProducts((data as any[]) || []);
      }
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
        // Handle table-not-found gracefully (PGRST205)
        if ((error as any)?.code === 'PGRST205') {
          console.log('daily_products table does not exist yet');
          setDailyProducts([]);
          return;
        }
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
      
      // Try with user join first; fallback to plain select if relationship fails
      let { data, error } = await supabase
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
        const code = (error as any)?.code || '';
        const msg = (error as any)?.message?.toLowerCase?.() || '';
        const isRelIssue =
          code === 'PGRST200' || code === '42P01' || code === '42703' ||
          msg.includes('relationship') || msg.includes('column') || msg.includes('relation');
        if (isRelIssue) {
          const r = await supabase
            .from('sellers')
            .select('id,business_name,business_description,business_address,business_phone,logo_url,is_verified')
            .not('business_name', 'is', null)
            .order('is_verified', { ascending: false });
          data = r.data as any[] | null;
          error = r.error as any;
        }
      }

      if (error) {
        console.error('Error fetching businesses:', error);
        setBusinesses([]);
        return;
      }

      // Build product counts in ONE query instead of N per business
      type SellerRow = {
        id: string;
        business_name: string;
        business_description?: string | null;
        business_address?: string | null;
        business_phone?: string | null;
        logo_url?: string | null;
        is_verified: boolean;
        user?: { name: string; phone?: string; avatar_url?: string } | null;
      };

  const sellers = (data as unknown as SellerRow[]) || [];

      const sellerIds = sellers.map(b => b.id);
      let productsBySeller = new Map<string, number>();
      if (sellerIds.length > 0) {
        try {
          const { data: productRows, error: productsErr } = await supabase
            .from('products')
            .select('seller_id')
            .in('seller_id', sellerIds)
            .eq('is_public', true);

          if (productsErr) {
            console.error('Error fetching products for counts:', productsErr);
          } else {
            productsBySeller = (productRows as { seller_id: string }[] | null | undefined)?.reduce((acc: Map<string, number>, row: { seller_id: string }) => {
              acc.set(row.seller_id, (acc.get(row.seller_id) || 0) + 1);
              return acc;
            }, new Map<string, number>()) ?? new Map<string, number>();
          }
        } catch (err) {
          console.error('Error aggregating product counts:', err);
        }
      }

      // Compose final businesses list with counts and normalized images
      const businessesWithStats = sellers.map((business) => {
        const businessImageUrl = getBusinessImageUrl({
          logo_url: business.logo_url ?? undefined,
          user: business.user ? { avatar_url: business.user.avatar_url } : undefined,
        });
        const productCount = productsBySeller.get(business.id) || 0;
        return {
          id: business.id,
          business_name: business.business_name,
          business_description: business.business_description ?? undefined,
          business_address: business.business_address ?? undefined,
          business_phone: business.business_phone ?? undefined,
          logo_url: businessImageUrl ?? undefined,
          is_verified: business.is_verified,
          products_count: productCount,
          rating: 4.2 + Math.random() * 0.8, // Mock rating between 4.2 and 5.0
          user: {
            name: business.user?.name ?? 'Usuario',
            phone: business.user?.phone ?? undefined,
            avatar_url: business.user?.avatar_url ?? undefined,
          },
          // Campos adicionales para compatibilidad
          cover_image: businessImageUrl ?? undefined,
          category: 'General',
          address: (business.business_address ?? undefined) || 'Gualán, Zacapa',
          phone_number: (business.business_phone ?? undefined) || (business.user?.phone ?? undefined),
          is_open_now: true
        };
      });

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
      // Try with relationship, then fallback
      let q = supabase
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

      let { data, error } = await q;

      if (error) {
        const code = (error as any)?.code || '';
        const msg = (error as any)?.message?.toLowerCase?.() || '';
        const isRelIssue =
          code === 'PGRST200' || code === '42P01' || code === '42703' ||
          msg.includes('relationship') || msg.includes('column') || msg.includes('relation');
        if (isRelIssue) {
          const r = await supabase
            .from('products')
            .select('*')
            .eq('seller_id', businessId)
            .eq('is_public', true)
            .gt('stock_quantity', 0)
            .order('created_at', { ascending: false });
          data = r.data as any[] | null;
          error = r.error as any;
        }
      }

      if (error) {
        console.error('Error fetching business products:', error);
        return [];
      }

      return (data as any[]) || [];
    } catch (error) {
      console.error('Error fetching business products:', error);
      return [];
    }
  };

  // Get daily products by business
  const getBusinessDailyProducts = async (businessId: string): Promise<DailyProduct[]> => {
    try {
      const today = new Date();
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Try with nested joins first
      let { data, error } = await supabase
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
        const code = (error as any)?.code;
        if (code === 'PGRST205') {
          console.log('daily_products table does not exist yet');
          return [];
        }
        const msg = (error as any)?.message?.toLowerCase?.() || '';
        const isRelIssue =
          code === 'PGRST200' || code === '42P01' || code === '42703' ||
          msg.includes('relationship') || msg.includes('column') || msg.includes('relation');
        if (isRelIssue) {
          const r = await supabase
            .from('daily_products')
            .select('*')
            .eq('seller_id', businessId)
            .gt('stock_quantity', 0)
            .gte('expires_at', new Date().toISOString())
            .lte('expires_at', endOfDay.toISOString())
            .order('created_at', { ascending: false });
          data = r.data as any[] | null;
          error = r.error as any;
        }
      }

      if (error) {
        console.error('Error fetching business daily products:', error);
        return [];
      }

      return (data as any[]) || [];
    } catch (error) {
      console.error('Error fetching business daily products:', error);
      return [];
    }
  };

  // Get business details by ID
  const getBusinessById = async (businessId: string): Promise<BusinessListing | null> => {
    try {
      // Try with joined user; fallback if relationship fails
      let { data, error } = await supabase
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
        const code = (error as any)?.code || '';
        const msg = (error as any)?.message?.toLowerCase?.() || '';
        const isRelIssue =
          code === 'PGRST200' || code === '42P01' || code === '42703' ||
          msg.includes('relationship') || msg.includes('column') || msg.includes('relation');
        if (isRelIssue) {
          const r = await supabase
            .from('sellers')
            .select('id,business_name,business_description,business_address,business_phone,logo_url,is_verified,rating_avg')
            .eq('id', businessId)
            .single();
          data = r.data as any;
          error = r.error as any;
        }
      }

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
  const businessImageUrl = getBusinessImageUrl({
        logo_url: (data as any)?.logo_url ?? undefined,
        user: (data as any)?.user ? { avatar_url: (data as any).user.avatar_url } : undefined,
      });
      
      const row: any = data as any;
      return {
        id: row.id,
        business_name: row.business_name,
        business_description: row.business_description ?? undefined,
        business_address: row.business_address ?? undefined,
        business_phone: row.business_phone ?? undefined,
        logo_url: businessImageUrl ?? undefined, // Usar la URL completa procesada
        is_verified: row.is_verified,
        products_count: count || 0,
        rating: row.rating_avg || 4.2 + Math.random() * 0.8,
        user: {
          name: row.user?.name ?? 'Usuario',
          phone: row.user?.phone ?? undefined,
          avatar_url: row.user?.avatar_url ?? undefined,
        },
        // Campos adicionales para compatibilidad
        cover_image: businessImageUrl ?? undefined, // Usar la misma URL procesada
        category: 'General',
        address: (row.business_address ?? undefined) || 'Gualán, Zacapa',
        phone_number: (row.business_phone ?? undefined) || (row.user?.phone ?? undefined),
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