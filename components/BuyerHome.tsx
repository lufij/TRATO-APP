import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useBuyerData } from '../hooks/useBuyerData';
import { Product } from '../utils/supabase/client';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Star, 
  MapPin, 
  LogOut, 
  Filter,
  Clock,
  Store,
  Verified,
  Phone,
  Grid3X3,
  List,
  TrendingUp,
  Flame,
  ChevronRight,
  Eye
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

type ViewMode = 'grid' | 'list';

export function BuyerHome() {
  const { user, signOut } = useAuth();
  const { items: cartItems, addToCart, updateCartItem, removeFromCart, getCartTotal, getCartItemCount } = useCart();
  const { 
    products, 
    dailyProducts, 
    businesses, 
    loading, 
    fetchProducts, 
    getBusinessProducts,
    getTimeRemaining 
  } = useBuyerData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [businessProducts, setBusinessProducts] = useState<Product[]>([]);
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

  const handleAddToCart = async (productId: string, isDaily = false) => {
    await addToCart(productId, 1, isDaily ? 'daily' : 'regular');
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

  const handleBusinessClick = async (businessId: string) => {
    setSelectedBusiness(businessId);
    const products = await getBusinessProducts(businessId);
    setBusinessProducts(products);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-orange-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-orange-500 to-green-500 p-3 rounded-xl shadow-lg">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                  TRATO
                </h1>
                <p className="text-sm text-gray-600">¡Hola, {user?.name}! 👋</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Cart Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="relative bg-white hover:bg-orange-50 border-orange-200"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Carrito
                    {getCartItemCount() > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs bg-orange-500">
                        {getCartItemCount()}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Mi Carrito
                    </DialogTitle>
                    <DialogDescription>
                      {cartItems.length} productos en tu carrito
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-4">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Tu carrito está vacío</p>
                        </div>
                      ) : (
                        <>
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between border-b pb-3">
                              <div className="flex items-center space-x-3">
                                <ImageWithFallback
                                  src={item.product?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                                  alt={item.product?.name || 'Producto'}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.product?.name}</p>
                                  <p className="text-green-600 font-semibold">Q{item.product?.price}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                {editingQuantity === item.product_id ? (
                                  <Input
                                    value={tempQuantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    onBlur={() => handleQuantitySubmit(item.product_id)}
                                    onKeyDown={(e) => handleQuantityKeyDown(e, item.product_id)}
                                    className="w-12 h-7 text-center text-sm font-medium p-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className="px-2 font-medium cursor-pointer hover:bg-gray-100 rounded min-w-[2rem] text-center"
                                    onClick={() => handleQuantityClick(item.product_id, item.quantity)}
                                    title="Haz clic para editar cantidad"
                                  >
                                    {item.quantity}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="border-t pt-4">
                            <div className="flex justify-between text-lg font-semibold">
                              <span>Total:</span>
                              <span className="text-green-600">Q{getCartTotal().toFixed(2)}</span>
                            </div>
                            <Button className="w-full mt-4 bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600">
                              Proceder al Checkout
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              
              {/* Profile Menu */}
              <Button variant="ghost" onClick={signOut} className="text-gray-600 hover:text-gray-800">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <Card className="mb-6 border-orange-200 shadow-lg">
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
          <Card className="mb-6 border-orange-200 shadow-lg">
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
                    // Loading skeletons
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
                    dailyProducts.map((product) => (
                      <div key={product.id} className="flex-none w-72">
                        <Card className="hover:shadow-xl transition-all duration-300 border-orange-200">
                          <div className="relative">
                            <ImageWithFallback
                              src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=160&fit=crop'}
                              alt={product.name}
                              className="w-full h-40 object-cover rounded-t-lg"
                            />
                            <Badge className="absolute top-2 right-2 bg-red-500 text-white animate-pulse">
                              <Clock className="w-3 h-3 mr-1" />
                              {getTimeRemaining(product.expires_at)}
                            </Badge>
                            <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                              Hoy únicamente
                            </Badge>
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

                            {getCartItemQuantity(product.id) === 0 ? (
                              <Button 
                                onClick={() => handleAddToCart(product.id, true)}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                disabled={product.stock_quantity === 0}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar
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
                                <span className="px-4 font-semibold text-sm">
                                  {getCartItemQuantity(product.id)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) + 1)}
                                  disabled={getCartItemQuantity(product.id) >= product.stock_quantity}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))
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
                        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No hay productos disponibles
                        </h3>
                        <p className="text-gray-500">
                          Intenta ajustar tus filtros de búsqueda
                        </p>
                      </div>
                    ) : (
                      products.map((product) => (
                        <Card key={product.id} className="hover:shadow-xl transition-all duration-300 border-gray-200">
                          <div className="relative">
                            <ImageWithFallback
                              src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-t-lg"
                            />
                            {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                              <Badge variant="destructive" className="absolute top-2 right-2">
                                ¡Últimas {product.stock_quantity}!
                              </Badge>
                            )}
                            {product.stock_quantity === 0 && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-t-lg">
                                <Badge variant="destructive">Agotado</Badge>
                              </div>
                            )}
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

                            {getCartItemQuantity(product.id) === 0 ? (
                              <Button 
                                onClick={() => handleAddToCart(product.id)}
                                className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                                disabled={product.stock_quantity === 0}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar al carrito
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
                                <span className="px-4 font-semibold">
                                  {getCartItemQuantity(product.id)} en carrito
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(product.id, getCartItemQuantity(product.id) + 1)}
                                  disabled={getCartItemQuantity(product.id) >= product.stock_quantity}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                ) : (
                  // List view
                  <div className="space-y-4">
                    {products.map((product) => (
                      <Card key={product.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <ImageWithFallback
                              src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&h=120&fit=crop'}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg"
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
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-600 mb-2">
                                    Q{product.price.toFixed(2)}
                                  </div>
                                  {getCartItemQuantity(product.id) === 0 ? (
                                    <Button 
                                      onClick={() => handleAddToCart(product.id)}
                                      disabled={product.stock_quantity === 0}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Agregar
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
                                        disabled={getCartItemQuantity(product.id) >= product.stock_quantity}
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
                    ))}
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
                  Directorio de Comercios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading.businesses ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-16 w-16 bg-gray-200 rounded-full mb-4"></div>
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : businesses.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No hay comercios registrados
                      </h3>
                      <p className="text-gray-500">
                        Los vendedores aparecerán aquí cuando se registren
                      </p>
                    </div>
                  ) : (
                    businesses.map((business) => (
                      <Card 
                        key={business.id} 
                        className="hover:shadow-xl transition-all duration-300 cursor-pointer border-gray-200"
                        onClick={() => handleBusinessClick(business.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                <Store className="w-8 h-8 text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{business.business_name}</h3>
                                  {business.is_verified && (
                                    <Verified className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="text-sm text-gray-600">
                                    {business.rating.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {business.business_description || 'Comercio local en Gualán'}
                          </p>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <span>{business.products_count} productos</span>
                            {business.user.phone && (
                              <span className="flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                Contacto
                              </span>
                            )}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            className="w-full border-green-200 hover:bg-green-50"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver productos
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Business Products Modal */}
      {selectedBusiness && (
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Productos de {businesses.find(b => b.id === selectedBusiness)?.business_name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <ImageWithFallback
                        src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm mb-1">{product.name}</h4>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-green-600">
                          Q{product.price.toFixed(2)}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.stock_quantity === 0}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}