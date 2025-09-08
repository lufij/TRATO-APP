import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Clock } from 'lucide-react';

interface FloatingNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  orderData?: any;
  duration?: number;
}

interface FloatingNotificationsProps {
  notifications: FloatingNotification[];
  onRemove: (id: string) => void;
}

export function FloatingNotifications({ notifications, onRemove }: FloatingNotificationsProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {notifications.map((notification, index) => (
        <FloatingNotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
          index={index}
        />
      ))}
    </div>
  );
}

function FloatingNotificationItem({ 
  notification, 
  onRemove, 
  index 
}: { 
  notification: FloatingNotification;
  onRemove: (id: string) => void;
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 100 + index * 100);
    
    // Auto-remove después de duration
    const duration = notification.duration || 5000;
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [notification, index]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: isVisible 
          ? '0 8px 25px rgba(0,0,0,0.15)' 
          : '0 4px 12px rgba(0,0,0,0.05)',
        transform: isVisible && !isRemoving 
          ? 'translateX(0) scale(1)' 
          : isRemoving 
            ? 'translateX(100%) scale(0.9)'
            : 'translateX(100%) scale(0.95)',
        opacity: isVisible && !isRemoving ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderLeft: '4px solid #28a745',
        position: 'relative',
        cursor: 'pointer'
      }}
      onClick={handleRemove}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            backgroundColor: '#28a745',
            borderRadius: '50%',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingBag size={14} color="white" />
          </div>
          <strong style={{
            color: '#2d3748',
            fontSize: '15px',
            fontWeight: '600'
          }}>
            {notification.title}
          </strong>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = '1'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = '0.6'}
        >
          <X size={16} color="#666" />
        </button>
      </div>

      {/* Message */}
      <p style={{
        margin: '0 0 8px 0',
        color: '#4a5568',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        {notification.message}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#718096'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Clock size={12} />
          {formatTime(notification.timestamp)}
        </div>

        {notification.orderData && (
          <div style={{
            backgroundColor: '#f7fafc',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '500',
            color: '#2d3748'
          }}>
            ID: #{notification.orderData.id?.toString().slice(-4) || 'N/A'}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        height: '2px',
        backgroundColor: '#28a745',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        animation: `progressBar ${notification.duration || 5000}ms linear forwards`,
        width: '0%'
      }} />

      <style>
        {`
          @keyframes progressBar {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>
    </div>
  );
}

// Hook para manejar notificaciones flotantes
export function useFloatingNotifications() {
  const [notifications, setNotifications] = useState<FloatingNotification[]>([]);

  const addNotification = (notification: Omit<FloatingNotification, 'id' | 'timestamp'>) => {
    const newNotification: FloatingNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Máximo 5 notificaciones
    
    return newNotification.id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
}
