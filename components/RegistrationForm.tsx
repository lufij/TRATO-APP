import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../utils/supabase/client';
import { ArrowLeft, ShoppingBag, Store, Truck, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface RegistrationFormProps {
  role: UserRole;
  onBack: () => void;
}

export function RegistrationForm({ role, onBack }: RegistrationFormProps) {
  const { signUp, loading, isRegistering, registrationProgress } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
    businessDescription: '',
    vehicleType: '',
    licenseNumber: '',
  });
  const [error, setError] = useState('');

  const totalSteps = role === 'comprador' ? 2 : 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.name && formData.email && formData.password && 
               formData.password === formData.confirmPassword && formData.password.length >= 6;
      case 2:
        if (role === 'comprador') return true;
        if (role === 'vendedor') return formData.businessName;
        if (role === 'repartidor') return formData.vehicleType && formData.licenseNumber;
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError('');
      setCurrentStep(prev => prev + 1);
    } else {
      setError('Por favor completa todos los campos requeridos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (role === 'vendedor' && !formData.businessName) {
      setError('El nombre del negocio es requerido para vendedores');
      return;
    }

    if (role === 'repartidor' && (!formData.vehicleType || !formData.licenseNumber)) {
      setError('El tipo de vehículo y número de licencia son requeridos para repartidores');
      return;
    }

    try {
      const result = await signUp(formData.email, formData.password, {
        name: formData.name,
        role,
        phone: formData.phone,
        businessName: formData.businessName,
        businessDescription: formData.businessDescription,
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber,
      });

      if (!result.success) {
        setError(result.error || 'Error al registrar usuario');
      }
      // If successful, the AuthContext will handle the redirect automatically
    } catch (error) {
      setError('Ocurrió un error inesperado');
    }
  };

  const getRoleInfo = () => {
    switch (role) {
      case 'comprador':
        return {
          title: 'Registro como Comprador',
          icon: <ShoppingBag className="w-6 h-6" />,
          description: 'Descubre y compra productos locales',
          color: 'from-blue-500 to-blue-600'
        };
      case 'vendedor':
        return {
          title: 'Registro como Vendedor',
          icon: <Store className="w-6 h-6" />,
          description: 'Vende tus productos y haz crecer tu negocio',
          color: 'from-green-500 to-green-600'
        };
      case 'repartidor':
        return {
          title: 'Registro como Repartidor',
          icon: <Truck className="w-6 h-6" />,
          description: 'Genera ingresos entregando pedidos',
          color: 'from-orange-500 to-orange-600'
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-lg">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          disabled={loading || isRegistering}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className={`bg-gradient-to-r ${roleInfo.color} p-3 rounded-full w-16 h-16 mx-auto mb-4`}>
              <div className="text-white">
                {roleInfo.icon}
              </div>
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              {roleInfo.title}
            </CardTitle>
            <p className="text-gray-600">{roleInfo.description}</p>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Paso {currentStep} de {totalSteps}</span>
                <span>{Math.round(progress)}% completado</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Show registration progress if registering */}
              {isRegistering && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-800">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando registro ({registrationProgress}%)
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Información Personal */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Información Personal</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Tu nombre completo"
                      required
                      disabled={loading || isRegistering}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tu@email.com"
                      required
                      disabled={loading || isRegistering}
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
                      disabled={loading || isRegistering}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        required
                        disabled={loading || isRegistering}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading || isRegistering}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Repite tu contraseña"
                        required
                        disabled={loading || isRegistering}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading || isRegistering}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-sm text-red-600">Las contraseñas no coinciden</p>
                  )}
                </div>
              )}

              {/* Step 2: Información Específica del Rol */}
              {currentStep === 2 && role !== 'comprador' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">
                    {role === 'vendedor' ? 'Información del Negocio' : 'Información del Vehículo'}
                  </h3>
                  
                  {role === 'vendedor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Nombre del negocio *</Label>
                        <Input
                          id="businessName"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          placeholder="Nombre de tu negocio"
                          required
                          disabled={loading || isRegistering}
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
                          disabled={loading || isRegistering}
                        />
                      </div>
                    </>
                  )}

                  {role === 'repartidor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleType">Tipo de vehículo *</Label>
                        <Select 
                          onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
                          disabled={loading || isRegistering}
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
                          disabled={loading || isRegistering}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Confirmación (solo para compradores en step 2) */}
              {currentStep === 2 && role === 'comprador' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">¡Listo para comenzar!</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3 font-medium">
                      🎉 ¡Tu cuenta está lista! Como comprador tendrás acceso a:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Catálogo completo de productos locales</li>
                      <li>• Entregas rápidas a domicilio</li>
                      <li>• Seguimiento en tiempo real</li>
                      <li>• Soporte al cliente 24/7</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✨ Al crear tu cuenta, accederás inmediatamente a tu dashboard
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={loading || isRegistering}
                  >
                    Anterior
                  </Button>
                )}
                
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!validateStep(currentStep) || loading || isRegistering}
                    className="ml-auto"
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={loading || isRegistering}
                    className="ml-auto bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600"
                  >
                    {loading || isRegistering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Crear Cuenta
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}