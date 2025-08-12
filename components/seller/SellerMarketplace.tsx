import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { OrderProvider } from '../../contexts/OrderContext';
import { supabase } from '../../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, 
  ShoppingCart, 
  Store, 
  Star, 
  Clock, 
  MapPin, 
  Plus,
  Minus,
  Eye,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { processImageUrl } from '../../utils/imageUtils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { BuyerCart } from '../buyer/BuyerCart';

interface Business {
  id: string;
  name: string;
  description: string;
  business_type: string;
  business_rating: number;
  total_reviews: number;
  profile_image_url: string;
  is_open: boolean;
  created_at: string;
}

interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  is_public: boolean;
  created_at: string;
  seller_name?: string;
  seller_business_type?: string;
}

interface DailyProduct {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  expires_at: string;
  created_at: string;
  seller_name?: string;
  seller_business_type?: string;
}

type MarketView = 'businesses' | 'products' | 'daily-products' | 'cart';

function SellerMarketplaceContent() {
  const { user } = useAuth();
  const { items, addToCart, getCartItemCount } = useCart();
  
  const [currentView, setCurrentView] = useState<MarketView>('businesses');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyProducts, setDailyProducts] = useState<DailyProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 Iniciando carga de datos del marketplace...');
      console.log('👤 Usuario actual:', user?.name, user?.id);
      
      if (!user?.id) {
        console.warn('⚠️ No hay usuario autenticado');
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      try {
        await Promise.all([
          loadBusinesses(),
          loadProducts(), 
          loadDailyProducts()
        ]);
        console.log('✅ Carga de datos completada');
      } catch (error) {
        console.error('❌ Error en carga de datos:', error);
      }
    };

    loadData();
  }, [user]);

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          business_name,
          business_description
        `)
        .eq('role', 'vendedor')
        .neq('id', user?.id) // Exclude current user's business
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading businesses:', error);
        throw error;
      }

      console.log('Raw businesses data:', data);

      const businessData: Business[] = (data || []).map(seller => ({
        id: seller.id,
        name: seller.name || 'Comercio sin nombre',
        description: seller.business_description || 'Comercio local en Gualán',
        business_type: seller.business_name || 'General',
        business_rating: 4.5, // Default value since column may not exist
        total_reviews: 0, // Default value since column may not exist
        profile_image_url: '', // Default value since column may not exist
        is_open: true, // Default value since column may not exist
        created_at: seller.created_at
      }));

      console.log('Processed businesses:', businessData);
      setBusinesses(businessData);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setError('Error al cargar los comercios: ' + (error as any).message);
    }
  };

  const loadProducts = async () => {
    try {
      // Primero obtenemos los productos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .neq('seller_id', user?.id) // Exclude current user's products
        .eq('is_public', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        throw productsError;
      }

      console.log('Raw products data:', productsData);

      // Luego obtenemos la información de los vendedores para los productos
      const sellerIds = [...new Set(productsData?.map(p => p.seller_id) ?? [])];
      
      let sellersData: any[] = [];
      if (sellerIds.length > 0) {
        const { data: sellersResponse, error: sellersError } = await supabase
          .from('users')
          .select('id, name, business_name')
          .in('id', sellerIds);

        if (sellersError) {
          console.error('Error loading sellers for products:', sellersError);
        } else {
          sellersData = sellersResponse || [];
        }
      }

      console.log('Sellers data for products:', sellersData);

      // Combinamos los datos
      const productsWithSeller: Product[] = (productsData || []).map(product => {
        const seller = sellersData.find(s => s.id === product.seller_id);
        return {
          ...product,
          seller_name: seller?.name || 'Vendedor desconocido',
          seller_business_type: seller?.business_name || 'General'
        };
      });

      console.log('Processed products:', productsWithSeller);
      setProducts(productsWithSeller);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Error al cargar los productos: ' + (error as any).message);
    }
  };

  const loadDailyProducts = async () => {
    try {
      // Primero obtenemos los productos del día
      const { data: dailyProductsData, error: dailyProductsError } = await supabase
        .from('daily_products')
        .select('*')
        .neq('seller_id', user?.id) // Exclude current user's daily products
        .gte('expires_at', new Date().toISOString())
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (dailyProductsError) {
        console.error('Error loading daily products:', dailyProductsError);
        throw dailyProductsError;
      }

      console.log('Raw daily products data:', dailyProductsData);

      // Luego obtenemos la información de los vendedores para los productos del día
      const sellerIds = [...new Set(dailyProductsData?.map(p => p.seller_id) ?? [])];
      
      let sellersData: any[] = [];
      if (sellerIds.length > 0) {
        const { data: sellersResponse, error: sellersError } = await supabase
          .from('users')
          .select('id, name, business_name')
          .in('id', sellerIds);

        if (sellersError) {
          console.error('Error loading sellers for daily products:', sellersError);
        } else {
          sellersData = sellersResponse || [];
        }
      }

      console.log('Sellers data for daily products:', sellersData);

      // Combinamos los datos
      const dailyProductsWithSeller: DailyProduct[] = (dailyProductsData || []).map(product => {
        const seller = sellersData.find(s => s.id === product.seller_id);
        return {
          ...product,
          seller_name: seller?.name || 'Vendedor desconocido',
          seller_business_type: seller?.business_name || 'General'
        };
      });

      console.log('Processed daily products:', dailyProductsWithSeller);
      setDailyProducts(dailyProductsWithSeller);
    } catch (error) {
      console.error('Error loading daily products:', error);
      setError('Error al cargar las ofertas del día: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string, productType: 'regular' | 'daily' = 'regular') => {
    const result = await addToCart(productId, 1, productType);
    if (!result.success) {
      setError(result.message);
    }
  };

  const filteredBusinesses = businesses.filter(business =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.business_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDailyProducts = dailyProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`;
    } else if (minutes > 0) {
      return `${minutes}m restantes`;
    } else {
      return 'Expirado';
    }
  };

  if (currentView === 'cart') {
    return (
      <OrderProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentView('businesses')}
            >
              ← Volver al mercado
            </Button>
            <h2 className="text-xl font-semibold">Mi Carrito de Compras</h2>
          </div>
          <BuyerCart onBackToShopping={() => setCurrentView('businesses')} />
        </div>
      </OrderProvider>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mercado TRATO</h2>
          <p className="text-gray-600">Compra productos de otros comercios en Gualán</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setLoading(true);
              setError(null);
              loadBusinesses();
              loadProducts();
              loadDailyProducts();
            }}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button
            onClick={() => setCurrentView('cart')}
            className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Carrito ({getCartItemCount()})
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar comercios, productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Debug Info - Solo visible en modo desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>• Comercios cargados: {businesses.length}</p>
              <p>• Productos cargados: {products.length}</p>
              <p>• Productos del día: {dailyProducts.length}</p>
              <p>• Estado de carga: {loading ? 'Cargando...' : 'Completado'}</p>
              <p>• Usuario: {user?.name} (ID: {user?.id})</p>
              {error && <p className="text-red-600">• Error: {error}</p>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as MarketView)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="businesses" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Comercios ({filteredBusinesses.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Productos ({filteredProducts.length})
          </TabsTrigger>
          <TabsTrigger value="daily-products" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Ofertas del Día ({filteredDailyProducts.length})
          </TabsTrigger>
        </TabsList>

        {/* Businesses Tab */}
        <TabsContent value="businesses" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Store className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay comercios disponibles
                </h3>
                <p className="text-gray-600">
                  No se encontraron comercios que coincidan con tu búsqueda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((business) => (
                <Card key={business.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                        <ImageWithFallback
                          src={processImageUrl(business.profile_image_url)}
                          alt={business.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{business.name}</CardTitle>
                          {business.is_open && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Abierto
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{business.business_type}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {business.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">
                            {business.business_rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          ({business.total_reviews} reseñas)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBusiness(business);
                          setCurrentView('products');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver productos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay productos disponibles
                </h3>
                <p className="text-gray-600">
                  No se encontraron productos que coincidan con tu búsqueda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    <ImageWithFallback
                      src={processImageUrl(product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.seller_name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {product.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-green-600">
                          Q{product.price.toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500">
                          Stock: {product.stock_quantity}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleAddToCart(product.id)}
                        className="bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Daily Products Tab */}
        <TabsContent value="daily-products" className="space-y-4">
          {filteredDailyProducts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay ofertas del día disponibles
                </h3>
                <p className="text-gray-600">
                  No hay ofertas especiales activas en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDailyProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow border-orange-200">
                  <div className="relative">
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      <ImageWithFallback
                        src={processImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Badge className="absolute top-2 right-2 bg-orange-500 text-white">
                      Oferta del día
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.seller_name}</p>
                      <p className="text-xs text-orange-600 font-medium">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {getTimeUntilExpiry(product.expires_at)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-orange-600">
                          Q{product.price.toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500">
                          Stock: {product.stock_quantity}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleAddToCart(product.id, 'daily')}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SellerMarketplace() {
  return (
    <OrderProvider>
      <SellerMarketplaceContent />
    </OrderProvider>
  );
}