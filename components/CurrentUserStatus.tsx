import React from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { UserStatusIndicator } from './UserStatusIndicator';
import { useUserStatus } from '../hooks/useUserStatus';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, Wifi, WifiOff, Clock } from 'lucide-react';

interface CurrentUserStatusProps {
  className?: string;
}

export function CurrentUserStatus({ className }: CurrentUserStatusProps) {
  const { user } = useAuth();
  const { currentStatus, setStatus, isStatusAvailable } = useUserStatus();

  if (!user || !isStatusAvailable) {
    return null;
  }

  const statusOptions = [
    {
      value: 'online' as const,
      label: 'En línea',
      icon: Wifi,
      description: 'Disponible para chat'
    },
    {
      value: 'away' as const,
      label: 'Ausente',
      icon: Clock,
      description: 'Temporalmente no disponible'
    },
    {
      value: 'offline' as const,
      label: 'Desconectado',
      icon: WifiOff,
      description: 'No disponible para chat'
    }
  ];

  const currentStatusConfig = statusOptions.find(opt => opt.value === currentStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center gap-2 ${className}`}
        >
          <UserStatusIndicator status={currentStatus} size="sm" />
          <span className="text-sm">{currentStatusConfig?.label}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setStatus(option.value)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <UserStatusIndicator status={option.value} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  <Icon className="h-3 w-3 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
              {currentStatus === option.value && (
                <div className="h-2 w-2 bg-orange-500 rounded-full" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}