import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useBuyerData } from '../../hooks/useBuyerData';
import { Product } from '../../utils/supabase/client';
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  Phone, 
  Verified, 
  Store, 
  Plus,
  Minus,
  ShoppingCart,
  Calendar,
  Eye,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getProductImageUrl } from '../../utils/imageUtils';

interface BusinessProfileProps {
  businessId: string;
  onBack: () => void;
}

interface BusinessData {
  id: string;
  business_name: string;
  business_description?: string;
  business_address?: string;
  business_phone?: string;
  logo_url?: string;
  is_verified: boolean;
  rating: number;
  products_count: number;
  user: {
    name: string;
    phone?: string;
    avatar_url?: string;
  };
  cover_image?: string;
  category?: string;
  address?: string;
  phone_number?: string;
  is_open_now?: boolean;
}

export function BusinessProfile({ businessId, onBack }: BusinessProfileProps) {
  const { user } = useAuth();
  const { items: cartItems, addToCart } = useCart();
  const { getBusinessProducts, getBusinessById } = useBuyerData();
  
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyProducts, setDailyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      
      // Load business details
      const businessData = await getBusinessById(businessId);
      
      if (businessData) {
        setBusiness(businessData);
      } else {
        toast.error('No se pudo cargar la información del comercio');
        return;
      }

      // Load business products
      const businessProducts = await getBusinessProducts(businessId);
      setProducts(businessProducts || []);
      
      // For now, daily products will be empty (would need a separate function)
      setDailyProducts([]);
      
    } catch (error) {
      console.error('Error loading business data:', error);
      toast.error('Error al cargar información del comercio');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string, productName: string) => {
    if (!user || addingToCart === productId) return;
    
    setAddingToCart(productId);
    
    try {
      const result = await addToCart(productId, 1, 'regular');
      
      if (result.success) {
        toast.success(`${productName} agregado al carrito`, {
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 2000,
        });
      } else {
        toast.error(result.message, {
          icon: <AlertCircle className="w-4 h-4" />,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error al agregar al carrito', {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
      });
    } finally {
      setAddingToCart(null);
    }
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil del comercio...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se pudo cargar el comercio
          </h3>
          <Button onClick={onBack}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  // Usar la imagen real del negocio sin fallback genérico
  const businessImage = business.logo_url || business.user?.avatar_url;
  
  // Debug log para verificar qué imagen se está usando
  console.log('BusinessProfile image data:', {
    business_name: business.business_name,
    logo_url: business.logo_url,
    avatar_url: business.user?.avatar_url,
    final_image: businessImage
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header con imagen de portada */}
      <div className="relative">
        {businessImage ? (
          <ImageWithFallback
            src={businessImage}
            alt={business.business_name}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-r from-orange-400 to-green-400 flex items-center justify-center">
            <div className="text-center text-white">
              <Store className="w-16 h-16 mx-auto mb-2" />
              <h2 className="text-2xl font-bold">{business.business_name}</h2>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        {/* Botón de regreso */}
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        {/* Botones de acción */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur-sm hover:bg-white">
            <Heart className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur-sm hover:bg-white">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Información del negocio superpuesta */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{business.business_name}</h1>
                {business.is_verified && (
                  <Badge className="bg-blue-500 text-white">
                    <Verified className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-2">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                  <span>{business.rating.toFixed(1)}</span>
                  <span className="ml-1">({business.products_count} productos)</span>
                </div>
                <Badge 
                  className={`${business.is_open_now ? 'bg-green-500' : 'bg-red-500'} text-white`}
                >
                  {business.is_open_now ? 'Abierto' : 'Cerrado'}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {business.address}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  25-35 min
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Pedido mínimo</p>
            <p className="font-semibold">Q50</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Costo de envío</p>
            <p className="font-semibold">Q15</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Tiempo de entrega</p>
            <p className="font-semibold">25-35 min</p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="products">
              Productos ({products.length})
            </TabsTrigger>
            <TabsTrigger value="daily">
              Del Día ({dailyProducts.length})
            </TabsTrigger>
            <TabsTrigger value="info">
              Información
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay productos disponibles
                  </h3>
                  <p className="text-gray-500">
                    Este comercio no tiene productos en stock actualmente
                  </p>
                </div>
              ) : (
                products.map((product) => {
                  const cartQuantity = getCartItemQuantity(product.id);
                  
                  return (
                    <Card key={product.id} className="border-green-200 hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <ImageWithFallback
                          src={getProductImageUrl(product) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        {cartQuantity > 0 && (
                          <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                            En carrito: {cartQuantity}
                          </Badge>
                        )}
                        {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                          <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                            ¡Pocas unidades!
                          </Badge>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xl font-bold text-green-600">
                            Q{product.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Stock: {product.stock_quantity}
                          </span>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => handleAddToCart(product.id, product.name)}
                          disabled={!product.stock_quantity || addingToCart === product.id}
                        >
                          {addingToCart === product.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Agregando...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Agregar al carrito
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="daily">
            <div className="col-span-full text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay ofertas del día
              </h3>
              <p className="text-gray-500">
                Este comercio no tiene ofertas especiales hoy
              </p>
            </div>
          </TabsContent>

          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Comercio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-gray-900">Descripción</p>
                    <p className="text-gray-600">
                      {business.business_description || 'Comercio local con productos de calidad en Gualán'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-gray-900">Categoría</p>
                    <Badge variant="outline">{business.category}</Badge>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-gray-900">Dirección</p>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {business.address}
                    </div>
                  </div>
                  
                  {business.phone_number && (
                    <div>
                      <p className="font-semibold text-gray-900">Teléfono</p>
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {business.phone_number}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-gray-900">Propietario</p>
                    <p className="text-gray-600">{business.user.name}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horarios y Servicios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Estado actual</span>
                    <Badge 
                      className={`${business.is_open_now ? 'bg-green-500' : 'bg-red-500'} text-white`}
                    >
                      {business.is_open_now ? 'Abierto' : 'Cerrado'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">Información de entrega</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>• Pedido mínimo: Q50</p>
                      <p>• Costo de envío: Q15</p>
                      <p>• Tiempo estimado: 25-35 min</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">Estadísticas</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="font-semibold text-lg">{business.rating.toFixed(1)}</p>
                        <p className="text-gray-600">Calificación</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="font-semibold text-lg">{business.products_count}</p>
                        <p className="text-gray-600">Productos</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}