import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, Eye, EyeOff, Mail, Lock, MapPin, Store, Truck, Users, Star, Clock, Shield } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { TRATO_COLORS, TRATO_GRADIENTS } from '../constants/colors';

interface WelcomeScreenProps {
  onRegisterClick: () => void;
}

// Hero icons component
function HeroIcon({ icon: Icon, gradient, title, description }: {
  icon: React.ElementType;
  gradient: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
        style={{ background: gradient }}
      >
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

// Feature card component
function FeatureCard({ icon: Icon, title, description, color }: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-start space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 hover:bg-white/80 transition-all duration-300">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h4 className="font-medium text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

export function WelcomeScreen({ onRegisterClick }: WelcomeScreenProps) {
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animated counter
  const [stats, setStats] = useState({ users: 0, orders: 0, businesses: 0 });

  useEffect(() => {
    const animateStats = () => {
      const targetUsers = 500;
      const targetOrders = 1200;
      const targetBusinesses = 150;
      
      let currentUsers = 0;
      let currentOrders = 0;
      let currentBusinesses = 0;
      
      const interval = setInterval(() => {
        if (currentUsers < targetUsers) currentUsers += Math.ceil(targetUsers / 50);
        if (currentOrders < targetOrders) currentOrders += Math.ceil(targetOrders / 50);
        if (currentBusinesses < targetBusinesses) currentBusinesses += Math.ceil(targetBusinesses / 50);
        
        setStats({
          users: Math.min(currentUsers, targetUsers),
          orders: Math.min(currentOrders, targetOrders),
          businesses: Math.min(currentBusinesses, targetBusinesses)
        });
        
        if (currentUsers >= targetUsers && currentOrders >= targetOrders && currentBusinesses >= targetBusinesses) {
          clearInterval(interval);
        }
      }, 100);
      
      return () => clearInterval(interval);
    };
    
    const timeout = setTimeout(animateStats, 1000);
    return () => clearTimeout(timeout);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn(formData.email.trim(), formData.password);
      if (res.success) {
        toast.success('¡Bienvenido a TRATO!');
      } else {
        toast.error(`No se pudo iniciar sesión${res.error ? ': ' + res.error : ''}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error inesperado al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20"
          style={{ background: TRATO_GRADIENTS.orangeGlow }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20"
          style={{ background: TRATO_GRADIENTS.greenGlow }}
        />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping" />
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-orange-300 rounded-full animate-bounce" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-white">
                <img 
                  src="/assets/trato-logo.png" 
                  alt="TRATO Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                  TRATO
                </h1>
                <p className="text-sm text-gray-600">Mercado Local Gualán</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Gualán, Guatemala</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm">24/7 Disponible</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-green-100 px-4 py-2 rounded-full">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Plataforma Segura y Confiable</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="text-gray-800">Tu mercado local</span>
                  <br />
                  <span 
                    className="bg-gradient-to-r bg-clip-text text-transparent"
                    style={{ 
                      backgroundImage: TRATO_GRADIENTS.primary 
                    }}
                  >
                    en Gualán
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                  Conectamos compradores, vendedores y repartidores en una plataforma moderna 
                  para impulsar el comercio local con entregas rápidas y seguras.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.users}+</div>
                  <div className="text-sm text-gray-600">Usuarios Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.orders}+</div>
                  <div className="text-sm text-gray-600">Órdenes Completadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.businesses}+</div>
                  <div className="text-sm text-gray-600">Negocios Locales</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center sm:justify-start">
                <Button 
                  onClick={onRegisterClick}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Crear Cuenta Gratis
                </Button>
              </div>
            </div>

            {/* Right side - Login Card */}
            <div className="relative">
              <Card className="bg-white/90 backdrop-blur-sm shadow-2xl border-0 relative z-10">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-800">
                    Iniciar Sesión
                  </CardTitle>
                  <p className="text-gray-600">Accede a tu cuenta TRATO</p>
                </CardHeader>
                
                <CardContent className="space-y-6">

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">
                        Correo Electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="tu@email.com"
                          className="pl-10 border-2 border-gray-200 focus:border-orange-400 transition-colors duration-300"
                          disabled={loading || isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-700 font-medium">
                        Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className="pl-10 pr-12 border-2 border-gray-200 focus:border-orange-400 transition-colors duration-300"
                          disabled={loading || isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      disabled={loading || isSubmitting}
                      size="lg"
                    >
                      {loading || isSubmitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Iniciando sesión...
                        </div>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>
                  </form>

                  <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-gray-600">
                      ¿No tienes cuenta?{' '}
                      <Button 
                        variant="link" 
                        onClick={onRegisterClick}
                        className="text-orange-600 hover:text-orange-700 font-semibold p-0 h-auto"
                      >
                        Regístrate aquí
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              ¿Por qué elegir TRATO?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Una plataforma completa diseñada para fortalecer el comercio local en Gualán
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <HeroIcon
              icon={Users}
              gradient={TRATO_GRADIENTS.orangeGlow}
              title="Para Compradores"
              description="Explora productos locales, haz pedidos fácilmente y recibe entregas rápidas en tu domicilio."
            />
            <HeroIcon
              icon={Store}
              gradient={TRATO_GRADIENTS.greenGlow}
              title="Para Vendedores"
              description="Promociona tu negocio, gestiona inventario y llega a más clientes en tu comunidad."
            />
            <HeroIcon
              icon={Truck}
              gradient={TRATO_GRADIENTS.sunset}
              title="Para Repartidores"
              description="Genera ingresos adicionales con entregas flexibles y un sistema de pagos confiable."
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={MapPin}
              title="Cobertura Local"
              description="Enfocados exclusivamente en Gualán para un servicio personalizado"
              color={TRATO_COLORS.orange[500]}
            />
            <FeatureCard
              icon={Clock}
              title="Entregas Rápidas"
              description="Sistema eficiente de logística con tiempos de entrega optimizados"
              color={TRATO_COLORS.green[500]}
            />
            <FeatureCard
              icon={Shield}
              title="Pagos Seguros"
              description="Transacciones protegidas con múltiples métodos de pago"
              color={TRATO_COLORS.orange[600]}
            />
            <FeatureCard
              icon={Star}
              title="Calidad Garantizada"
              description="Sistema de calificaciones y reseñas para mantener altos estándares"
              color={TRATO_COLORS.green[600]}
            />
            <FeatureCard
              icon={Users}
              title="Comunidad Activa"
              description="Red creciente de negocios y usuarios comprometidos"
              color={TRATO_COLORS.orange[500]}
            />
            <FeatureCard
              icon={Truck}
              title="Logística Inteligente"
              description="Optimización de rutas y gestión eficiente de entregas"
              color={TRATO_COLORS.green[500]}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 TRATO - Mercado Local Gualán. Todos los derechos reservados.</p>
            <p className="text-sm mt-2">Fortaleciendo el comercio local con tecnología moderna</p>
            <p className="text-xs mt-1 text-gray-500">Aplicación creada por Luis Interiano</p>
          </div>
        </footer>
      </div>
    </div>
  );
}