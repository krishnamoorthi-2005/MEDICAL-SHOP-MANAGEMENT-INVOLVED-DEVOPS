import { useEffect, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuthContext();
  const redirectedRef = useRef(false);

  // Check localStorage directly instead of context, since context doesn't update in the same tab
  // when localStorage changes (storage events only fire in OTHER tabs)
  const token = window.localStorage.getItem('token');
  const isAuthenticatedInStorage = window.localStorage.getItem('isAuthenticated') === 'true';
  const isAuthenticated = !!token && isAuthenticatedInStorage;

  useEffect(() => {
    if (isLoading || isAuthenticated || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('isAuthenticated');
    window.localStorage.removeItem('userEmail');
    window.localStorage.removeItem('userRole');
    window.localStorage.removeItem('userFullName');
    window.location.replace('/login');
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }

  return <>{children}</>;
}
