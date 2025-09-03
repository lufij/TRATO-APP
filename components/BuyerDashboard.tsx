import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { OrderProvider } from '../contexts/OrderContext';
import { useBuyerData } from '../hooks/useBuyerData';
import { BuyerHome } from './buyer/BuyerHome';
import { BuyerOrders } from './buyer/BuyerOrders';
import { BuyerProfile } from './buyer/BuyerProfile';
import { BuyerCart } from './buyer/BuyerCart';
import { BuyerCartPage } from './buyer/BuyerCartPage';
import { BuyerCheckout } from './buyer/BuyerCheckout';
import { BuyerNotifications } from './buyer/BuyerNotifications';
import { NotificationManager } from './ui/NotificationManager';
import { useNotificationCount } from './ui/NotificationCenter';
import { BusinessProfile } from './buyer/BusinessProfile';
import { CheckoutFlow } from './buyer/CheckoutFlow';
import { OrderTracking } from './buyer/OrderTracking';
import { CurrentUserStatus } from './CurrentUserStatus';
import { OnlineDriversIndicator } from './OnlineDriversIndicator';
import { 
  Home, 
  ShoppingCart, 
  User, 
  Bell,
  Store,
  LogOut,
  Package,
  X,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

type ViewState = 'dashboard' | 'business-profile' | 'checkout' | 'order-tracking' | 'cart';

export function BuyerDashboard() {
  const { user, signOut } = useAuth();
  const { getCartItemCount } = useCart();
  const notificationCount = useNotificationCount();
  const [currentTab, setCurrentTab] = useState('home');
  const [showCart, setShowCart] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Navigation state for different views
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Handler for when user clicks on a business card
  const handleBusinessClick = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setCurrentView('business-profile');
  };

  // Handler for returning from business profile to dashboard
  const handleBackFromBusiness = () => {
    setCurrentView('dashboard');
    setSelectedBusinessId('');
  };

  // Handler for proceeding to checkout
  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
    setShowCart(false); // Close cart when going to checkout
  };

  // Handler for returning from checkout
  const handleBackFromCheckout = () => {
    setCurrentView('dashboard');
    setCurrentTab('home'); // Return to home tab
  };

  // Handler for when order is created successfully
  const handleOrderCreated = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentView('order-tracking');
  };

  // Handler for viewing order details
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentView('order-tracking');
  };

  // Handler for returning from order tracking
  const handleBackFromOrder = () => {
    setCurrentView('dashboard');
    setCurrentTab('orders'); // Return to orders tab
    setSelectedOrderId('');
  };

  // Render different views based on current state
  if (currentView === 'business-profile') {
    return <BusinessProfile 
      businessId={selectedBusinessId} 
      onBack={handleBackFromBusiness} 
      onShowCart={() => setCurrentView('cart')}
    />;
  }

  if (currentView === 'cart') {
    return (
      <BuyerCartPage 
        onContinueShopping={() => setCurrentView('dashboard')}
        onProceedToCheckout={() => setCurrentView('checkout')}
      />
    );
  }

  if (currentView === 'checkout') {
    return (
      <BuyerCheckout
        onBack={handleBackFromCheckout}
        onComplete={() => {
          setCurrentView('dashboard');
          setCurrentTab('orders');
        }}
      />
    );
  }

  if (currentView === 'order-tracking') {
    return (
      <OrderProvider>
        <OrderTracking 
          orderId={selectedOrderId}
          onBack={handleBackFromOrder}
        />
      </OrderProvider>
    );
  }

  // Main dashboard view
  return (
    <OrderProvider>
      <div className="buyer-dashboard-fix mobile-main-content">
        {/* Mobile-Optimized Header */}
        <header className="mobile-header bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30 mb-2">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo y Saludo - Responsivo */}
              <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                <div className="bg-gradient-to-r from-orange-500 to-green-500 p-1.5 md:p-2 rounded-lg flex-shrink-0">
                  <Store className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="mobile-heading-2 bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent mb-0">
                    TRATO
                  </h1>
                  <p className="mobile-text-small truncate">
                    ¡Hola, {user?.email?.split('@')[0] || 'Usuario'}!
                  </p>
                </div>
              </div>

              {/* Header Actions - Touch Friendly */}
              <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
                {/* Notifications - Móvil optimizado */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="mobile-button-sm relative bg-white hover:bg-orange-50 border-orange-200 p-2 md:px-3"
                >
                  <Bell className="w-4 h-4 md:mr-1" />
                  <span className="hidden md:inline">Alertas</span>
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-2 border-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Badge>
                  )}
                </Button>

                {/* Cart - Móvil optimizado */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCart(!showCart)}
                  className="mobile-button-sm relative bg-white hover:bg-orange-50 border-orange-200 p-2 md:px-3"
                >
                  <ShoppingCart className="w-4 h-4 md:mr-1" />
                  <span className="hidden md:inline">Carrito</span>
                  {getCartItemCount() > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-500 text-white border-2 border-white">
                      {getCartItemCount() > 9 ? '9+' : getCartItemCount()}
                    </Badge>
                  )}
                </Button>
                
                {/* Profile Menu - Mejorado para móvil */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={signOut} 
                  className="mobile-button-sm text-gray-600 hover:text-gray-800 p-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline ml-1">Salir</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile-Optimized Sliding Cart Panel */}
        {showCart && (
          <>
            <div className="mobile-overlay open" onClick={() => setShowCart(false)} />
            <div className="mobile-slide-panel open">
              <div className="mobile-header border-b">
                <div className="flex items-center justify-between">
                  <h2 className="mobile-heading-2 flex items-center gap-2 mb-0">
                    <ShoppingCart className="w-5 h-5" />
                    Mi Carrito
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowCart(false)}
                    className="mobile-button-sm p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto mobile-scroll">
                <BuyerCart 
                  onClose={() => setShowCart(false)}
                  onProceedToCheckout={handleProceedToCheckout}
                />
              </div>
            </div>
          </>
        )}

        {/* Mobile-Optimized Sliding Notifications Panel */}
        {showNotifications && (
          <>
            <div className="mobile-overlay open" onClick={() => setShowNotifications(false)} />
            <div className="mobile-slide-panel open">
              <div className="mobile-header border-b">
                <div className="flex items-center justify-between">
                  <h2 className="mobile-heading-2 flex items-center gap-2 mb-0">
                    <Bell className="w-5 h-5" />
                    Notificaciones
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNotifications(false)}
                    className="mobile-button-sm p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto mobile-scroll p-4">
                <NotificationManager 
                  onClose={() => setShowNotifications(false)}
                />
              </div>
            </div>
          </>
        )}

        {/* Main Content with bottom padding for mobile nav - SAME AS SELLERS */}
        <div className="main-content container mx-auto px-4 py-4 md:py-6" style={{
          paddingBottom: window.innerWidth <= 768 ? '80px' : '24px'
        }}>
          {/* Mobile Navigation - IDENTICAL TO SELLERS */}
          <div className="block md:hidden">
            <div className="mobile-bottom-nav" style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'white',
              borderTop: '2px solid #e5e7eb',
              padding: '12px',
              zIndex: 50,
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'home', label: 'Inicio', icon: Home },
                  { id: 'orders', label: 'Pedidos', icon: Package },
                  { id: 'profile', label: 'Perfil', icon: User }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '8px',
                        borderRadius: '8px',
                        minHeight: '60px',
                        fontSize: '10px',
                        fontWeight: '500',
                        backgroundColor: isActive ? '#fef3c7' : 'transparent',
                        color: isActive ? '#f97316' : '#6b7280',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span style={{ fontSize: '10px', fontWeight: '500', lineHeight: '1.2' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-2/3 mx-auto bg-white border border-gray-200">
                {[
                  { id: 'home', label: 'Inicio', icon: Home },
                  { id: 'orders', label: 'Pedidos', icon: Package },
                  { id: 'profile', label: 'Perfil', icon: User }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger 
                      key={item.id} 
                      value={item.id}
                      className="flex flex-col items-center gap-1 p-4 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 relative"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Desktop Content */}
              <TabsContent value="home" className="space-y-6">
                <BuyerHome 
                  onBusinessClick={handleBusinessClick} 
                  onShowCart={() => setCurrentView('cart')}
                />
              </TabsContent>

              <TabsContent value="orders" className="space-y-6">
                <BuyerOrders onViewOrder={handleViewOrder} />
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <BuyerProfile onShowCart={() => setCurrentView('cart')} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Mobile Content - SAME STRUCTURE AS SELLERS */}
          <div className="block md:hidden">
            {currentTab === 'home' && (
              <BuyerHome 
                onBusinessClick={handleBusinessClick} 
                onShowCart={() => setCurrentView('cart')}
              />
            )}

            {currentTab === 'orders' && (
              <BuyerOrders onViewOrder={handleViewOrder} />
            )}

            {currentTab === 'profile' && (
              <BuyerProfile onShowCart={() => setCurrentView('cart')} />
            )}
          </div>
        </div>

        {/* Mobile-Optimized Success Toast for Orders */}
        {currentView === ('order-tracking' as ViewState) && (
          <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
            <Card className="mobile-card border-green-200 bg-green-50">
              <CardContent className="mobile-card-content">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="mobile-text font-medium text-green-800 mb-1">¡Orden creada exitosamente!</p>
                    <p className="mobile-text-small text-green-600">Puedes seguir el estado de tu pedido aquí</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Indicador de repartidores online */}
        <OnlineDriversIndicator />
      </div>
    </OrderProvider>
  );
}