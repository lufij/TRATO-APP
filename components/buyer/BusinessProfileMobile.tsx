import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  ShoppingCart,
  Calendar,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  Info,
  Mail
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getProductImageUrl } from '../../utils/imageUtils';

interface BusinessProfileMobileProps {
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
  cover_image_url?: string;
  is_verified?: boolean;
  rating: number;
  products_count: number;
  user?: {
    avatar_url?: string;
  };
  address?: string;
  is_open_now?: boolean;
  email?: string;
  phone?: string;
  description?: string;
}

export function BusinessProfileMobile({ businessId, onBack }: BusinessProfileMobileProps) {
  const { user } = useAuth();
  const { addToCart, items: cartItems } = useCart();
  const { getBusinessProducts, getBusinessDailyProducts, getBusinessById } = useBuyerData();
  
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [dailyProducts, setDailyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('productos');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      
      const [businessData, productsData, dailyData] = await Promise.all([
        getBusinessById(businessId),
        getBusinessProducts(businessId),
        getBusinessDailyProducts(businessId)
      ]);
      
      setBusiness(businessData);
      setProducts(productsData);
      setDailyProducts(dailyData);
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
    const item = cartItems?.find((item: any) => item.product_id === productId);
    return item?.quantity || 0;
  };

  // URLs de imágenes
  const businessLogoImage = business?.logo_url || business?.user?.avatar_url;
  const businessCoverImage = business?.cover_image_url;

  const ProductCard = ({ product }: { product: any }) => {
    const imageUrl = getProductImageUrl(product.image_url);
    const cartQuantity = getCartItemQuantity(product.id);
    const isAdding = addingToCart === product.id;

    return (
      <Card className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all">
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative h-32 bg-gray-100">
            {imageUrl ? (
              <ImageWithFallback
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
            )}
            
            {/* Status badges */}
            <div className="absolute top-2 left-2">
              {!product.is_available && (
                <Badge className="bg-red-500 text-white text-xs">
                  Agotado
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
              {product.name}
            </h3>
            
            {product.description && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  Q{product.price?.toFixed(2)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-xs text-gray-400 line-through">
                    Q{product.compare_at_price.toFixed(2)}
                  </span>
                )}
              </div>

              {cartQuantity > 0 ? (
                <Badge className="bg-orange-100 text-orange-700 text-xs">
                  {cartQuantity} en carrito
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleAddToCart(product.id, product.name)}
                  disabled={!product.is_available || isAdding}
                  className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                >
                  {isAdding ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DailyProductCard = ({ product }: { product: any }) => {
    const imageUrl = getProductImageUrl(product.image_url);
    const cartQuantity = getCartItemQuantity(product.id);
    const isAdding = addingToCart === product.id;

    return (
      <Card className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Image */}
            <div className="relative w-20 h-20 bg-gray-100 flex-shrink-0">
              {imageUrl ? (
                <ImageWithFallback
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-gray-300" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
                
                <div className="text-right ml-2">
                  <span className="text-lg font-bold text-gray-900">
                    Q{product.price?.toFixed(2)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <div className="text-xs text-gray-400 line-through">
                      Q{product.compare_at_price.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                {!product.is_available ? (
                  <Badge className="bg-red-100 text-red-700 text-xs">
                    Agotado
                  </Badge>
                ) : cartQuantity > 0 ? (
                  <Badge className="bg-orange-100 text-orange-700 text-xs">
                    {cartQuantity} en carrito
                  </Badge>
                ) : (
                  <div />
                )}

                <Button
                  size="sm"
                  onClick={() => handleAddToCart(product.id, product.name)}
                  disabled={!product.is_available || isAdding}
                  className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                >
                  {isAdding ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil del comercio...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========== HERO IMAGE SECTION (ESPACIO FIJO) ========== */}
      <div className="relative w-full h-64 sm:h-72 md:h-80 lg:h-96 flex-shrink-0">
        {businessCoverImage ? (
          <ImageWithFallback
            src={businessCoverImage}
            alt={`Portada de ${business.business_name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 flex items-center justify-center">
            <Store className="w-16 h-16 text-white opacity-80" />
          </div>
        )}
        
        {/* Overlay gradiente solo en la parte inferior */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Header Controls - Solo en la parte superior */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
          <Button
            onClick={onBack}
            size="sm"
            className="bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          
          <div className="flex gap-2">
            <Button size="sm" className="bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40">
              <Heart className="w-4 h-4" />
            </Button>
            <Button size="sm" className="bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ========== CONTENIDO SEPARADO ========== */}
      <div className="bg-gray-50 min-h-screen">
        {/* ========== BUSINESS INFO CARD ========== */}
        <div className="px-4 pt-6 pb-4">
          <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Business Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  {/* Logo Avatar */}
                  {businessLogoImage && (
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 shadow-md p-1 flex-shrink-0">
                      <ImageWithFallback
                        src={businessLogoImage}
                        alt={`Logo de ${business.business_name}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                  )}
                  
                  {/* Business Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">{business.business_name}</h1>
                        
                        {/* Rating & Status Row */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-sm font-medium">{business.rating.toFixed(1)}</span>
                            <span className="text-xs text-gray-500 ml-1">({business.products_count} productos)</span>
                          </div>
                          
                          <Badge 
                            className={`text-xs px-2 py-1 ${
                              business.is_open_now 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : 'bg-red-100 text-red-700 border-red-200'
                            }`}
                            variant="outline"
                          >
                            {business.is_open_now ? '🟢 Abierto' : '🔴 Cerrado'}
                          </Badge>
                        </div>
                        
                        {/* Location & Time */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                            <span className="truncate">{business.address || business.business_address || 'Dirección no disponible'}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            <span>25-35 min</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Verification Badge */}
                      {business.is_verified && (
                        <div className="ml-3">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200" variant="outline">
                            <Verified className="w-3 h-3 mr-1" />
                            Verificado
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Information Cards */}
              <div className="border-t border-gray-100 p-6 pt-4">
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <ShoppingCart className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Pedido mínimo</p>
                    <p className="text-sm font-semibold text-gray-900">Q50</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Costo envío</p>
                    <p className="text-sm font-semibold text-gray-900">Q15</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Tiempo entrega</p>
                    <p className="text-sm font-semibold text-gray-900">25-35 min</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== TABS NAVEGACIÓN ========== */}
        <div className="px-4 mb-6">
          <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-50 p-1 m-2 rounded-xl">
                  <TabsTrigger 
                    value="productos" 
                    className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Productos ({products.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="dia" 
                    className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Del Día ({dailyProducts.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="info" 
                    className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Info
                  </TabsTrigger>
                </TabsList>

                {/* ========== TAB CONTENT ========== */}
                <div className="p-4">
                  <TabsContent value="productos" className="mt-0">
                    {loading ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="bg-gray-100 rounded-xl h-40 animate-pulse" />
                        ))}
                      </div>
                    ) : products.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {products.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay productos disponibles</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="dia" className="mt-0">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
                        ))}
                      </div>
                    ) : dailyProducts.length > 0 ? (
                      <div className="space-y-3">
                        {dailyProducts.map((product) => (
                          <DailyProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay productos del día</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="info" className="mt-0">
                    <div className="space-y-4">
                      {/* Horarios */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Clock className="w-5 h-5 mr-2 text-blue-600" />
                          Horarios de Atención
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Lunes - Viernes:</span>
                            <span className="font-medium">8:00 AM - 9:00 PM</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sábados:</span>
                            <span className="font-medium">8:00 AM - 10:00 PM</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Domingos:</span>
                            <span className="font-medium">9:00 AM - 8:00 PM</span>
                          </div>
                        </div>
                      </div>

                      {/* Contacto */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Phone className="w-5 h-5 mr-2 text-green-600" />
                          Contacto
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{business.phone || business.business_phone || 'No disponible'}</span>
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{business.email || 'No disponible'}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{business.address || business.business_address || 'Dirección no disponible'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Descripción */}
                      {(business.description || business.business_description) && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Info className="w-5 h-5 mr-2 text-purple-600" />
                            Acerca de
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {business.description || business.business_description}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
