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

    return `Te faltan ${missingRequirements.length} requisitos: ${missingRequirements.join(', ')}.`;
  };

  const Icon = getIcon();

  return (
    <Alert className={`mb-6 ${canDoAction ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <Icon className={`w-5 h-5 ${canDoAction ? 'text-green-600' : 'text-orange-600'}`} />
          <div className="flex-1">
            <h4 className={`font-medium ${canDoAction ? 'text-green-800' : 'text-orange-800'}`}>
              {getTitle()}
            </h4>
            <AlertDescription className={canDoAction ? 'text-green-700' : 'text-orange-700'}>
              {getDescription()}
            </AlertDescription>
            {!canDoAction && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-orange-700 font-medium">
                    {completionPercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <Button 
          onClick={onOpenVerification}
          className={canDoAction ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}
        >
          {canDoAction ? 'Ver Estado' : 'Completar Perfil'}
        </Button>
      </div>
    </Alert>
  );
}
