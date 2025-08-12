import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserRole } from '../utils/supabase/client';
import { 
  AlertTriangle, 
  User, 
  RefreshCw, 
  LogOut,
  ShoppingBag,
  Store,
  Truck,
  Save,
  Trash2,
  AlertCircle
} from 'lucide-react';

export function ProfileRecovery() {
  const { orphanedUser, createMissingProfile, signOut, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    businessDescription: '',
    vehicleType: '',
    licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedRole) {
      setError('Por favor selecciona tu rol');
      return;
    }

    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (selectedRole === 'vendedor' && !formData.businessName.trim()) {
      setError('El nombre del negocio es requerido para vendedores');
      return;
    }

    if (selectedRole === 'repartidor' && (!formData.vehicleType || !formData.licenseNumber.trim())) {
      setError('El tipo de vehículo y número de licencia son requeridos para repartidores');
      return;
    }

    setIsCreating(true);

    try {
      const result = await createMissingProfile({
        name: formData.name,
        role: selectedRole,
        phone: formData.phone,
        businessName: formData.businessName,
        businessDescription: formData.businessDescription,
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber,
      });

      if (!result.success) {
        setError(result.error || 'Error al crear el perfil');
      }
      // If successful, the AuthContext will handle the redirect automatically
    } catch (error) {
      console.error('Error during profile recovery:', error);
      setError('Ocurrió un error inesperado al recuperar el perfil');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEmergencySignOut = async () => {
    try {
      // Clear all local storage related to auth
      localStorage.clear();
      sessionStorage.clear();
      
      // Force sign out
      await signOut();
      
      // Reload the page to clear any stuck state
      window.location.reload();
    } catch (error) {
      console.error('Error during emergency sign out:', error);
      // Force reload anyway
      window.location.reload();
    }
  };

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'comprador':
        return {
          title: 'Comprador',
          icon: <ShoppingBag className="w-5 h-5" />,
          description: 'Descubre y compra productos locales',
          color: 'from-blue-500 to-blue-600'
        };
      case 'vendedor':
        return {
          title: 'Vendedor',
          icon: <Store className="w-5 h-5" />,
          description: 'Vende tus productos y haz crecer tu negocio',
          color: 'from-green-500 to-green-600'
        };
      case 'repartidor':
        return {
          title: 'Repartidor',
          icon: <Truck className="w-5 h-5" />,
          description: 'Genera ingresos entregando pedidos',
          color: 'from-orange-500 to-orange-600'
        };
    }
  };

  if (!orphanedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se detectó usuario huérfano
            </h3>
            <p className="text-gray-600 mb-6">
              No hay información de usuario autenticado para recuperar.
            </p>
            <Button onClick={() => window.location.reload()}>
              Recargar Aplicación
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-yellow-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Recuperación de Perfil</h1>
                <p className="text-sm text-gray-600">Completa tu perfil para continuar</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={signOut}
                className="text-gray-600 border-gray-300"
                disabled={isCreating}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEmergencySignOut}
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isCreating}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar Todo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Explanation Card */}
        <Card className="mb-6 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <User className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  ¿Qué está pasando?
                </h3>
                <p className="text-gray-700 mb-3">
                  Tu cuenta <strong>({orphanedUser?.email})</strong> está autenticada pero necesita completar 
                  la información del perfil. Esto puede pasar si:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Te registraste antes de que la base de datos estuviera configurada</li>
                  <li>• Hubo un error durante el registro inicial</li>
                  <li>• Tu perfil se perdió por una actualización del sistema</li>
                  <li>• La tabla 'users' no existe en la base de datos</li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Solución:</strong> Completa la información abajo para recuperar tu cuenta, 
                    o usa "Limpiar Todo" para empezar completamente de nuevo.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Actions */}
        <Card className="mb-6 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-800">¿No funciona la recuperación?</h4>
                <p className="text-sm text-red-600">
                  Si hay problemas con la base de datos, puedes limpiar todo y empezar de nuevo.
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={handleEmergencySignOut}
                disabled={isCreating}
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar y Reiniciar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recovery Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Completar Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-4">
                <Label>Selecciona tu rol *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['comprador', 'vendedor', 'repartidor'] as UserRole[]).map((role) => {
                    const roleInfo = getRoleInfo(role);
                    return (
                      <Card 
                        key={role}
                        className={`cursor-pointer transition-all border-2 ${
                          selectedRole === role 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedRole(role)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className={`bg-gradient-to-r ${roleInfo.color} p-3 rounded-full w-12 h-12 mx-auto mb-3`}>
                            <div className="text-white">
                              {roleInfo.icon}
                            </div>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {roleInfo.title}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {roleInfo.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre completo"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+502 1234-5678"
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Role-specific fields */}
              {selectedRole === 'vendedor' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nombre del negocio *</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="Nombre de tu negocio"
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">Descripción del negocio</Label>
                    <Textarea
                      id="businessDescription"
                      value={formData.businessDescription}
                      onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                      placeholder="Describe tu negocio y productos"
                      rows={3}
                      disabled={isCreating}
                    />
                  </div>
                </div>
              )}

              {selectedRole === 'repartidor' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Tipo de vehículo *</Label>
                    <Select 
                      onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                      disabled={isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bicicleta">🚲 Bicicleta</SelectItem>
                        <SelectItem value="motocicleta">🏍️ Motocicleta</SelectItem>
                        <SelectItem value="carro">🚗 Carro</SelectItem>
                        <SelectItem value="camioneta">🚚 Camioneta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Número de licencia *</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="Número de licencia de conducir"
                      required
                      disabled={isCreating}
                    />
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    {error.includes('table') && (
                      <div className="mt-2 p-2 bg-red-50 rounded">
                        <p className="text-xs text-red-700">
                          <strong>Sugerencia:</strong> Parece que la base de datos no está configurada. 
                          Usa "Limpiar Todo" y luego configura Supabase siguiendo las instrucciones.
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading || isCreating}
                className="w-full bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                size="lg"
              >
                {loading || isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Recuperando perfil...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Recuperar Mi Cuenta
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Alternative Actions */}
        <div className="mt-6 text-center space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              ¿Prefieres empezar completamente desde cero?
            </p>
            <Button 
              variant="outline" 
              onClick={handleEmergencySignOut}
              className="text-red-600 border-red-300 hover:bg-red-50"
              disabled={isCreating}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Cuenta y Empezar de Nuevo
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 max-w-md mx-auto">
            <p>
              Al hacer clic en "Limpiar Todo" se eliminará toda la información de sesión 
              y podrás registrarte nuevamente desde cero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}