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
import { useCart } from '../../contexts/CartContext';
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
import { FloatingCart } from '../ui/FloatingCart';

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

interface BuyerProfileProps {
  onShowCart?: () => void;
}

export function BuyerProfile({ onShowCart }: BuyerProfileProps) {
  const { user, updateProfile } = useAuth();
  const { getCartItemCount } = useCart();
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

  // 🚀 FUNCIÓN MEJORADA PARA SUBIR AVATAR
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);
      setError('');
      setSuccess('');

      // Validaciones mejoradas
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setError('Solo se permiten imágenes JPG, PNG o WebP');
        return;
      }

      if (file.size > maxSize) {
        setError('La imagen debe ser menor a 5MB');
        return;
      }

      // Redimensionar imagen a 400x400 manteniendo proporción
      const resizedBlob = await resizeImage(file, 400, 400, 0.85);
      if (!resizedBlob) {
        setError('Error al procesar la imagen');
        return;
      }

      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, resizedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError(`Error subiendo imagen: ${uploadError.message}`);
        return;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      // Actualizar en base de datos
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        setError(`Error guardando en base de datos: ${updateError.message}`);
        return;
      }

      // Actualizar estado local y contexto
      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      await updateProfile({ avatar_url: urlData.publicUrl });
      
      setSuccess('✅ Foto de perfil actualizada correctamente');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setError(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploadingAvatar(false);
      // Reset input para permitir subir la misma imagen de nuevo
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const loadOrderStats = async () => {
    if (!user) return;

    try {
      // Cargar estadísticas de órdenes del usuario
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status, seller_rating, created_at, delivery_type')
        .eq('buyer_id', user.id);

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      if (!orders || orders.length === 0) {
        setOrderStats({
          total_orders: 0,
          completed_orders: 0,
          total_spent: 0,
          average_rating: 0
        });
        return;
      }

      // Calcular estadísticas reales
      const stats = orders.reduce((acc, order) => {
        acc.total_orders++;
        
        const orderTotal = Number(order.total) || 0;
        
        if (order.status === 'completed') {
          acc.completed_orders++;
          acc.total_spent += orderTotal;
        }
        
        if (order.seller_rating && order.seller_rating > 0) {
          acc.ratings.push(Number(order.seller_rating));
        }
        
        return acc;
      }, {
        total_orders: 0,
        completed_orders: 0,
        total_spent: 0,
        ratings: [] as number[]
      });

      // Calcular promedio de calificación
      const average_rating = stats.ratings.length > 0 
        ? stats.ratings.reduce((sum, rating) => sum + rating, 0) / stats.ratings.length 
        : 0;

      setOrderStats({
        total_orders: stats.total_orders,
        completed_orders: stats.completed_orders,
        total_spent: stats.total_spent,
        average_rating: Math.round(average_rating * 10) / 10 // Redondear a 1 decimal
      });

    } catch (error) {
      console.error('Error loading order stats:', error);
      // Establecer estadísticas por defecto en caso de error
      setOrderStats({
        total_orders: 0,
        completed_orders: 0,
        total_spent: 0,
        average_rating: 0
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setLoading(true);
    setError('');
    try {
      // Actualiza todos los campos del perfil incluyendo dirección
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          preferred_delivery_address: profile.preferred_delivery_address,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Update auth context
      await updateProfile({
        name: profile.name,
        phone: profile.phone,
      });

      setSuccess('✅ Perfil actualizado correctamente');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error al actualizar perfil: ' + (error as Error).message);
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Mostrar mensajes de éxito/error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="break-words">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="break-words">{success}</p>
        </div>
      )}

      {/* Profile Header */}
      <Card className="border-orange-200 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative flex-shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-lg">
                <AvatarImage src={profile.avatar_url} className="object-cover" />
                <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-r from-orange-500 to-green-500 text-white">
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
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-gray-600 mb-3 space-y-2 sm:space-y-0">
                <div className="flex items-center gap-1 break-all">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                <Badge variant="outline" className="border-green-200 text-green-700 w-fit">
                  <Shield className="w-3 h-3 mr-1" />
                  Comprador verificado
                </Badge>
              </div>

              {/* Stats mejoradas - Mobile Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">{orderStats.total_orders}</div>
                  <div className="text-xs text-gray-600">Pedidos totales</div>
                  {orderStats.completed_orders > 0 && (
                    <div className="text-xs text-green-600 mt-1">
                      {orderStats.completed_orders} completados
                    </div>
                  )}
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">Q{orderStats.total_spent.toFixed(0)}</div>
                  <div className="text-xs text-gray-600">Total gastado</div>
                  {orderStats.total_orders > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Promedio: Q{(orderStats.total_spent / orderStats.completed_orders || 0).toFixed(0)}
                    </div>
                  )}
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                    {orderStats.average_rating > 0 ? orderStats.average_rating.toFixed(1) : '0.0'}
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <div className="text-xs text-gray-600">Tu calificación</div>
                  {orderStats.average_rating === 0 && orderStats.total_orders > 0 && (
                    <div className="text-xs text-gray-500 mt-1">Sin calificar aún</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

            {/* Mensajes de feedback */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Management */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Gestión de Direcciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Dirección principal */}
              <div>
                <Label htmlFor="preferred_delivery_address">Dirección principal de entrega</Label>
                <Textarea
                  id="preferred_delivery_address"
                  className="mt-1"
                  rows={3}
                  placeholder="Ingresa tu dirección completa (calle, número, colonia, referencias)"
                  value={profile.preferred_delivery_address || ''}
                  onChange={(e) => setProfile({ ...profile, preferred_delivery_address: e.target.value })}
                  disabled={!isEditing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Incluye referencias importantes (edificio, color de casa, puntos de referencia)
                </p>
              </div>

              {/* Botón de GPS mejorado */}
              <Button 
                variant="outline" 
                className="w-full h-auto py-3"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setError('GPS no disponible en este dispositivo');
                    return;
                  }

                  setLoading(true);
                  setError('');
                  
                  if (!user) {
                    setError('Usuario no disponible');
                    setLoading(false);
                    return;
                  }
                  
                  navigator.geolocation.getCurrentPosition(
                    async (position) => {
                      try {
                        const { latitude, longitude } = position.coords;
                        
                        // Actualizar coordenadas en base de datos
                        const { error } = await supabase
                          .from('users')
                          .update({
                            latitude: latitude,
                            longitude: longitude,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', user.id);

                        if (error) throw error;

                        setSuccess(`✅ Ubicación GPS actualizada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                        setTimeout(() => setSuccess(''), 5000);
                      } catch (error) {
                        setError('Error al guardar ubicación GPS');
                      } finally {
                        setLoading(false);
                      }
                    },
                    (error) => {
                      setLoading(false);
                      switch (error.code) {
                        case error.PERMISSION_DENIED:
                          setError('Permiso de ubicación denegado. Activa el GPS en configuración.');
                          break;
                        case error.POSITION_UNAVAILABLE:
                          setError('Información de ubicación no disponible.');
                          break;
                        case error.TIMEOUT:
                          setError('Tiempo de espera agotado para obtener ubicación.');
                          break;
                        default:
                          setError('Error desconocido al obtener ubicación.');
                          break;
                      }
                    },
                    {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 60000
                    }
                  );
                }}
                disabled={loading}
              >
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-center leading-tight">
                    {loading ? 'Obteniendo ubicación...' : 'Actualizar ubicación GPS'}
                  </span>
                </div>
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500 break-words">
                  La ubicación GPS nos ayuda a mostrar vendedores cercanos y calcular costos de entrega
                </p>
              </div>
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Label htmlFor="order_updates" className="text-base">Actualizaciones de pedidos</Label>
                <p className="text-sm text-gray-500 break-words">
                  Recibe notificaciones sobre el estado de tus pedidos
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  id="order_updates"
                  checked={profile.notification_preferences.order_updates}
                  onCheckedChange={(checked: boolean) => updateNotificationPreference('order_updates', checked)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Label htmlFor="promotions" className="text-base">Promociones y ofertas</Label>
                <p className="text-sm text-gray-500 break-words">
                  Recibe ofertas especiales y promociones
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  id="promotions"
                  checked={profile.notification_preferences.promotions}
                  onCheckedChange={(checked: boolean) => updateNotificationPreference('promotions', checked)}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Label htmlFor="new_products" className="text-base">Nuevos productos</Label>
                <p className="text-sm text-gray-500 break-words">
                  Notificaciones cuando hay nuevos productos disponibles
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  id="new_products"
                  checked={profile.notification_preferences.new_products}
                  onCheckedChange={(checked: boolean) => updateNotificationPreference('new_products', checked)}
                  disabled={!isEditing}
                />
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 flex flex-col gap-2 text-center">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm leading-tight">Productos favoritos</span>
            </Button>

            <Button variant="outline" className="h-16 flex flex-col gap-2 text-center">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              <span className="text-sm leading-tight">Historial de compras</span>
            </Button>

            <Button variant="outline" className="h-16 flex flex-col gap-2 text-center">
              <CreditCard className="w-5 h-5 text-green-500" />
              <span className="text-sm leading-tight">Métodos de pago</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-yellow-500" />
            Seguridad de la Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <Shield className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-yellow-800">Cuenta protegida</h4>
                <p className="text-sm text-yellow-700 break-words">
                  Tu cuenta está protegida por autenticación segura de Supabase
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p className="break-words">
              Para cambios de seguridad como contraseña, contacta al soporte técnico
            </p>
          </div>
        </CardContent>
      </Card>
      {/* Floating Cart */}
      <FloatingCart 
        onCartClick={onShowCart || (() => {
          // Función por defecto si no se pasa onShowCart
          alert(`Tienes ${getCartItemCount()} productos en tu carrito. Funcionalidad de carrito implementada.`);
        })} 
      />
    </div>
  );
}