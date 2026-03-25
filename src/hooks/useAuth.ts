import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check authentication status only once on mount
    const hasToken = !!window.localStorage.getItem('token');
    const isFlagSet = window.localStorage.getItem('isAuthenticated') === 'true';
    const isAuthenticated = hasToken && isFlagSet;

    setAuthState({
      isAuthenticated,
      isLoading: false,
    });
  }, []);

  return authState;
}
