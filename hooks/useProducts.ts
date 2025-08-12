import { useState, useEffect } from 'react';
import { supabase, Product } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async (sellerId?: string) => {
    try {
      setLoading(true);
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

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
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

      const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
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