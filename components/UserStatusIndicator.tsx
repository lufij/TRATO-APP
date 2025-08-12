import React from 'react';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

type UserStatus = 'online' | 'offline' | 'away';

interface UserStatusIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function UserStatusIndicator({ 
  status, 
  size = 'sm', 
  showText = false, 
  className 
}: UserStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      text: 'En línea',
      variant: 'default' as const
    },
    away: {
      color: 'bg-yellow-500',
      text: 'Ausente',
      variant: 'secondary' as const
    },
    offline: {
      color: 'bg-gray-400',
      text: 'Desconectado',
      variant: 'outline' as const
    }
  };

  const config = statusConfig[status];

  if (showText) {
    return (
      <Badge variant={config.variant} className={cn('flex items-center gap-1', className)}>
        <div className={cn('rounded-full', config.color, sizeClasses[size])} />
        <span className="text-xs">{config.text}</span>
      </Badge>
    );
  }

  return (
    <div 
      className={cn(
        'rounded-full border-2 border-white',
        config.color,
        sizeClasses[size],
        className
      )}
      title={config.text}
    />
  );
}

// Status context provider for easy access throughout the app
interface UserStatusContextType {
  getUserStatus: (userId: string) => UserStatus;
  setUserStatus: (userId: string, status: UserStatus) => void;
  isUserOnline: (userId: string) => boolean;
}

const UserStatusContext = React.createContext<UserStatusContextType | undefined>(undefined);

export function UserStatusProvider({ children }: { children: React.ReactNode }) {
  const [userStatuses, setUserStatuses] = React.useState<Record<string, UserStatus>>({});

  const getUserStatus = React.useCallback((userId: string): UserStatus => {
    return userStatuses[userId] || 'offline';
  }, [userStatuses]);

  const setUserStatus = React.useCallback((userId: string, status: UserStatus) => {
    setUserStatuses(prev => ({
      ...prev,
      [userId]: status
    }));
  }, []);

  const isUserOnline = React.useCallback((userId: string): boolean => {
    return getUserStatus(userId) === 'online';
  }, [getUserStatus]);

  const value: UserStatusContextType = {
    getUserStatus,
    setUserStatus,
    isUserOnline
  };

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  );
}

export function useUserStatusContext() {
  const context = React.useContext(UserStatusContext);
  if (context === undefined) {
    throw new Error('useUserStatusContext must be used within a UserStatusProvider');
  }
  return context;
}