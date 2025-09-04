import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { ShoppingCart, User, LogOut, LogIn, Store } from 'lucide-react';
import { NotificationBell } from '../common/NotificationBell';

export function Header() {
  const { user, signOut, loading } = useAuth();

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-gray-800">
              TRATO
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : user ? (
              <>
                <NotificationBell />
                <Link to="/cart">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-6 w-6" />
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="icon">
                    <User className="h-6 w-6" />
                  </Button>
                </Link>
                {user.role === 'vendedor' && (
                  <Link to="/seller/dashboard">
                    <Button variant="outline">
                      <Store className="mr-2 h-4 w-4" />
                      Mi Tienda
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
