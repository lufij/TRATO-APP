import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertTriangle, MapPin, User, Truck } from 'lucide-react';
import { useVerificationStatus } from '../hooks/useVerificationStatus';

interface VerificationAlertProps {
  userRole: 'comprador' | 'vendedor' | 'repartidor';
  onOpenVerification: () => void;
  showIfComplete?: boolean;
}

export function VerificationAlert({ userRole, onOpenVerification, showIfComplete = false }: VerificationAlertProps) {
  const { status, loading, canPerformMainAction, getMissingRequirements, getCompletionPercentage } = useVerificationStatus(userRole);

  if (loading) return null;

  const canDoAction = canPerformMainAction();
  const missingRequirements = getMissingRequirements();
  const completionPercentage = getCompletionPercentage();

  // No mostrar si está completo y showIfComplete es false
  if (canDoAction && !showIfComplete) return null;

  const getIcon = () => {
    switch (userRole) {
      case 'vendedor':
        return User;
      case 'comprador':
        return MapPin;
      case 'repartidor':
        return Truck;
      default:
        return AlertTriangle;
    }
  };

  const getTitle = () => {
    if (canDoAction) {
      switch (userRole) {
        case 'vendedor':
          return '¡Perfil completo! Puedes publicar productos';
        case 'comprador':
          return '¡Perfil completo! Puedes realizar compras';
        case 'repartidor':
          return '¡Perfil completo! Puedes tomar órdenes';
        default:
          return '¡Perfil completo!';
      }
    }

    switch (userRole) {
      case 'vendedor':
        return 'Completa tu perfil para publicar productos';
      case 'comprador':
        return 'Completa tu perfil para realizar compras';
      case 'repartidor':
        return 'Completa tu perfil para trabajar como repartidor';
      default:
        return 'Completa tu perfil';
    }
  };

  const getDescription = () => {
    if (canDoAction) {
      return 'Tu perfil está completamente verificado y puedes usar todas las funciones de TRATO.';
    }

    if (missingRequirements.length === 0) {
      return 'Casi listo, solo faltan algunos detalles por verificar.';
    }

    if (missingRequirements.length === 1) {
      return `Te falta 1 requisito: ${missingRequirements[0]}.`;
    }

    return `Te faltan ${missingRequirements.length} requisitos: ${missingRequirements.slice(0, 2).join(', ')}${missingRequirements.length > 2 ? ' y más...' : ''}.`;
  };

  const Icon = getIcon();

  return (
    <Alert className={`verification-alert mb-6 ${canDoAction ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      {/* Vista Mobile Optimizada */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 w-full">
        {/* Encabezado con icono y título */}
        <div className="flex items-start space-x-3">
          <Icon className={`w-6 h-6 flex-shrink-0 mt-1 ${canDoAction ? 'text-green-600' : 'text-orange-600'}`} />
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-lg leading-tight ${canDoAction ? 'text-green-800' : 'text-orange-800'}`}>
              {getTitle()}
            </h4>
            <AlertDescription className={`alert-description mt-1 text-sm ${canDoAction ? 'text-green-700' : 'text-orange-700'}`}>
              {getDescription()}
            </AlertDescription>
            
            {/* Barra de progreso y porcentaje */}
            {!canDoAction && (
              <div className="verification-progress mt-3 space-y-2">
                <div className="verification-progress-label flex items-center justify-between">
                  <span className="text-xs font-medium text-orange-800">Progreso del perfil</span>
                  <span className="text-sm font-bold text-orange-700">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="verification-progress-bar w-full bg-orange-200 rounded-full h-3">
                  <div 
                    className="bg-orange-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Botón de acción */}
        <div className="flex justify-center md:justify-end mt-4 md:mt-0 md:ml-4">
          <Button 
            onClick={onOpenVerification}
            className={`verification-button px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 ${
              canDoAction 
                ? 'bg-green-500 hover:bg-green-600 hover:shadow-green-200' 
                : 'bg-orange-500 hover:bg-orange-600 hover:shadow-orange-200'
            }`}
            style={{
              minWidth: '160px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {canDoAction ? 'Ver Estado' : 'Completar Perfil'}
          </Button>
        </div>
      </div>
    </Alert>
  );
}
