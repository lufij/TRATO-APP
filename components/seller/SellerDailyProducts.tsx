import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import SellerDailyProductForm from './SellerDailyProductForm';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

export default function SellerDailyProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('daily_products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadProducts();
  }, [user]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear producto del día</CardTitle>
        </CardHeader>
        <CardContent>
          <SellerDailyProductForm onProductCreated={loadProducts} />
        </CardContent>
      </Card>
      <h2 className="text-xl font-semibold">Mis productos del día</h2>
      {loading && <div>Cargando...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product: any) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div>Descripción: {product.description}</div>
              <div>Precio: Q{product.price}</div>
              <div>Categoría: {product.category}</div>
              <div>Stock: {product.stock_quantity}</div>
              <div>Expira: {new Date(product.expires_at).toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
