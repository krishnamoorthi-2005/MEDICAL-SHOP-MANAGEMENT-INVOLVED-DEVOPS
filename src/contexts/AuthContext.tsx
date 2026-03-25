import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextType>({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check authentication status on mount and whenever storage changes
    const checkAuth = () => {
      const hasToken = !!window.localStorage.getItem('token');
      const isFlagSet = window.localStorage.getItem('isAuthenticated') === 'true';
      const isAuthenticated = hasToken && isFlagSet;

      setAuthState({
        isAuthenticated,
        isLoading: false,
      });
    };

    // Check once on mount
    checkAuth();

    // Listen for storage changes in OTHER tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'isAuthenticated') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
