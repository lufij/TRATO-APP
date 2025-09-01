# 🚀 PLAN COMPLETO DE MEJORAS - PANTALLAS DEL COMPRADOR

## 📋 **RESUMEN EJECUTIVO**

**Objetivo:** Transformar las pantallas del comprador de funcional básico a **experiencia profesional e-commerce**

**Duración Estimada:** 2-3 semanas
**Impacto:** Alto - Experiencia del usuario significativamente mejorada
**Riesgo:** Bajo - Cambios incrementales sin afectar funcionalidad existente

---

## 🎯 **FASE 1: FIXES CRÍTICOS BUYERPROFILE** (2-3 días) 🔴

### **1.1 Eliminar Código de Debug/Prueba**

**❌ CÓDIGO A ELIMINAR:**
```tsx
// En BuyerProfile.tsx - REMOVER COMPLETAMENTE
const addTestProductDirect = async () => { ... }
const addToCart = async (productId: string) => { ... }

// Card completa de prueba - ELIMINAR
<Card className="p-6">
  <h3 className="text-lg font-semibold mb-4 flex items-center">
    🔧 Prueba de Carrito
  </h3>
  <div className="space-y-2">
    <Button onClick={addTestProductDirect}>🔧 Insertar Directo</Button>
    <Button onClick={() => addToCart('test-product-1')}>➕ Prueba con RPC</Button>
  </div>
</Card>
```

**✅ RESULTADO ESPERADO:**
- BuyerProfile sin botones de prueba
- Sin funciones de debug
- Solo funcionalidad real para usuarios

### **1.2 Sistema de Ubicación Profesional**

**❌ CÓDIGO ACTUAL PROBLEMÁTICO:**
```tsx
// GPS básico sin validación
const handleUpdateLocation = async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      // Sin validación, sin manejo de errores
    });
  }
};
```

**✅ NUEVA IMPLEMENTACIÓN:**
```tsx
interface SavedAddress {
  id: string;
  name: string; // "Casa", "Trabajo", "Gimnasio"
  full_address: string;
  coordinates: { lat: number; lng: number };
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
}

const AddressManager = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3>📍 Mis Direcciones</h3>
        <Button onClick={openAddressModal}>+ Agregar</Button>
      </div>
      
      {addresses.map(address => (
        <AddressCard 
          key={address.id}
          address={address}
          onSetDefault={setDefaultAddress}
          onEdit={editAddress}
          onDelete={deleteAddress}
        />
      ))}
    </div>
  );
};

const AddressCard = ({ address, onSetDefault, onEdit, onDelete }) => {
  return (
    <Card className={`p-4 ${address.is_default ? 'border-green-500' : ''}`}>
      <div className="flex justify-between">
        <div>
          <div className="font-semibold flex items-center">
            {address.name} 
            {address.is_default && <Badge variant="outline" className="ml-2">Principal</Badge>}
          </div>
          <div className="text-sm text-gray-600">{address.full_address}</div>
          {address.is_verified && <div className="text-xs text-green-600">✓ Verificada</div>}
        </div>
        <div className="space-x-2">
          {!address.is_default && (
            <Button size="sm" variant="outline" onClick={() => onSetDefault(address.id)}>
              Hacer principal
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(address)}>
            Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(address.id)}>
            🗑️
          </Button>
        </div>
      </div>
    </Card>
  );
};
```

### **1.3 Upload de Avatar Mejorado**

**❌ PROBLEMAS ACTUALES:**
- Sin validación de archivos
- Sin compresión de imágenes
- Error handling básico

