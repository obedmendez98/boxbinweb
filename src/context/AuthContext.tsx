import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { useSubscription } from './SubscriptionContext';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isNewUser: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, isNewUser: false });

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const { setShowSubscriptionModal } = useSubscription();

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isFirstLogin = !currentUser && user;
      setCurrentUser(user);
      setLoading(false);
      
      if (isFirstLogin) {
        setIsNewUser(true);
        setShowSubscriptionModal(true);
      }
    });

    // Limpiar suscripción al desmontar
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    isNewUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {isNewUser && <SubscriptionModal />}
    </AuthContext.Provider>
  );
};