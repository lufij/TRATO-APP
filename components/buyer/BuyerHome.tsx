import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useBuyerData } from '../../hooks/useBuyerData';
import { Product } from '../../utils/supabase/client';
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Minus, 
  Star, 
  MapPin, 
  Filter,
  Clock,
  Store,
  Verified,
  Grid3X3,
  List,
  TrendingUp,
  Flame,
  ChevronRight,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getProductImageUrl } from '../../utils/imageUtils';
import { useImageModalContext } from '../../contexts/ImageModalContext';
import { FloatingCart } from '../ui/FloatingCart';

type ViewMode = 'grid' | 'list';

interface BuyerHomeProps {
  onBusinessClick: (businessId: string) => void;
  onShowCart?: () => void;
}

export function BuyerHome({ onBusinessClick, onShowCart }: BuyerHomeProps) {
  const { user } = useAuth();
  const { items: cartItems, addToCart, updateCartItem, removeFromCart } = useCart();
  const { 
    products, 
    dailyProducts, 
    businesses, 
    loading, 
    isPageVisible,
    fetchProducts, 
    getBusinessProducts,
    refreshAllData,
    refreshProductStock,  // 🆕 NUEVA función de refresco rápido
    getTimeRemaining 
  } = useBuyerData();
  
  const { openImageModal } = useImageModalContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [businessProducts, setBusinessProducts] = useState<Product[]>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // Estado de refresco
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date()); // 🆕 Última actualización
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');

  const categories = [
    'Comida',
    'Bebidas', 
    'Panadería',
    'Carnicería',
    'Frutas y Verduras',
    'Farmacia',
    'Electrónicos',
    'Ropa',
    'Hogar',
    'Otros'
  ];

  const handleSearch = async () => {
    const filters = {
      search: searchQuery,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
    };
    await fetchProducts(filters);
  };

  const handleAddToCart = async (productId: string, isDaily = false, productName = 'Producto') => {
    if (addingToCart === productId) return;
    
    setAddingToCart(productId);
    
    try {
      const result = await addToCart(productId, 1, isDaily ? 'daily' : 'regular');
      
      if (result.success) {
        toast.success(`${productName} agregado al carrito`, {
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 2000,
        });
      } else {
        if (result.message.includes('one seller')) {
          toast.error('Solo puedes tener productos de un vendedor en el carrito', {
            icon: <AlertCircle className="w-4 h-4" />,
            duration: 4000,
            description: 'Vacía tu carrito actual para agregar productos de otro vendedor'
          });
        } else if (result.message.includes('not exist')) {
          toast.error('Producto no disponible', {
            icon: <XCircle className="w-4 h-4" />,
            duration: 3000,
            description: 'Este producto ya no está disponible'
          });
        } else {
          toast.error(result.message, {
            icon: <AlertCircle className="w-4 h-4" />,
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error al agregar al carrito', {
        icon: <XCircle className="w-4 h-4" />,
        duration: 3000,
        description: 'Intenta nuevamente en unos momentos'
      });
    } finally {
      setAddingToCart(null);
    }
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item?.quantity || 0;
  };

  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    const cartItem = cartItems.find(item => item.product_id === productId);
    if (cartItem) {
      if (newQuantity === 0) {
        await removeFromCart(cartItem.id);
        toast.info('Producto eliminado del carrito');
      } else {
        await updateCartItem(cartItem.id, newQuantity);
      }
    }
  };

  const handleQuantityClick = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 999)) {
      setTempQuantity(value);
    }
  };

  const handleQuantitySubmit = async (productId: string) => {
    const quantity = parseInt(tempQuantity);
    if (!isNaN(quantity) && quantity >= 0) {
      await updateCartQuantity(productId, quantity);
    }
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const handleQuantityKeyDown = async (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      await handleQuantitySubmit(productId);
    } else if (e.key === 'Escape') {
      setEditingQuantity(null);
      setTempQuantity('');
    }
  };

  // 🆕 NUEVA: Función para refrescar stock manualmente
  const handleRefreshStock = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 INICIANDO REFRESCO MANUAL DE STOCK...');
      
      // 🔥 FORZAR LIMPIEZA COMPLETA DE CACHE
      await refreshProductStock();
      
      // 🔥 FORZAR RE-RENDER forzando cambio de estado
      setLastUpdated(new Date());
      
      console.log('✅ REFRESCO MANUAL COMPLETADO');
      toast.success('✅ Stock actualizado - Productos refrescados');
    } catch (error) {
      console.error('❌ ERROR EN REFRESCO MANUAL:', error);
      toast.error('❌ Error al actualizar stock - Intenta de nuevo');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 🔄 Actualizar timestamp cuando cambian los productos
  useEffect(() => {
    if (products.length > 0) {
      setLastUpdated(new Date());
    }
  }, [products]);

  // ❌ REMOVIDO: Auto-refresh que causaba bucle infinito
  // useEffect(() => {
  //   if (isPageVisible) {
  //     console.log('📱 Página visible - Refrescando stock automáticamente...');
  //     refreshProductStock().catch(console.error);
  //   }
  // }, [isPageVisible, refreshProductStock]);

  const handleBusinessClick = (businessId: string) => {
    onBusinessClick(businessId);
  };

  return (
    <div className="space-y-6">
      {/* Header with Manual Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Explorar Productos</h1>
          <p className="text-sm text-gray-500">
            Última actualización: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Refresco rápido de stock */}
          <Button
            onClick={handleRefreshStock}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="gap-2 border-green-300 text-green-600 hover:bg-green-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Stock
          </Button>
          {/* Refresco completo */}
          <Button
            onClick={refreshAllData}
            disabled={Object.values(loading).some(Boolean)}
            size="sm"
            variant="outline"
            className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className={`w-4 h-4 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
            Todo
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-orange-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Buscar productos, comercios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 text-base border-gray-200 focus:border-orange-300"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48 h-12 border-gray-200">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSearch} 
              disabled={loading.products}
              className="h-12 px-6 bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
            >
              <Filter className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Products Carousel */}
      {dailyProducts.length > 0 && (
        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                Productos del Día 🔥
              </CardTitle>
              <Badge variant="outline" className="border-orange-300 text-orange-600">
                {dailyProducts.length} disponibles
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-4 pb-4">
                {loading.dailyProducts ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-none w-72">
                      <Card className="animate-pulse">
                        <div className="h-40 bg-gray-200 rounded-t-lg"></div>
                        <CardContent className="p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                ) : (
                  dailyProducts.map((product) => {
                    const productImageUrl = getProductImageUrl(product);
                    
                    // 🆕 NUEVA: Información de disponibilidad y stock para productos del día
                    const dailyAvailabilityInfo = {
                      isAvailable: product.stock_quantity > 0,
                      hasStock: product.stock_quantity > 0,
                      isLowStock: product.stock_quantity <= 5 && product.stock_quantity > 0,
                      isLastUnits: product.stock_quantity <= 3 && product.stock_quantity > 0,
                      stockCount: product.stock_quantity || 0,
                      isOutOfStock: product.stock_quantity === 0
                    };

                    // 🆕 NUEVA: Función para obtener el badge de stock para productos del día
                    const getDailyStockBadge = () => {
                      if (dailyAvailabilityInfo.isOutOfStock) {
                        return { text: "Agotado", className: "bg-red-100 text-red-700", icon: "❌" };
                      }
                      if (dailyAvailabilityInfo.isLastUnits) {
                        return { 
                          text: `¡Últimas ${dailyAvailabilityInfo.stockCount}!`, 
                          className: "bg-red-100 text-red-700 animate-pulse", 
                          icon: "🔥" 
                        };
                      }
                      if (dailyAvailabilityInfo.isLowStock) {
                        return { 
                          text: `${dailyAvailabilityInfo.stockCount} disponibles`, 
                          className: "bg-orange-100 text-orange-700", 
                          icon: "⚠️" 
                        };
                      }
                      if (dailyAvailabilityInfo.hasStock) {
                        return { 
                          text: `${dailyAvailabilityInfo.stockCount} disponibles`, 
                          className: "bg-green-100 text-green-700", 
                          icon: "✅" 
                        };
                      }
                      return { text: "Sin stock", className: "bg-gray-100 text-gray-600", icon: "❌" };
                    };

                    const dailyStockBadge = getDailyStockBadge();
                    
                    return (
                      <div key={product.id} className="flex-none w-72">
                        <Card className="hover:shadow-xl transition-all duration-300 border-orange-200">
                          <div className="relative">
                            <ImageWithFallback
                              src={productImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=160&fit=crop'}
                              alt={product.name}
                              className="w-full h-40 object-cover rounded-t-lg"
                              expandable={true}
                              onExpand={openImageModal}
                            />
                            {/* Badges superiores - tiempo y tipo */}
                            <Badge className="absolute top-2 right-2 bg-red-500 text-white animate-pulse">
                              <Clock className="w-3 h-3 mr-1" />
                              {product.expires_at ? getTimeRemaining(product.expires_at) : 'Hoy'}
                            </Badge>
                            <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                              Hoy únicamente
                            </Badge>
                            
                            {/* 🆕 NUEVA: Badges de stock para productos del día */}
                            <div className="absolute bottom-2 right-2">
                              {dailyAvailabilityInfo.isOutOfStock && (
                                <Badge className="bg-red-500 text-white text-xs px-2 py-1 shadow-lg">
                                  Agotado
                                </Badge>
                              )}
                              {dailyAvailabilityInfo.isLastUnits && (
                                <Badge className="bg-red-500 text-white text-xs px-2 py-1 shadow-lg animate-pulse">
                                  🔥 ¡Últimas {dailyAvailabilityInfo.stockCount}!
                                </Badge>
                              )}
                              {dailyAvailabilityInfo.isLowStock && !dailyAvailabilityInfo.isLastUnits && (
                                <Badge className="bg-orange-500 text-white text-xs px-2 py-1 shadow-lg">
                                  ⚠️ Stock bajo
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-1 truncate">{product.name}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {product.description}
                            </p>
                            
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xl font-bold text-green-600">
                                Q{product.price.toFixed(2)}
                              </span>
                              <div className="text-xs text-gray-500">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {product.seller?.business_name}
                              </div>
                            </div>

                            {/* 🆕 NUEVA: Badge de stock detallado para productos del día */}
                            <div className="mb-3">
                              <Badge className={`text-xs font-medium ${dailyStockBadge.className}`}>
                                <span className="mr-1">{dailyStockBadge.icon}</span>
                                {dailyStockBadge.text}
                              </Badge>
                            </div>

                            {getCartItemQuantity(product.id) === 0 ? (
                              <Button 
                                onClick={() => handleAddToCart(product.id, true, product.name)}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                disabled={!dailyAvailabilityInfo.isAvailable || addingToCart === product.id}
                              >
                                {addingToCart === product.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Agregando...
                                  </>
                                ) : dailyAvailabilityInfo.isAvailable ? (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar
                                  </>
                                ) : dailyAvailabilityInfo.isOutOfStock ? (
                                  <>
                                    Agotado
                                  </>
                                ) : (
                                  <>
                                    No disponible
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center justify-between">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) - 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                {editingQuantity === product.id ? (
                                  <Input
                                    value={tempQuantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    onBlur={() => handleQuantitySubmit(product.id)}
                                    onKeyDown={(e) => handleQuantityKeyDown(e, product.id)}
                                    className="w-16 h-8 text-center text-sm font-semibold mx-2 p-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="px-4 font-semibold text-sm cursor-pointer hover:bg-gray-100 rounded min-w-[3rem] text-center"
                                    onClick={() => handleQuantityClick(product.id, getCartItemQuantity(product.id))}
                                    title="Haz clic para editar cantidad"
                                  >
                                    {getCartItemQuantity(product.id)}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) + 1)}
                                  disabled={getCartItemQuantity(product.id) >= dailyAvailabilityInfo.stockCount}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-96 mx-auto bg-white border border-orange-200">
          <TabsTrigger value="products" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
            <Grid3X3 className="w-4 h-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="businesses" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
            <Store className="w-4 h-4 mr-2" />
            Comercios
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Productos Disponibles
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-orange-100' : ''}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-orange-100' : ''}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {loading.products ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                        <CardContent className="p-4">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : products.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No hay productos disponibles
                      </h3>
                      <p className="text-gray-500">
                        Intenta ajustar tus filtros de búsqueda
                      </p>
                    </div>
                  ) : (
                    products.map((product) => {
                      const productImageUrl = getProductImageUrl(product);
                      
                      // Información mejorada de disponibilidad y stock (igual que BusinessProfile)
                      const availabilityInfo = {
                        isAvailable: product.is_available && product.stock_quantity > 0,
                        hasStock: product.stock_quantity > 0,
                        isLowStock: product.stock_quantity <= 5 && product.stock_quantity > 0,
                        isLastUnits: product.stock_quantity <= 3 && product.stock_quantity > 0,
                        stockCount: product.stock_quantity || 0,
                        isDisabledByVendor: product.is_available === false,
                        isOutOfStock: product.stock_quantity === 0
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
                        <Card key={product.id} className="hover:shadow-xl transition-all duration-300 border-gray-200">
                          <div className="relative">
                            <ImageWithFallback
                              src={productImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-t-lg"
                              expandable={true}
                              onExpand={openImageModal}
                            />
                            {/* Badges de stock mejorados */}
                            <div className="absolute top-2 right-2 space-y-1">
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
                              {availabilityInfo.isLowStock && !availabilityInfo.isLastUnits && (
                                <Badge className="bg-orange-500 text-white text-xs px-2 py-1 shadow-lg">
                                  ⚠️ Stock bajo
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {product.description}
                            </p>
                            
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl font-bold text-green-600">
                                Q{product.price.toFixed(2)}
                              </span>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600 ml-1">4.5</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm text-gray-600 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {product.seller?.business_name || 'Vendedor'}
                                {product.seller?.is_verified && (
                                  <Verified className="w-3 h-3 ml-1 text-blue-500" />
                                )}
                              </div>
                              <Badge variant="outline">{product.category}</Badge>
                            </div>

                            {/* Badge de stock mejorado */}
                            <div className="mb-3">
                              <Badge className={`text-xs font-medium ${stockBadge.className}`}>
                                <span className="mr-1">{stockBadge.icon}</span>
                                {stockBadge.text}
                              </Badge>
                            </div>

                            {getCartItemQuantity(product.id) === 0 ? (
                              <Button 
                                onClick={() => handleAddToCart(product.id, false, product.name)}
                                className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                                disabled={!availabilityInfo.isAvailable || addingToCart === product.id}
                              >
                                {addingToCart === product.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Agregando...
                                  </>
                                ) : availabilityInfo.isAvailable ? (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar al carrito
                                  </>
                                ) : availabilityInfo.isOutOfStock ? (
                                  'Agotado'
                                ) : availabilityInfo.isDisabledByVendor ? (
                                  'No disponible'
                                ) : (
                                  'Sin stock'
                                )}
                              </Button>
                            ) : (
                              <div className="flex items-center justify-between">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                {editingQuantity === product.id ? (
                                  <Input
                                    value={tempQuantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    onBlur={() => handleQuantitySubmit(product.id)}
                                    onKeyDown={(e) => handleQuantityKeyDown(e, product.id)}
                                    className="w-20 h-8 text-center text-sm font-semibold mx-2 p-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="px-4 font-semibold cursor-pointer hover:bg-gray-100 rounded min-w-[4rem] text-center"
                                    onClick={() => handleQuantityClick(product.id, getCartItemQuantity(product.id))}
                                    title="Haz clic para editar cantidad"
                                  >
                                    {getCartItemQuantity(product.id)} en carrito
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) + 1)}
                                  disabled={getCartItemQuantity(product.id) >= availabilityInfo.stockCount || !availabilityInfo.isAvailable}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => {
                    const productImageUrl = getProductImageUrl(product);
                    
                    // Misma lógica de disponibilidad para vista de lista
                    const availabilityInfo = {
                      isAvailable: product.is_available && product.stock_quantity > 0,
                      hasStock: product.stock_quantity > 0,
                      isLowStock: product.stock_quantity <= 5 && product.stock_quantity > 0,
                      isLastUnits: product.stock_quantity <= 3 && product.stock_quantity > 0,
                      stockCount: product.stock_quantity || 0,
                      isDisabledByVendor: product.is_available === false,
                      isOutOfStock: product.stock_quantity === 0
                    };

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
                      <Card key={product.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <ImageWithFallback
                              src={productImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&h=120&fit=crop'}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg"
                              expandable={true}
                              onExpand={openImageModal}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-lg">{product.name}</h3>
                                  <p className="text-gray-600 text-sm mb-1">{product.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {product.seller?.business_name}
                                    </span>
                                    <Badge variant="outline">{product.category}</Badge>
                                  </div>
                                  {/* Badge de stock en vista de lista */}
                                  <div className="mt-2">
                                    <Badge className={`text-xs font-medium ${stockBadge.className}`}>
                                      <span className="mr-1">{stockBadge.icon}</span>
                                      {stockBadge.text}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-600 mb-2">
                                    Q{product.price.toFixed(2)}
                                  </div>
                                  {getCartItemQuantity(product.id) === 0 ? (
                                    <Button 
                                      onClick={() => handleAddToCart(product.id, false, product.name)}
                                      disabled={!availabilityInfo.isAvailable || addingToCart === product.id}
                                    >
                                      {addingToCart === product.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      ) : availabilityInfo.isAvailable ? (
                                        <>
                                          <Plus className="w-4 h-4 mr-2" />
                                          Agregar
                                        </>
                                      ) : availabilityInfo.isOutOfStock ? (
                                        'Agotado'
                                      ) : availabilityInfo.isDisabledByVendor ? (
                                        'No disponible'
                                      ) : (
                                        'Sin stock'
                                      )}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) - 1)}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      {editingQuantity === product.id ? (
                                        <Input
                                          value={tempQuantity}
                                          onChange={(e) => handleQuantityChange(e.target.value)}
                                          onBlur={() => handleQuantitySubmit(product.id)}
                                          onKeyDown={(e) => handleQuantityKeyDown(e, product.id)}
                                          className="w-14 h-8 text-center text-sm font-medium p-1"
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="px-2 cursor-pointer hover:bg-gray-100 rounded min-w-[2rem] text-center"
                                          onClick={() => handleQuantityClick(product.id, getCartItemQuantity(product.id))}
                                          title="Haz clic para editar cantidad"
                                        >
                                          {getCartItemQuantity(product.id)}
                                        </span>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) + 1)}
                                        disabled={getCartItemQuantity(product.id) >= availabilityInfo.stockCount || !availabilityInfo.isAvailable}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Businesses Tab */}
        <TabsContent value="businesses" className="space-y-6">
          <Card className="border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-green-500" />
                Comercios en Gualán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading.businesses ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-32 bg-gray-200 rounded-t-lg"></div>
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : businesses.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay comercios disponibles
                    </h3>
                    <p className="text-gray-500">
                      Pronto habrá más comercios en tu área
                    </p>
                  </div>
                ) : (
                  businesses.map((business) => {
                    // ✅ USAR PORTADA EN LUGAR DE LOGO
                    const businessCoverUrl = business.cover_image_url || business.cover_image;
                    const businessLogoUrl = business.logo_url;
                    
                    console.log('🔥 BUSINESS RENDER:', {
                      id: business.id,
                      name: business.business_name,
                      cover_image_url: business.cover_image_url,
                      cover_image: business.cover_image,
                      logo_url: business.logo_url,
                      final_cover: businessCoverUrl,
                      final_logo: businessLogoUrl
                    });

                    return (
                      <Card 
                        key={business.id} 
                        className="cursor-pointer hover:shadow-xl transition-all duration-300 border-green-200"
                        onClick={() => handleBusinessClick(business.id)}
                      >
                        <div className="relative">
                          {businessCoverUrl ? (
                            <ImageWithFallback
                              src={businessCoverUrl}
                              alt={`Portada de ${business.business_name}`}
                              className="w-full h-32 object-cover rounded-t-lg"
                              expandable={true}
                              onExpand={openImageModal}
                            />
                          ) : (
                            <div className="w-full h-32 bg-gradient-to-r from-orange-400 to-green-400 flex items-center justify-center rounded-t-lg">
                              <div className="text-center text-white">
                                <Store className="w-8 h-8 mx-auto mb-1" />
                                <p className="text-sm font-semibold">{business.business_name}</p>
                              </div>
                            </div>
                          )}
                          {business.is_verified && (
                            <Badge className="absolute top-2 right-2 bg-blue-500 text-white">
                              <Verified className="w-3 h-3 mr-1" />
                              Verificado
                            </Badge>
                          )}
                          
                          {/* Logo del negocio en la esquina inferior izquierda de la portada */}
                          {businessLogoUrl && (
                            <div className="absolute bottom-2 left-2">
                              <div className="w-12 h-12 rounded-full bg-white shadow-lg p-1">
                                <ImageWithFallback
                                  src={businessLogoUrl}
                                  alt={`Logo de ${business.business_name}`}
                                  className="w-full h-full object-cover rounded-full"
                                  expandable={true}
                                  onExpand={openImageModal}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-1">{business.business_name}</h3>
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                            {business.business_description || 'Comercio local en Gualán'}
                          </p>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600 ml-1">{business.rating.toFixed(1)}</span>
                            </div>
                            <Badge variant="outline">{business.category || 'General'}</Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {business.address || 'Gualán, Zacapa'}
                            </span>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Ver productos
                            </Button>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              {business.products_count} productos disponibles
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Carrito flotante */}
      <FloatingCart onCartClick={() => {
        console.log('🛒 Carrito flotante clicked desde BuyerHome!');
        if (onShowCart) {
          onShowCart();
        } else {
          alert('🛒 Carrito flotante funcional desde Home! Navegación no configurada.');
        }
      }} />
    </div>
  );
}