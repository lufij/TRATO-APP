import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useBuyerData } from '../../hooks/useBuyerData';
import { useImageModalContext } from '../../contexts/ImageModalContext';
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
  Mail,
  Eye,
  RefreshCw  // 🆕 Agregar icono de refresco
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getProductImageUrl } from '../../utils/imageUtils';
import { FloatingCart } from '../ui/FloatingCart';

interface BusinessProfileProps {
  businessId: string;
  onBack: () => void;
  onShowCart?: () => void;
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

export function BusinessProfile({ businessId, onBack, onShowCart }: BusinessProfileProps) {
  const { user } = useAuth();
  const { addToCart, items: cartItems } = useCart();
  const { 
    getBusinessProducts, 
    getBusinessDailyProducts, 
    getBusinessById,
    refreshProductStock  // 🆕 Agregar función de refresco de stock
  } = useBuyerData();
  const { openImageModal } = useImageModalContext();
  
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [dailyProducts, setDailyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('productos');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // 🆕 Estado de refresco
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date()); // 🆕 Última actualización

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Cargando datos del negocio:', businessId);
      
      const [businessData, productsData, dailyData] = await Promise.all([
        getBusinessById(businessId),
        getBusinessProducts(businessId),
        getBusinessDailyProducts(businessId)
      ]);
      
      console.log('📊 Datos cargados:', {
        business: businessData,
        products: productsData,
        dailyProducts: dailyData,
        productsWithImages: productsData?.filter(p => p.image_url).length || 0,
        productsTotal: productsData?.length || 0,
        dailyWithImages: dailyData?.filter(p => p.image_url).length || 0,
        dailyTotal: dailyData?.length || 0
      });
      
      setBusiness(businessData);
      setProducts(productsData || []);
      setDailyProducts(dailyData || []);
      setLastUpdated(new Date()); // 🆕 Actualizar timestamp
    } catch (error) {
      console.error('❌ Error loading business data:', error);
      toast.error('Error al cargar información del comercio');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 NUEVA: Función para refrescar solo productos
  const handleRefreshProducts = async () => {
    setIsRefreshing(true);
    try {
      await refreshProductStock();
      // Recargar productos específicos del negocio
      const [productsData, dailyData] = await Promise.all([
        getBusinessProducts(businessId),
        getBusinessDailyProducts(businessId)
      ]);
      setProducts(productsData || []);
      setDailyProducts(dailyData || []);
      setLastUpdated(new Date());
      toast.success('Productos actualizados correctamente');
    } catch (error) {
      toast.error('Error al actualizar productos');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddToCart = async (productId: string, productName: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para agregar productos');
      return;
    }
    
    if (addingToCart === productId) return;
    
    setAddingToCart(productId);
    
    try {
      const result = await addToCart(productId, 1, 'regular');
      
      if (result.success) {
        toast.success(`Agregado al carrito`);
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
    const quantity = item?.quantity || 0;
    
    // Debug para ver el estado del carrito
    console.log('🛒 Cart check:', {
      productId,
      cartItems: cartItems?.length || 0,
      foundItem: !!item,
      quantity
    });
    
    return quantity;
  };

  // URLs de imágenes
  const businessLogoImage = business?.logo_url || business?.user?.avatar_url;
  const businessCoverImage = business?.cover_image_url;

  const ProductCard = ({ product }: { product: any }) => {
    const imageUrl = getProductImageUrl(product);
    const cartQuantity = getCartItemQuantity(product.id);
    const isAdding = addingToCart === product.id;

    // Información mejorada de disponibilidad y stock
    const availabilityInfo = {
      isAvailable: product.is_available && product.stock_quantity > 0,
      hasStock: product.stock_quantity > 0,
      isLowStock: product.stock_quantity <= 5 && product.stock_quantity > 0,
      isLastUnits: product.stock_quantity <= 3 && product.stock_quantity > 0,
      stockCount: product.stock_quantity || 0,
      isDisabledByVendor: product.is_available === false,
      isOutOfStock: product.stock_quantity === 0
    };

    // Debug de disponibilidad
    console.log('🛍️ ProductCard Availability:', {
      productName: product.name,
      productId: product.id,
      is_available: product.is_available,
      stock_quantity: product.stock_quantity,
      availabilityInfo,
      cartQuantity,
      isAdding
    });

    const handleImageClick = () => {
      if (imageUrl) {
        openImageModal(imageUrl, product.name);
      }
    };

    // Función para obtener el texto del badge de stock
    const getStockBadge = () => {
      if (availabilityInfo.isOutOfStock) {
        return { text: "Agotado", className: "bg-red-100 text-red-700", icon: "❌" };
      }
      if (availabilityInfo.isDisabledByVendor) {
        return { text: "No disponible", className: "bg-gray-100 text-gray-600", icon: "⏸️" };
      }
      if (availabilityInfo.isLastUnits) {
        return { 
          text: `¡Últimas ${availabilityInfo.stockCount}!`, 
          className: "bg-red-100 text-red-700 animate-pulse", 
          icon: "🔥" 
        };
      }
      if (availabilityInfo.isLowStock) {
        return { 
          text: `${availabilityInfo.stockCount} disponibles`, 
          className: "bg-orange-100 text-orange-700", 
          icon: "⚠️" 
        };
      }
      if (availabilityInfo.hasStock) {
        return { 
          text: `${availabilityInfo.stockCount} disponibles`, 
          className: "bg-green-100 text-green-700", 
          icon: "✅" 
        };
      }
      return { text: "Sin stock", className: "bg-gray-100 text-gray-600", icon: "❌" };
    };

    const stockBadge = getStockBadge();

    return (
      <Card className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all min-h-[100px]">
        <CardContent className="p-0 h-full" style={{ pointerEvents: 'auto' }}>
          <div className="flex h-full relative"
               onClick={(e) => console.log('Card clicked', e.target)}
               style={{ pointerEvents: 'auto' }}
          >
            {/* Image */}
            <div 
              className="relative w-20 h-20 bg-gray-100 flex-shrink-0 cursor-pointer"
              onClick={(e) => {
                console.log('🖼️ Image area clicked');
                e.stopPropagation();
                if (imageUrl) {
                  openImageModal(imageUrl, product.name);
                }
              }}
              style={{ pointerEvents: 'auto' }}
            >
              {imageUrl ? (
                <ImageWithFallback
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                  <div className="text-center">
                    <Package className="w-5 h-5 text-orange-300 mx-auto mb-1" />
                    <span className="text-xs text-orange-400 font-medium">Sin imagen</span>
                  </div>
                </div>
              )}
              
              {/* Status badges mejorados */}
              <div className="absolute top-1 left-1 space-y-1">
                {availabilityInfo.isOutOfStock && (
                  <Badge className="bg-red-500 text-white text-xs px-2 py-1 shadow-lg">
                    Agotado
                  </Badge>
                )}
                {availabilityInfo.isDisabledByVendor && (
                  <Badge className="bg-gray-500 text-white text-xs px-2 py-1 shadow-lg">
                    No disponible
                  </Badge>
                )}
                {availabilityInfo.isLastUnits && (
                  <Badge className="bg-red-500 text-white text-xs px-2 py-1 shadow-lg animate-pulse">
                    🔥 ¡Últimas {availabilityInfo.stockCount}!
                  </Badge>
                )}
              </div>

              {/* Click to expand indicator */}
              {imageUrl && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 hover:opacity-100 transition-opacity bg-black/70 rounded-lg px-2 py-1">
                    <div className="flex items-center gap-1 text-white text-xs font-medium">
                      <Eye className="w-3 h-3" />
                      <span>Ver</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-3 pl-4 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-4 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 break-words">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-3 mb-2 break-words">
                      {product.description}
                    </p>
                  )}
                </div>
                
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-base font-bold text-gray-900 whitespace-nowrap">
                    Q{product.price?.toFixed(2)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <div className="text-xs text-gray-400 line-through whitespace-nowrap">
                      Q{product.compare_at_price.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  {/* Badge de estado del carrito */}
                  {cartQuantity > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 text-xs font-semibold w-fit">
                      {cartQuantity} en carrito
                    </Badge>
                  )}
                  
                  {/* Badge de stock mejorado */}
                  <Badge className={`text-xs font-medium w-fit ${stockBadge.className}`}>
                    <span className="mr-1">{stockBadge.icon}</span>
                    {stockBadge.text}
                  </Badge>
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={() => {
                      if (availabilityInfo.isAvailable) {
                        handleAddToCart(product.id, product.name);
                      }
                    }}
                    disabled={!availabilityInfo.isAvailable || isAdding}
                    className={`
                      h-8 px-3 text-xs font-medium rounded transition-all duration-200
                      ${availabilityInfo.isAvailable && !isAdding
                        ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white cursor-pointer shadow-md hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }
                    `}
                    type="button"
                  >
                    {isAdding ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : cartQuantity > 0 && availabilityInfo.isAvailable ? (
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        +1
                      </span>
                    ) : availabilityInfo.isAvailable ? (
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        Agregar
                      </span>
                    ) : availabilityInfo.isOutOfStock ? (
                      'Agotado'
                    ) : availabilityInfo.isDisabledByVendor ? (
                      'No disponible'
                    ) : (
                      'Sin stock'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DailyProductCard = ({ product }: { product: any }) => {
    const imageUrl = getProductImageUrl(product);
    const cartQuantity = getCartItemQuantity(product.id);
    const isAdding = addingToCart === product.id;

    // Debug de imagen
    console.log('📅 DailyProductCard:', {
      productName: product.name,
      productImageUrl: product.image_url,
      processedImageUrl: imageUrl,
      hasImage: !!imageUrl
    });

    const handleImageClick = () => {
      if (imageUrl) {
        openImageModal(imageUrl, product.name);
      }
    };

    return (
      <Card className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Image */}
            <div 
              className="relative w-20 h-20 bg-gray-100 flex-shrink-0 cursor-pointer"
              onClick={handleImageClick}
            >
              {imageUrl ? (
                <ImageWithFallback
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="w-4 h-4 text-orange-300 mx-auto mb-1" />
                    <span className="text-xs text-orange-400 font-medium">Sin imagen</span>
                  </div>
                </div>
              )}

              {/* Click to expand indicator */}
              {imageUrl && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1">
                    <div className="flex items-center gap-1 text-white text-xs">
                      <Package className="w-3 h-3" />
                      <span>Ver</span>
                    </div>
                  </div>
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
                  <Badge className="bg-orange-100 text-orange-700 text-xs font-semibold">
                    {cartQuantity} en carrito
                  </Badge>
                ) : (
                  <div />
                )}

                <Button
                  size="sm"
                  onClick={() => handleAddToCart(product.id, product.name)}
                  disabled={!product.is_available || isAdding}
                  className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium"
                >
                  {isAdding ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : cartQuantity > 0 ? (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      +1
                    </>
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
      {/* ========== HEADER CON NAVEGACIÓN ========== */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <Button
            onClick={onBack}
            size="sm"
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          
          <div className="flex gap-2">
            {/* Botón de refresco de productos */}
            <Button 
              onClick={handleRefreshProducts}
              disabled={isRefreshing}
              size="sm" 
              variant="ghost" 
              className="text-green-600 hover:text-green-900 hover:bg-green-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
              <Heart className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ========== BUSINESS INFO CARD (ARRIBA) ========== */}
      <div className="px-4 py-4 bg-white">
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
                <h1 className="text-xl font-bold text-gray-900 truncate">{business.business_name}</h1>
                <p className="text-xs text-gray-500 mt-1">
                  Actualizado: {lastUpdated.toLocaleTimeString()}
                </p>
                
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

        {/* Key Information Cards */}
        <div className="mt-4 pt-4 border-t border-gray-100">
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
      </div>

      {/* ========== IMAGEN DE PORTADA (OPCIONAL Y SEPARADA) ========== */}
      {businessCoverImage && (
        <div className="relative w-full h-40 mx-4 mb-4 rounded-xl overflow-hidden">
          <ImageWithFallback
            src={businessCoverImage}
            alt={`Portada de ${business.business_name}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div className="bg-gray-50">
        {/* ========== TABS NAVEGACIÓN ========== */}
        <div className="px-4 mb-4">
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
                <div className="px-3 py-4">
                  <TabsContent value="productos" className="mt-0">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
                        ))}
                      </div>
                    ) : products && products.length > 0 ? (
                      <div className="space-y-3">
                        {products.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">No hay productos disponibles</p>
                        <p className="text-xs text-gray-400">
                          {products && products.length > 0 
                            ? `Se encontraron ${products.length} productos pero no están disponibles` 
                            : 'No se pudieron cargar los productos'
                          }
                        </p>
                        {products && products.length > 0 && (
                          <button 
                            onClick={() => console.log('🔍 Productos encontrados:', products)}
                            className="mt-2 text-xs text-blue-500 hover:text-blue-700"
                          >
                            Ver detalles en consola
                          </button>
                        )}
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
                    ) : dailyProducts && dailyProducts.length > 0 ? (
                      <div className="space-y-3">
                        {dailyProducts.map((product) => (
                          <DailyProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">No hay productos del día</p>
                        <p className="text-xs text-gray-400">
                          {dailyProducts && dailyProducts.length > 0 
                            ? `Se encontraron ${dailyProducts.length} productos del día pero no están disponibles` 
                            : 'No se pudieron cargar los productos del día'
                          }
                        </p>
                        {dailyProducts && dailyProducts.length > 0 && (
                          <button 
                            onClick={() => console.log('🔍 Productos del día encontrados:', dailyProducts)}
                            className="mt-2 text-xs text-blue-500 hover:text-blue-700"
                          >
                            Ver detalles en consola
                          </button>
                        )}
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

      {/* Carrito flotante */}
      <FloatingCart onCartClick={() => {
        console.log('🛒 Carrito flotante clicked desde BusinessProfile!');
        if (onShowCart) {
          onShowCart();
        } else {
          alert('🛒 Carrito flotante funcional! Navegación no configurada.');
        }
      }} />
    </div>
  );
}
