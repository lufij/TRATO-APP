import { Product } from '../../../utils/supabase/client';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  viewMode: 'grid' | 'list';
  cartItems: any[];
  onAddToCart: (productId: string, isDaily?: boolean, productName?: string) => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onImageClick: (imageUrl: string) => void;
  onBusinessClick: (businessId: string) => void;
  addingToCart: string | null;
  editingQuantity: string | null;
  tempQuantity: string;
  onQuantityClick: (productId: string, currentQuantity: number) => void;
  onQuantityChange: (value: string) => void;
  onQuantitySubmit: (productId: string) => void;
  onQuantityKeyDown: (e: React.KeyboardEvent, productId: string) => void;
  loading?: boolean;
}

export function ProductGrid({
  products,
  viewMode,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onImageClick,
  onBusinessClick,
  addingToCart,
  editingQuantity,
  tempQuantity,
  onQuantityClick,
  onQuantityChange,
  onQuantitySubmit,
  onQuantityKeyDown,
  loading = false
}: ProductGridProps) {
  
  const getCartItemQuantity = (productId: string) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-8 8-4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
        <p className="text-gray-500">Intenta cambiar los filtros de búsqueda o revisa más tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid Layout */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              cartQuantity={getCartItemQuantity(product.id)}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
              onImageClick={onImageClick}
              onBusinessClick={onBusinessClick}
              addingToCart={addingToCart === product.id}
              editingQuantity={editingQuantity === product.id}
              tempQuantity={tempQuantity}
              onQuantityClick={onQuantityClick}
              onQuantityChange={onQuantityChange}
              onQuantitySubmit={onQuantitySubmit}
              onQuantityKeyDown={onQuantityKeyDown}
            />
          ))}
        </div>
      ) : (
        /* List Layout */
        <div className="space-y-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              cartQuantity={getCartItemQuantity(product.id)}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
              onImageClick={onImageClick}
              onBusinessClick={onBusinessClick}
              addingToCart={addingToCart === product.id}
              editingQuantity={editingQuantity === product.id}
              tempQuantity={tempQuantity}
              onQuantityClick={onQuantityClick}
              onQuantityChange={onQuantityChange}
              onQuantitySubmit={onQuantitySubmit}
              onQuantityKeyDown={onQuantityKeyDown}
            />
          ))}
        </div>
      )}

      {/* Load More Button (para futuro) */}
      {products.length > 0 && products.length % 20 === 0 && (
        <div className="text-center pt-8">
          <button className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
            Cargar más productos
          </button>
        </div>
      )}
    </div>
  );
}
