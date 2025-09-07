import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useBuyerData, DailyProduct } from '../../hooks/useBuyerData';
import { Product } from '../../utils/supabase/client';
import { toast } from "sonner";
import { 
  Store,
  Verified,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Star,
  MapPin,
  Eye
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useImageModalContext } from '../../contexts/ImageModalContext';
import { FloatingCart } from '../ui/FloatingCart';

// Importar nuevos componentes refactorizados
import { SearchSection } from './home/SearchSection';
import { FloatingSearch } from './home/FloatingSearch';
import { ProductGrid } from './home/ProductGrid';
import { DailyProductsSection } from './home/DailyProductsSection';

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
    refreshProductStock, 
    refreshAllData 
  } = useBuyerData();
  const { openImageModal } = useImageModalContext();

  // Estados principales
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const categories = [
    'Comida', 'Bebidas', 'Dulces', 'Panadería', 'Lácteos', 
    'Carnes', 'Verduras', 'Frutas', 'Limpieza', 'Cuidado Personal'
  ];

  const handleSearch = async () => {
    const filtered = products.filter(product => {
      const matchesQuery = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        product.category === selectedCategory;
      
      return matchesQuery && matchesCategory;
    });
    
    setFilteredProducts(filtered);
  };

  // Actualizar productos filtrados cuando cambien los productos o filtros
  useEffect(() => {
    handleSearch();
  }, [products, searchQuery, selectedCategory]);

  // Inicializar productos filtrados
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  const handleAddToCart = async (productId: string, isDaily = false, productName = 'Producto') => {
    if (!user) {
      toast.error('Debes iniciar sesión para agregar productos');
      return;
    }

    try {
      setAddingToCart(productId);
      const result = await addToCart(productId, 1, isDaily ? 'daily' : 'regular');
      
      if (result?.success) {
        toast.success(`Agregado al carrito`);
      } else {
        toast.error(`❌ Error: ${result?.message || 'No se pudo agregar el producto'}`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('❌ Error al agregar producto al carrito');
    } finally {
      setAddingToCart(null);
    }
  };

  // Funciones para manejar cantidades
  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    const cartItem = cartItems.find(item => item.product_id === productId);
    if (!cartItem) return;

    if (newQuantity <= 0) {
      await removeFromCart(cartItem.id);
    } else {
      await updateCartItem(cartItem.id, newQuantity);
    }
  };

  const handleQuantityClick = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setTempQuantity(value);
    }
  };

  const handleQuantitySubmit = async (productId: string) => {
    const quantity = parseInt(tempQuantity);
    if (!isNaN(quantity)) {
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

  // Función de refresh manual para mostrar productos diferentes
  const handleRefreshStock = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      
      // Llamar a la función de refresh que mezclará los productos
      await refreshProductStock();
      
      setLastUpdated(new Date());
      toast.success('✅ Productos actualizados - Nuevos productos disponibles');
    } catch (error) {
      console.error('❌ Error en refresco manual:', error);
      toast.error('❌ Error al actualizar productos - Intenta de nuevo');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Actualizar timestamp cuando cambian los productos
  useEffect(() => {
    if (products.length > 0) {
      setLastUpdated(new Date());
    }
  }, [products]);

  const handleBusinessClick = (businessId: string) => {
    onBusinessClick(businessId);
  };

  return (
    <div className="space-y-6">
      {/* Sección de búsqueda refactorizada */}
      <SearchSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        viewMode={viewMode}
        setViewMode={setViewMode}
        categories={categories}
        onSearch={handleSearch}
        onRefreshStock={handleRefreshStock}
        onRefreshAll={refreshAllData}
        isLoading={Object.values(loading).some(Boolean)}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      {/* Contenido principal con tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Del Día
          </TabsTrigger>
          <TabsTrigger value="businesses" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Negocios
          </TabsTrigger>
        </TabsList>

        {/* Tab de productos principales */}
        <TabsContent value="products" className="space-y-6">
          <Card className="border-orange-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-500" />
                Todos los Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductGrid
                products={filteredProducts}
                viewMode={viewMode}
                cartItems={cartItems}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={updateCartQuantity}
                onImageClick={openImageModal}
                onBusinessClick={handleBusinessClick}
                addingToCart={addingToCart}
                editingQuantity={editingQuantity}
                tempQuantity={tempQuantity}
                onQuantityClick={handleQuantityClick}
                onQuantityChange={handleQuantityChange}
                onQuantitySubmit={handleQuantitySubmit}
                onQuantityKeyDown={handleQuantityKeyDown}
                loading={loading.products}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de productos del día */}
        <TabsContent value="daily" className="space-y-6">
          <DailyProductsSection
            dailyProducts={dailyProducts}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={updateCartQuantity}
            onImageClick={openImageModal}
            onBusinessClick={handleBusinessClick}
            addingToCart={addingToCart}
            editingQuantity={editingQuantity}
            tempQuantity={tempQuantity}
            onQuantityClick={handleQuantityClick}
            onQuantityChange={handleQuantityChange}
            onQuantitySubmit={handleQuantitySubmit}
            onQuantityKeyDown={handleQuantityKeyDown}
            loading={loading.dailyProducts}
          />
        </TabsContent>

        {/* Tab de negocios */}
        <TabsContent value="businesses" className="space-y-6">
          <Card className="border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-green-500" />
                Negocios Locales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading.businesses ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 h-32 rounded-t-lg mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : businesses && businesses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {businesses.map((business) => {
                    const businessCoverUrl = business.cover_image_url || business.cover_image;
                    const businessLogoUrl = business.logo_url;

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
                              <span className="text-sm text-gray-600 ml-1">
                                {business.rating && business.rating > 0 
                                  ? business.rating.toFixed(1) 
                                  : 'Nuevo'
                                }
                              </span>
                            </div>
                            <Badge variant="outline">{business.category || 'General'}</Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {business.address || business.business_address || business.user?.address || 'Gualán, Zacapa'}
                            </span>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Ver productos
                            </Button>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              {business.products_count || 0} productos disponibles
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay negocios disponibles</h3>
                  <p className="text-gray-500">Los negocios aparecerán aquí cuando estén disponibles.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Carrito flotante */}
      <FloatingCart onCartClick={() => {
        if (onShowCart) {
          onShowCart();
        }
      }} />

      {/* Búsqueda flotante */}
      <FloatingSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        onSearch={handleSearch}
        isLoading={loading.products || loading.dailyProducts || loading.businesses}
      />
    </div>
  );
}
