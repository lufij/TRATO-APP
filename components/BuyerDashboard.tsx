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
import { BuyerNotifications } from './buyer/BuyerNotifications';
import { BusinessProfile } from './buyer/BusinessProfile';
import { CheckoutFlow } from './buyer/CheckoutFlow';
import { OrderTracking } from './buyer/OrderTracking';
import { CurrentUserStatus } from './CurrentUserStatus';
import { 
  Home, 
  ShoppingCart, 
  User, 
  Bell,
  Store,
  LogOut,
  X,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

type ViewState = 'dashboard' | 'business-profile' | 'checkout' | 'order-tracking';

export function BuyerDashboard() {
  const { user, signOut } = useAuth();
  const { getCartItemCount } = useCart();
  const [currentTab, setCurrentTab] = useState('home');
  const [showCart, setShowCart] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
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
    return <BusinessProfile businessId={selectedBusinessId} onBack={handleBackFromBusiness} />;
  }

  if (currentView === 'checkout') {
    return (
      <OrderProvider>
        <CheckoutFlow 
          onBack={handleBackFromCheckout}
          onOrderCreated={handleOrderCreated}
        />
      </OrderProvider>
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
        {/* Fixed Header */}
        <header className="bg-white shadow-lg border-b border-orange-100 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo y Saludo */}
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
              
              {/* Actions */}
              <div className="flex items-center space-x-3">
                {/* User Status */}
                <CurrentUserStatus />
                
                {/* Notifications */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative bg-white hover:bg-orange-50 border-orange-200"
                >
                  <Bell className="w-4 h-4" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs bg-red-500">
                      {notificationCount}
                    </Badge>
                  )}
                </Button>

                {/* Cart */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCart(!showCart)}
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
                
                {/* Profile Menu */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={signOut} 
                  className="text-gray-600 hover:text-gray-800"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Sliding Cart Panel */}
        {showCart && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCart(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Mi Carrito
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-full overflow-hidden">
                <BuyerCart 
                  onClose={() => setShowCart(false)}
                  onProceedToCheckout={handleProceedToCheckout}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sliding Notifications Panel */}
        {showNotifications && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificaciones
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-full overflow-hidden">
                <BuyerNotifications 
                  onClose={() => setShowNotifications(false)}
                  onNotificationCountChange={setNotificationCount}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
            {/* Navigation Tabs */}
            <TabsList className="grid w-full grid-cols-3 lg:w-96 mx-auto bg-white border border-orange-200 shadow-lg">
              <TabsTrigger 
                value="home" 
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 font-medium"
              >
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 font-medium"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Pedidos
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 font-medium"
              >
                <User className="w-4 h-4 mr-2" />
                Perfil
              </TabsTrigger>
            </TabsList>

            {/* Tab Contents */}
            <TabsContent value="home" className="space-y-6">
              <BuyerHome onBusinessClick={handleBusinessClick} />
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <BuyerOrders onViewOrder={handleViewOrder} />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <BuyerProfile />
            </TabsContent>
          </Tabs>
        </div>

        {/* Success Toast for Orders */}
  {currentView === ('order-tracking' as ViewState) && (
          <div className="fixed top-4 right-4 z-50">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">¡Orden creada exitosamente!</p>
                    <p className="text-sm text-green-600">Puedes seguir el estado de tu pedido aquí</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </OrderProvider>
  );
}