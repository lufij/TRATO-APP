import React, { useState } from 'react';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

const initialState = {
  name: '',
  description: '',
  price: '', // Campo vacío para mejor UX móvil
  image_url: '',
  stock_quantity: '', // Campo vacío para mejor UX móvil
};

interface Props {
  onProductCreated?: () => void;
}

export default function SellerDailyProductForm({ onProductCreated }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // CORREGIDO: Medianoche local para Guatemala (UTC-6)
      const now = new Date();
      const expires_at = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );
      
      // Si ya es muy tarde (después de las 22:00), configurar para mañana
      if (now.getHours() >= 22) {
        expires_at.setDate(expires_at.getDate() + 1);
      }
      
      if (!user?.id) throw new Error('Usuario no autenticado');
      const { error } = await supabase.from('daily_products').insert({
        seller_id: user.id,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        image_url: form.image_url,
        stock_quantity: Number(form.stock_quantity) || 0,
        expires_at: expires_at.toISOString(),
        is_available: true,
      });
      if (error) throw error;
      setForm(initialState);
      if (onProductCreated) onProductCreated();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="name" value={form.name} onChange={handleChange} placeholder="Nombre del producto" required />
      <Input name="description" value={form.description} onChange={handleChange} placeholder="Descripción" required />
      <Input name="price" value={form.price} onChange={handleChange} placeholder="0.00" type="number" step="0.01" min="0" required />
      <Input name="image_url" value={form.image_url} onChange={handleChange} placeholder="URL de imagen" required />
      <Input name="stock_quantity" value={form.stock_quantity} onChange={handleChange} placeholder="1" type="number" min="1" required />
      <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear producto del día'}</Button>
      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
}