**✅ NUEVA IMPLEMENTACIÓN:**
```tsx
const AvatarUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return 'Solo se permiten imágenes JPG, PNG o WebP';
    }
    
    if (file.size > maxSize) {
      return 'La imagen debe ser menor a 5MB';
    }
    
    return null;
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Resize to max 400x400 maintaining aspect ratio
        const maxSize = 400;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, file.type, 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      setPreview(URL.createObjectURL(compressedFile));
      
      // Upload to Supabase
      const { error } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/avatar.jpg`, compressedFile, {
          upsert: true
        });
      
      if (error) throw error;
      
      toast.success('Avatar actualizado correctamente');
    } catch (error) {
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="w-24 h-24">
          <AvatarImage src={preview || userProfile?.avatar_url} />
          <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <Button 
          variant="outline" 
          onClick={() => document.getElementById('avatar-upload')?.click()}
          disabled={uploading}
        >
          {uploading ? 'Subiendo...' : 'Cambiar foto'}
        </Button>
        <div className="text-xs text-gray-500 text-center">
          JPG, PNG o WebP. Máximo 5MB.
        </div>
      </div>
    </div>
  );
};
```

### **1.4 Estadísticas Reales de Órdenes**

**❌ PROBLEMA ACTUAL:**
```tsx
// Query incorrecta o incompleta
const stats = await supabase.from('orders').select('*');
```

**✅ NUEVA IMPLEMENTACIÓN:**
```tsx
const loadRealOrderStats = async () => {
  try {
    // Estadísticas básicas
    const { data: orderStats } = await supabase
      .from('orders')
      .select('total, status, seller_rating, created_at, delivery_type')
      .eq('buyer_id', user.id);

    if (!orderStats) return;

    const stats = {
      totalOrders: orderStats.length,
      totalSpent: orderStats.reduce((sum, order) => sum + (order.total || 0), 0),
      averageRating: orderStats
        .filter(o => o.seller_rating)
        .reduce((sum, o, _, arr) => sum + o.seller_rating / arr.length, 0),
      favoriteDeliveryType: getMostFrequent(orderStats.map(o => o.delivery_type)),
      monthlyActivity: getMonthlyActivity(orderStats)
    };

    setOrderStatistics(stats);
  } catch (error) {
    console.error('Error loading order stats:', error);
  }
};

const getMostFrequent = (arr: string[]) => {
  const frequency = arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.keys(frequency).reduce((a, b) => 
    frequency[a] > frequency[b] ? a : b
  );
};

const getMonthlyActivity = (orders: any[]) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const monthlyData = months.map(month => ({
    name: month,
    orders: 0,
    spent: 0
  }));
  
  orders.forEach(order => {
    const month = new Date(order.created_at).getMonth();
    monthlyData[month].orders++;
    monthlyData[month].spent += order.total || 0;
  });
  
  return monthlyData;
};
```

---

## 🏠 **FASE 2: REFACTORIZACIÓN BUYERHOME** (5-7 días) 🟡

### **2.1 Dividir Archivo Principal (1074 líneas → componentes)**

**📂 NUEVA ESTRUCTURA:**
```
components/buyer/home/
├── BuyerHome.tsx           (máx 300 líneas - orquestador principal)
├── SearchSection.tsx       (barra búsqueda + filtros)
├── ProductGrid.tsx         (grid responsive + virtualization)
├── ProductCard.tsx         (tarjeta individual optimizada)
├── ProductFilters.tsx      (filtros avanzados)
├── ProductModal.tsx        (detalle del producto)
├── RecommendedSection.tsx  (productos recomendados)
├── FavoritesSection.tsx    (productos favoritos)
└── DailyProductsSection.tsx (productos del día)
```

**✅ BuyerHome.tsx REFACTORIZADO:**
```tsx
const BuyerHome = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ProductFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="buyer-home-container">
      <SearchSection 
        query={searchQuery}
        onQueryChange={setSearchQuery}
        filters={activeFilters}
        onFiltersChange={setActiveFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {searchQuery === '' && (
        <>
          <RecommendedSection userId={user.id} />
          <DailyProductsSection />
          <FavoritesSection userId={user.id} />
        </>
      )}
      
      <ProductGrid 
        searchQuery={searchQuery}
        filters={activeFilters}
        sortBy={sortBy}
        viewMode={viewMode}
      />
    </div>
  );
};
```

### **2.2 Filtros Avanzados de E-commerce**

**✅ IMPLEMENTACIÓN:**
```tsx
interface ProductFilters {
  categories: string[];
  priceRange: { min: number; max: number };
  rating: number;
  distance: number;
  availability: 'all' | 'in-stock' | 'daily-only';
  seller: string[];
}

