import React, { useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Crown, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TRATO_GRADIENTS } from '../constants/colors';

export function AdminSetup() {
  const { isRegistering, registrationProgress, registrationStep } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          {/* Header with TRATO branding */}
          <div className="mb-6">
            <div 
              className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-4"
              style={{ background: TRATO_GRADIENTS.primary }}
            >
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent mb-2">
              Panel de Administración TRATO
            </h1>
            <p className="text-gray-600">Configurando acceso administrativo</p>
          </div>

          {/* Status indicator */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-green-500 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              {registrationProgress === 100 ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              )}
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {registrationProgress === 100 ? '¡Configuración Completada!' : 'Configurando Sistema...'}
              </h3>
              
              <p className="text-gray-600">
                {registrationStep || 'Iniciando configuración del administrador...'}
              </p>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={Math.max(0, Math.min(100, registrationProgress || 0))} 
                  className="h-3" 
                />
                <p className="text-sm text-gray-500">
                  {Math.max(0, Math.min(100, registrationProgress || 0))}% completado
                </p>
              </div>
            </div>
          </div>

          {/* Admin privileges notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Privilegios de Administrador</span>
            </div>
            <p className="text-sm text-purple-700">
              Se está configurando tu cuenta con acceso completo al panel de administración de TRATO.
            </p>
          </div>

          {/* Features list */}
          <div className="text-left space-y-3">
            <h4 className="font-semibold text-gray-800 text-center mb-3">Acceso a:</h4>
            <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Gestión completa de usuarios</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Control de negocios y vendedores</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Supervisión de órdenes y entregas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Configuración del sistema</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Analíticas y reportes avanzados</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          {registrationProgress === 100 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                🎉 Redirigiendo al panel de administración...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}