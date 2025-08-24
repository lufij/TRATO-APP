import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Edit, 
  Save, 
  Bell, 
  Shield, 
  Star,
  Calendar,
  Award,
  Settings,
  Camera,
  Heart,
  ShoppingBag,
  CreditCard,
  Lock,
  Upload
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LocationManager } from './LocationManager';
import { LocationManagerTest } from '../location/LocationManagerTest';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  date_of_birth?: string;
  preferred_delivery_address?: string;
  notification_preferences: {
    order_updates: boolean;
    promotions: boolean;
    new_products: boolean;
  };
}

export function BuyerProfile() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    completed_orders: 0,
    total_spent: 0,
    average_rating: 0
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadOrderStats();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        notification_preferences: data.notification_preferences || {
          order_updates: true,
          promotions: true,
          new_products: false
        }
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // 🎯 FUNCIÓN PARA REDIMENSIONAR IMAGEN
  const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.9): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve as BlobCallback, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // 🚀 FUNCIÓN PARA SUBIR AVATAR
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);
      setError('');
      setSuccess('');

      console.log('🚀 SUBIENDO AVATAR:', file.name);

      // Validación básica
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes');
        return;
      }

      // Redimensionar a 400x400 para avatars
      const resizedBlob = await resizeImage(file, 400, 400, 0.9);
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

      console.log('📤 Subiendo a user-avatars...');

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, resizedBlob, { upsert: true });

      if (uploadError) {
        console.error('❌ Error upload:', uploadError);
        setError(`Error subiendo: ${uploadError.message}`);
        return;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      console.log('🔗 URL generada:', urlData.publicUrl);

      // Actualizar en base de datos
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error BD:', updateError);
        setError(`Error guardando: ${updateError.message}`);
        return;
      }

      console.log('✅ AVATAR GUARDADO EXITOSAMENTE');
      
      // Actualizar estado local
      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      setSuccess('✅ Foto de perfil actualizada correctamente');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('💥 ERROR COMPLETO:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const loadOrderStats = async () => {
    if (!user) return;

    try {
      // Intento 1: esquemas con total_amount
      let orders: any[] | null = null;
      let error: any = null;
      {
        const res = await supabase
          .from('orders')
          .select('total_amount, status, seller_rating')
          .eq('buyer_id', user.id);
        orders = res.data as any[] | null;
        error = res.error;
      }

      // Si falla por columna inexistente, reintenta con total
      if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message))) {
        const res2 = await supabase
          .from('orders')
          .select('total, status, seller_rating')
          .eq('buyer_id', user.id);
        orders = res2.data as any[] | null;
        error = res2.error;
      }

      if (error) throw error;

      const stats = orders?.reduce((acc, order) => {
        acc.total_orders++;
        if (order.status === 'completed') {
          acc.completed_orders++;
          const amount = (order.total_amount ?? order.total ?? 0) as number;
          acc.total_spent += Number(amount) || 0;
        }
        if (order.seller_rating) {
          acc.ratings.push(order.seller_rating);
        }
        return acc;
      }, {
        total_orders: 0,
        completed_orders: 0,
        total_spent: 0,
        ratings: [] as number[]
      }) || { total_orders: 0, completed_orders: 0, total_spent: 0, ratings: [] };

      const average_rating = stats.ratings.length > 0 
        ? stats.ratings.reduce((a: number, b: number) => a + b, 0) / stats.ratings.length 
        : 0;

      setOrderStats({
        total_orders: stats.total_orders,
        completed_orders: stats.completed_orders,
        total_spent: stats.total_spent,
        average_rating
      });
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Actualiza solo columnas que existen en el esquema base
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Update auth context
      await updateProfile({
        name: profile.name,
        phone: profile.phone,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPreference = (key: string, value: boolean) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      notification_preferences: {
        ...profile.notification_preferences,
        [key]: value
      }
    });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mostrar mensajes de éxito/error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Profile Header */}
      <Card className="border-orange-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={profile.avatar_url} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gradient-to-r from-orange-500 to-green-500 text-white">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Input oculto para subir archivo */}
              <input 
                ref={avatarInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload} 
              />
              
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute -bottom-2 -right-2 h-8 w-8 p-0 rounded-full bg-white shadow-lg hover:bg-orange-50 transition-colors"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                ) : (
                  <Camera className="w-4 h-4 text-orange-600" />
                )}
              </Button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? 'Cancelar' : 'Editar perfil'}
                </Button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
                <Badge variant="outline" className="border-green-200 text-green-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Comprador verificado
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{orderStats.total_orders}</div>
                  <div className="text-xs text-gray-500">Pedidos realizados</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">Q{orderStats.total_spent.toFixed(0)}</div>
                  <div className="text-xs text-gray-500">Total gastado</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                    {orderStats.average_rating.toFixed(1)}
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <div className="text-xs text-gray-500">Calificación promedio</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El correo no se puede cambiar
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Tu número de teléfono"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={profile.date_of_birth || ''}
                  onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>

            {isEditing && (
              <Button 
                onClick={handleSaveProfile}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Address Management */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Mi Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Botón GPS */}
              <button 
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        alert(`📍 Ubicación obtenida: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
                      },
                      (error) => {
                        alert('Error al obtener ubicación. Verifica que el GPS esté activado.');
                      }
                    );
                  } else {
                    alert('GPS no disponible en este dispositivo');
                  }
                }}
              >
                <MapPin className="w-5 h-5" />
                📍 Confirmar Ubicación GPS
              </button>

              {/* Espacio para dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu Dirección de Entrega
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Escribe tu dirección completa aquí..."
                />
              </div>

              {/* Botón guardar */}
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700">
                Guardar Ubicación
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Preferences */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-500" />
            Preferencias de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="order_updates" className="text-base">Actualizaciones de pedidos</Label>
                <p className="text-sm text-gray-500">
                  Recibe notificaciones sobre el estado de tus pedidos
                </p>
              </div>
              <Switch
                id="order_updates"
                checked={profile.notification_preferences.order_updates}
                onCheckedChange={(checked: boolean) => updateNotificationPreference('order_updates', checked)}
                disabled={!isEditing}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="promotions" className="text-base">Promociones y ofertas</Label>
                <p className="text-sm text-gray-500">
                  Recibe ofertas especiales y promociones
                </p>
              </div>
              <Switch
                id="promotions"
                checked={profile.notification_preferences.promotions}
                onCheckedChange={(checked: boolean) => updateNotificationPreference('promotions', checked)}
                disabled={!isEditing}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new_products" className="text-base">Nuevos productos</Label>
                <p className="text-sm text-gray-500">
                  Notificaciones cuando hay nuevos productos disponibles
                </p>
              </div>
              <Switch
                id="new_products"
                checked={profile.notification_preferences.new_products}
                onCheckedChange={(checked: boolean) => updateNotificationPreference('new_products', checked)}
                disabled={!isEditing}
              />
            </div>
          </div>

          {isEditing && (
            <Button 
              onClick={handleSaveProfile}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar preferencias
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm">Productos favoritos</span>
            </Button>

            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              <span className="text-sm">Historial de compras</span>
            </Button>

            <Button variant="outline" className="h-16 flex flex-col gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              <span className="text-sm">Métodos de pago</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Seguridad de la Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-red-800">Cambiar contraseña</h4>
              <p className="text-sm text-red-600">
                Actualiza tu contraseña regularmente para mayor seguridad
              </p>
            </div>
            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              Cambiar
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
            <div>
              <h4 className="font-medium text-yellow-800">Verificación en dos pasos</h4>
              <p className="text-sm text-yellow-600">
                Añade una capa extra de seguridad a tu cuenta
              </p>
            </div>
            <Button variant="outline" className="border-yellow-200 text-yellow-700 hover:bg-yellow-50">
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}