const ProductFilters = ({ filters, onFiltersChange, onReset }) => {
  return (
    <div className="filters-panel">
      <div className="filter-header">
        <h3>Filtros</h3>
        <Button variant="ghost" onClick={onReset}>Limpiar</Button>
      </div>
      
      <FilterSection title="Categorías">
        <CategoryMultiSelect 
          selected={filters.categories}
          onChange={(categories) => onFiltersChange({...filters, categories})}
        />
      </FilterSection>
      
      <FilterSection title="Precio">
        <PriceRangeSlider 
          min={filters.priceRange.min}
          max={filters.priceRange.max}
          onChange={(priceRange) => onFiltersChange({...filters, priceRange})}
        />
      </FilterSection>
      
      <FilterSection title="Calificación mínima">
        <RatingSelector 
          rating={filters.rating}
          onChange={(rating) => onFiltersChange({...filters, rating})}
        />
      </FilterSection>
      
      <FilterSection title="Distancia máxima">
        <DistanceSlider 
          distance={filters.distance}
          onChange={(distance) => onFiltersChange({...filters, distance})}
        />
      </FilterSection>
      
      <FilterSection title="Disponibilidad">
        <Select 
          value={filters.availability}
          onValueChange={(availability) => onFiltersChange({...filters, availability})}
        >
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="in-stock">En stock</SelectItem>
          <SelectItem value="daily-only">Solo productos del día</SelectItem>
        </Select>
      </FilterSection>
    </div>
  );
};
```

### **2.3 ProductCard Profesional**

**✅ NUEVA IMPLEMENTACIÓN:**
```tsx
const ProductCard = ({ product, viewMode = 'grid' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  return (
    <Card className={`product-card ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
      <div className="relative">
        {/* Imagen del producto */}
        <div className="product-image-container">
          {imageError ? (
            <div className="image-placeholder">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          ) : (
            <img 
              src={product.image_url} 
              alt={product.name}
              onError={() => setImageError(true)}
              className="product-image"
              loading="lazy"
            />
          )}
        </div>
        
        {/* Botón favorito */}
        <Button 
          size="sm" 
          variant="ghost" 
          className="favorite-btn"
          onClick={() => toggleFavorite(product.id)}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        
        {/* Badges */}
        <div className="product-badges">
          {product.type === 'daily' && <Badge variant="secondary">Producto del día</Badge>}
          {product.stock === 0 && <Badge variant="destructive">Agotado</Badge>}
          {product.discount && <Badge variant="outline">-{product.discount}%</Badge>}
        </div>
      </div>
      
      {/* Información del producto */}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        
        {/* Rating y vendedor */}
        <div className="product-meta">
          <div className="rating">
            <Star className="w-4 h-4 fill-yellow-400" />
            <span>{product.rating?.toFixed(1) || 'N/A'}</span>
            <span className="text-gray-500">({product.review_count})</span>
          </div>
          <div className="seller">
            <span className="text-sm text-gray-600">por {product.seller_name}</span>
          </div>
        </div>
        
        {/* Precio */}
        <div className="price-section">
          {product.discount ? (
            <div className="price-with-discount">
              <span className="original-price">${product.price}</span>
              <span className="discounted-price">${product.discounted_price}</span>
            </div>
          ) : (
            <span className="price">${product.price}</span>
          )}
        </div>
        
        {/* Acciones */}
        <div className="product-actions">
          <QuantitySelector 
            value={cartQuantity}
            onChange={setCartQuantity}
            max={product.stock}
            disabled={product.stock === 0}
          />
          <Button 
            onClick={() => addToCart(product.id, cartQuantity)}
            disabled={product.stock === 0}
            className="add-to-cart-btn"
          >
            {product.stock === 0 ? 'Agotado' : 'Agregar'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
```

### **2.4 Sistema de Recomendaciones**

**✅ IMPLEMENTACIÓN:**
```tsx
const RecommendedSection = ({ userId }) => {
  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    loadRecommendations();
  }, [userId]);
  
  const loadRecommendations = async () => {
    try {
      // Productos basados en historial
      const { data: orderHistory } = await supabase
        .from('order_items')
        .select('product_id, products(*)')
        .eq('orders.buyer_id', userId)
        .limit(50);
      
      // Productos populares en la zona
      const { data: popularProducts } = await supabase
        .rpc('get_popular_products_near_user', { user_id: userId });
      
      // Productos similares a favoritos
      const { data: similarToFavorites } = await supabase
        .rpc('get_similar_to_favorites', { user_id: userId });
      
      const recommended = [
        ...orderHistory.slice(0, 5),
        ...popularProducts.slice(0, 5),
        ...similarToFavorites.slice(0, 5)
      ];
      
      setRecommendations(unique(recommended, 'id'));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };
  
  return (
    <Section title="⭐ Recomendados para ti" className="recommended-section">
      <HorizontalProductScroll products={recommendations} />
    </Section>
  );
};
```

---

## 📦 **FASE 3: MEJORAS BUYERORDERS** (3-4 días) 🟢

### **3.1 Filtros y Búsqueda Avanzada**

**✅ IMPLEMENTACIÓN:**
```tsx
const OrderFilters = ({ filters, onFiltersChange }) => {
  return (
    <div className="order-filters">
      <SearchBar 
        placeholder="Buscar por producto, vendedor o ID..."
        value={filters.search}
        onChange={(search) => onFiltersChange({...filters, search})}
      />
      
      <div className="filter-row">
        <DateRangePicker 
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(dateRange) => onFiltersChange({...filters, ...dateRange})}
        />
        
        <Select 
          value={filters.status}
          onValueChange={(status) => onFiltersChange({...filters, status})}
        >
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="pending">Pendientes</SelectItem>
          <SelectItem value="confirmed">Confirmados</SelectItem>
          <SelectItem value="ready">Listos</SelectItem>
          <SelectItem value="completed">Completados</SelectItem>
          <SelectItem value="cancelled">Cancelados</SelectItem>
        </Select>
        
        <Select 
          value={filters.deliveryType}
          onValueChange={(deliveryType) => onFiltersChange({...filters, deliveryType})}
        >
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
          <SelectItem value="pickup">Recoger</SelectItem>
          <SelectItem value="dine-in">Comer en lugar</SelectItem>
        </Select>
        
        <Button variant="outline" onClick={() => onFiltersChange({})}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
};
```

### **3.2 Enhanced Order Cards con Swipe Actions**

**✅ IMPLEMENTACIÓN:**
```tsx
const OrderCard = ({ order }) => {
  return (
    <SwipeableCard 
      leftAction={{
        icon: <RotateCcw className="w-5 h-5" />,
        label: "Reordenar",
        action: () => reorderItems(order.id),
        color: "blue"
      }}
      rightAction={{
        icon: <Share2 className="w-5 h-5" />,
        label: "Compartir",
        action: () => shareOrder(order),
        color: "green"
      }}
    >
      <Card className="order-card">
        <div className="order-header">
          <div className="order-info">
            <h3 className="order-number">Pedido #{order.id.slice(-8)}</h3>
            <p className="order-date">{formatDate(order.created_at)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        
        <div className="order-content">
          <div className="seller-info">
            <Avatar className="w-8 h-8">
              <AvatarImage src={order.seller.avatar_url} />
              <AvatarFallback>{order.seller.name[0]}</AvatarFallback>
            </Avatar>
            <span className="seller-name">{order.seller.name}</span>
          </div>
          
          <div className="order-items">
            {order.items.slice(0, 3).map(item => (
              <div key={item.id} className="order-item">
                <span>{item.quantity}x {item.product_name}</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <span className="more-items">+{order.items.length - 3} más</span>
            )}
          </div>
          
          <div className="order-footer">
            <div className="total">
              <span className="total-label">Total:</span>
              <span className="total-amount">${order.total}</span>
            </div>
            
            <div className="delivery-info">
              <DeliveryTypeIcon type={order.delivery_type} />
              <span>{getDeliveryTypeLabel(order.delivery_type)}</span>
            </div>
          </div>
        </div>
        
        <div className="order-actions">
          {order.status === 'pending' && (
            <Button variant="destructive" size="sm" onClick={() => cancelOrder(order.id)}>
              Cancelar
            </Button>
          )}
          {order.status === 'completed' && !order.rating && (
            <Button variant="outline" size="sm" onClick={() => openRatingModal(order)}>
              Calificar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => viewOrderDetails(order)}>
            Ver detalles
          </Button>
          {order.tracking_url && (
            <Button variant="outline" size="sm" onClick={() => trackOrder(order.tracking_url)}>
              Rastrear
            </Button>
          )}
        </div>
      </Card>
    </SwipeableCard>
  );
};
```

### **3.3 Quick Reorder Feature**

**✅ IMPLEMENTACIÓN:**
```tsx
const useQuickReorder = () => {
  const { addToCart } = useCart();
  
  const reorderItems = async (orderId: string) => {
    try {
      // Obtener items de la orden
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, products(*)')
        .eq('order_id', orderId);
      
      if (!orderItems) return;
      
      // Verificar disponibilidad
      const availableItems = [];
      const unavailableItems = [];
      
      for (const item of orderItems) {
        if (item.products.stock >= item.quantity) {
          availableItems.push(item);
        } else {
          unavailableItems.push(item);
        }
      }
      
      // Agregar items disponibles al carrito
      for (const item of availableItems) {
        await addToCart(item.product_id, item.quantity);
      }
      
      // Mostrar resultado
      if (unavailableItems.length > 0) {
        toast.warning(
          `${availableItems.length} productos agregados. ${unavailableItems.length} no disponibles.`
        );
      } else {
        toast.success('Todos los productos fueron agregados al carrito');
      }
      
      // Redirect to cart
      router.push('/buyer?tab=cart');
      
    } catch (error) {
      toast.error('Error al reordenar productos');
    }
  };
  
  return { reorderItems };
};
```

---

## 📱 **FASE 4: OPTIMIZACIÓN MOBILE UNIVERSAL** (2-3 días) 🟢

### **4.1 Touch-Friendly Components**

**✅ IMPLEMENTACIÓN:**
```css
/* mobile-touch.css */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

.swipe-card {
  touch-action: pan-x;
  user-select: none;
}

.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 20px 20px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.bottom-sheet.open {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }
  
  .modal-content {
    border-radius: 20px 20px 0 0;
    margin-top: auto;
    min-height: 50vh;
  }
}
```

### **4.2 Gesture Navigation**

**✅ IMPLEMENTACIÓN:**
```tsx
const useSwipeGestures = (onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const minSwipeDistance = 50;
  
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };
  
  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};
```

---

## 🎨 **FASE 5: FEATURES AVANZADAS** (1 semana) 🔵

### **5.1 Sistema de Favoritos**
```tsx
const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const toggleFavorite = async (productId: string) => {
    const isFavorite = favorites.includes(productId);
    
    if (isFavorite) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      
      setFavorites(prev => prev.filter(id => id !== productId));
    } else {
      await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, product_id: productId });
      
      setFavorites(prev => [...prev, productId]);
    }
  };
  
  return { favorites, toggleFavorite };
};
```

### **5.2 Comparador de Productos**
```tsx
const ProductComparison = ({ products }) => {
  return (
    <div className="comparison-table">
      <div className="comparison-header">
        {products.map(product => (
          <div key={product.id} className="product-column">
            <img src={product.image_url} alt={product.name} />
            <h3>{product.name}</h3>
          </div>
        ))}
      </div>
      
      <div className="comparison-rows">
        <ComparisonRow label="Precio" values={products.map(p => `$${p.price}`)} />
        <ComparisonRow label="Rating" values={products.map(p => p.rating)} />
        <ComparisonRow label="Vendedor" values={products.map(p => p.seller_name)} />
        <ComparisonRow label="Stock" values={products.map(p => p.stock)} />
      </div>
    </div>
  );
};
```

---

## 📊 **CRONOGRAMA DETALLADO**

### **Semana 1:**
**Días 1-2:** Fixes críticos BuyerProfile
**Días 3-4:** Sistema de ubicación profesional
**Día 5:** Avatar upload y estadísticas reales

### **Semana 2:**
**Días 1-3:** Refactorización BuyerHome
**Días 4-5:** Filtros avanzados y ProductCard

### **Semana 3:**
**Días 1-2:** Mejoras BuyerOrders
**Días 3-4:** Optimización mobile universal
**Día 5:** Testing y adjustes finales

---

## ✅ **CRITERIOS DE ÉXITO**

### **BuyerProfile:**
- [ ] Sin código de debug en producción
- [ ] Sistema de ubicación funcional con validación
- [ ] Upload de avatar con compresión
- [ ] Estadísticas reales y precisas

### **BuyerHome:**
- [ ] Archivo principal < 300 líneas
- [ ] Filtros avanzados funcionales
- [ ] Productos favoritos implementados
- [ ] Performance mejorado (lazy loading)

### **BuyerOrders:**
- [ ] Filtros y búsqueda funcionales
- [ ] Swipe actions implementadas
- [ ] Quick reorder working
- [ ] Mobile-friendly interface

### **Mobile:**
- [ ] Todos los elementos touch-friendly (≥44px)
- [ ] Gesture navigation funcional
- [ ] Bottom sheets para modales
- [ ] Performance optimizado

---

## 🚀 **SIGUIENTE PASO**

¿Te parece bien este plan completo? ¿Empezamos con la **Fase 1** (fixes críticos de BuyerProfile) que es lo más urgente?

Podemos ir implementando paso a paso, validando cada cambio antes de continuar con el siguiente. ¿Cuál prefieres abordar primero?
