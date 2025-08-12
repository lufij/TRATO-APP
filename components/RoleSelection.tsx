import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, ShoppingCart, Store, Truck, Users, Star, Clock, MapPin } from 'lucide-react';
import { UserRole } from '../utils/supabase/client';
import { TRATO_COLORS, TRATO_GRADIENTS, getRoleColor } from '../constants/colors';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onBack: () => void;
}

// Role card component with enhanced styling
function RoleCard({ 
  role, 
  icon: Icon, 
  title, 
  description, 
  features, 
  gradient,
  accentColor,
  onSelect 
}: {
  role: UserRole;
  icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  accentColor: string;
  onSelect: (role: UserRole) => void;
}) {
  return (
    <Card className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 cursor-pointer">
      {/* Background gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ background: gradient }}
      />
      
      <CardHeader className="text-center pb-4 relative z-10">
        <div 
          className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110"
          style={{ background: gradient }}
        >
          <Icon className="w-10 h-10 text-white" />
        </div>
        
        <CardTitle className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
          {title}
        </CardTitle>
        
        <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed">
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6 relative z-10">
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                <span className="text-white text-sm">✓</span>
              </div>
              <span className="text-gray-700 group-hover:text-gray-800 transition-colors duration-300">
                {feature}
              </span>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={() => onSelect(role)}
          className="w-full text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group-hover:translate-y-1"
          style={{ 
            background: gradient,
            borderColor: accentColor
          }}
          size="lg"
        >
          <span className="font-semibold">Continuar como {title}</span>
        </Button>
      </CardContent>
    </Card>
  );
}

// Stats component
function StatsSection() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      <div className="text-center p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-orange-200">
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div className="text-2xl font-bold text-orange-600">500+</div>
        <div className="text-sm text-gray-600">Usuarios Activos</div>
      </div>
      
      <div className="text-center p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-green-200">
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-green-400 to-green-500 rounded-xl flex items-center justify-center">
          <Store className="w-6 h-6 text-white" />
        </div>
        <div className="text-2xl font-bold text-green-600">150+</div>
        <div className="text-sm text-gray-600">Negocios Locales</div>
      </div>
      
      <div className="text-center p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-orange-200">
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Star className="w-6 h-6 text-white" />
        </div>
        <div className="text-2xl font-bold text-orange-600">4.8</div>
        <div className="text-sm text-gray-600">Calificación</div>
      </div>
      
      <div className="text-center p-6 bg-white/70 backdrop-blur-sm rounded-xl border border-green-200">
        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div className="text-2xl font-bold text-green-600">30min</div>
        <div className="text-sm text-gray-600">Entrega Promedio</div>
      </div>
    </div>
  );
}

export function RoleSelection({ onSelectRole, onBack }: RoleSelectionProps) {
  const roles = [
    {
      role: 'comprador' as UserRole,
      icon: ShoppingCart,
      title: 'Comprador',
      description: 'Explora productos locales, haz pedidos fácilmente y recibe entregas rápidas en tu domicilio.',
      features: [
        'Navegación fácil de productos locales',
        'Carrito de compras inteligente',
        'Seguimiento de pedidos en tiempo real',
        'Múltiples opciones de entrega',
        'Sistema de calificaciones y reseñas',
        'Promociones y descuentos exclusivos'
      ],
      gradient: TRATO_GRADIENTS.orangeGlow,
      accentColor: TRATO_COLORS.orange[500]
    },
    {
      role: 'vendedor' as UserRole,
      icon: Store,
      title: 'Vendedor',
      description: 'Promociona tu negocio, gestiona tu inventario y llega a más clientes en tu comunidad.',
      features: [
        'Panel de control completo para tu negocio',
        'Gestión avanzada de inventario',
        'Herramientas de promoción y marketing',
        'Análisis detallado de ventas',
        'Comunicación directa con clientes',
        'Sistema de pagos seguro y confiable'
      ],
      gradient: TRATO_GRADIENTS.greenGlow,
      accentColor: TRATO_COLORS.green[500]
    },
    {
      role: 'repartidor' as UserRole,
      icon: Truck,
      title: 'Repartidor',
      description: 'Genera ingresos adicionales con entregas flexibles y un sistema de pagos confiable.',
      features: [
        'Horarios flexibles de trabajo',
        'Optimización automática de rutas',
        'Pagos seguros y puntuales',
        'Seguimiento GPS en tiempo real',
        'Soporte 24/7 para repartidores',
        'Bonificaciones por buen desempeño'
      ],
      gradient: TRATO_GRADIENTS.sunset,
      accentColor: TRATO_COLORS.orange[600]
    }
  ];

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
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </Button>
            
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: TRATO_GRADIENTS.primary }}
              >
                <Store className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                  TRATO
                </h1>
                <p className="text-sm text-gray-600">Mercado Local Gualán</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span className="text-sm">Gualán, Guatemala</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Elige tu{' '}
              <span 
                className="bg-gradient-to-r bg-clip-text text-transparent"
                style={{ backgroundImage: TRATO_GRADIENTS.primary }}
              >
                experiencia
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Únete a la comunidad de comercio local más vibrante de Gualán. 
              Selecciona el rol que mejor se adapte a tus necesidades.
            </p>
          </div>

          {/* Stats Section */}
          <StatsSection />

          {/* Role Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {roles.map((roleData) => (
              <RoleCard
                key={roleData.role}
                role={roleData.role}
                icon={roleData.icon}
                title={roleData.title}
                description={roleData.description}
                features={roleData.features}
                gradient={roleData.gradient}
                accentColor={roleData.accentColor}
                onSelect={onSelectRole}
              />
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-16 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                ¿Necesitas ayuda para decidir?
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Cada rol en TRATO tiene beneficios únicos. Puedes cambiar tu tipo de cuenta más tarde 
                o incluso tener múltiples roles según tus necesidades.
              </p>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <ShoppingCart className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-medium text-orange-800">Compradores</p>
                  <p className="text-orange-700">Ideal para familias y personas que buscan productos locales frescos</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <Store className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Vendedores</p>
                  <p className="text-green-700">Perfecto para negocios locales que quieren expandir su alcance</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <Truck className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-medium text-orange-800">Repartidores</p>
                  <p className="text-orange-700">Excelente para generar ingresos adicionales con horarios flexibles</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-gray-200 mt-16">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 TRATO - Mercado Local Gualán. Todos los derechos reservados.</p>
            <p className="text-sm mt-2">Fortaleciendo el comercio local con tecnología moderna</p>
          </div>
        </footer>
      </div>
    </div>
  );
}