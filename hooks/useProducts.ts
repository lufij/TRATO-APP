import { useState, useEffect } from 'react';
import { supabase, Product } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const ensureSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.refreshSession();
    }
    return session;
  };

  const retryOperation = async <T>(
    operation: () => Promise<T>,
    errorHandler?: (error: any) => boolean // Devuelve true si debe reintentar
  ): Promise<T> => {
    let lastError;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          console.log(`Reintento ${attempt + 1}/${MAX_RETRIES}...`);
        }

        // Asegurar sesión antes de cada intento
        await ensureSession();
        
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Si hay un manejador de errores personalizado
        if (errorHandler && !errorHandler(error)) {
          throw error; // No reintentar si el manejador devuelve false
        }
        
        // Reintentar por defecto en errores de red o autenticación
        const msg = error.message?.toLowerCase() || '';
        if (!msg.includes('network') && !msg.includes('jwt') && !msg.includes('auth')) {
          throw error;
        }
      }
    }
    throw lastError;
  };

  const fetchProducts = async (sellerId?: string) => {
    try {
      setLoading(true);

      // Verificar sesión primero
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.refreshSession();
      }

      // First attempt: include related seller info (may fail if relationship is not configured)
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:sellers(*)
        `)
        .eq('is_public', true);

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      // Intentar hasta 3 veces con delay entre intentos
      let data = null;
      let error = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Reintentando obtener productos...');
        }

        const result = await query.order('created_at', { ascending: false });
        error = result.error;
        data = result.data;

        if (error) {
          // Known cases: relationship not found, column not found, table not found
          const code = (error as any)?.code || '';
          const msg = (error as any)?.message?.toLowerCase?.() || '';
          const isRelIssue =
            code === 'PGRST200' || // relationship not found
            code === '42P01' || // relation does not exist
            code === '42703' || // column does not exist
            msg.includes('relationship') || msg.includes('column') || msg.includes('relation');

        if (isRelIssue) {
          console.warn('[products] Relationship select failed, falling back to plain select(*)');
          let fallback = supabase
            .from('products')
            .select('*')
            .eq('is_public', true);
          if (sellerId) fallback = fallback.eq('seller_id', sellerId);
          const r = await fallback.order('created_at', { ascending: false });
          data = r.data as Product[] | null;
          error = r.error as any;
        }
      }

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('No se pudieron cargar productos');
        setProducts([]);
        return;
      }

      setProducts((data as Product[] | null) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProducts = async () => {
    if (!user || user.role !== 'vendedor') return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching my products:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData: {
    name: string;
    description?: string;
    price: number;
    category: string;
    stock_quantity: number;
    image?: File;
  }) => {
    if (!user || user.role !== 'vendedor') {
      throw new Error('Only sellers can create products');
    }

    try {
      let image_url = '';

      // Upload image if provided
      if (productData.image) {
        const fileExt = productData.image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, productData.image);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);

        image_url = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
          seller_id: user.id,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          stock_quantity: productData.stock_quantity,
          image_url,
          is_public: true,
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      await fetchMyProducts();
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    if (!user || user.role !== 'vendedor') {
      throw new Error('Only sellers can update products');
    }

    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .eq('seller_id', user.id);

      if (error) {
        throw error;
      }

      await fetchMyProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!user || user.role !== 'vendedor') {
      throw new Error('Only sellers can delete products');
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', user.id);

      if (error) {
        throw error;
      }

      await fetchMyProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const searchProducts = async (query: string, category?: string) => {
    try {
      setLoading(true);
      // Attempt with relationship first
      let supabaseQuery = supabase
        .from('products')
        .select(`
          *,
          seller:sellers(*)
        `)
        .eq('is_public', true);

      if (query) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }

      let { data, error } = await supabaseQuery.order('created_at', { ascending: false });

      if (error) {
        const code = (error as any)?.code || '';
        const msg = (error as any)?.message?.toLowerCase?.() || '';
        const isRelIssue =
          code === 'PGRST200' ||
          code === '42P01' ||
          code === '42703' ||
          msg.includes('relationship') || msg.includes('column') || msg.includes('relation');
        if (isRelIssue) {
          console.warn('[products] search: relationship select failed, using plain select');
          let fb = supabase.from('products').select('*').eq('is_public', true);
          if (query) fb = fb.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
          if (category) fb = fb.eq('category', category);
          const r = await fb.order('created_at', { ascending: false });
          data = r.data as Product[] | null;
          error = r.error as any;
        }
      }

      if (error) {
        console.error('Error searching products:', error);
        toast.error('No se pudo completar la búsqueda de productos');
        setProducts([]);
        return;
      }

      setProducts((data as Product[] | null) || []);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    fetchProducts,
    fetchMyProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
  };
}