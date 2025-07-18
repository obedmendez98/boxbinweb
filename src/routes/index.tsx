// routes/index.tsx - ACTUALIZADO
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/auth/login';
import HomeScreen from '@/pages/dashboard/home';
import BillingPage from '@/pages/billing';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BinDetailsPage from '@/pages/dashboard/binDetail';
import { LocationsManager } from '@/pages/dashboard/Locations';
import SocialScreen from '@/pages/dashboard/SocialScreen';

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading } = useAuth();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [subscriptionLoading, setSubscriptionLoading] = useState(true);

    useEffect(() => {
        const checkSubscription = async () => {
            if (currentUser) {
                const subscriptionsRef = collection(db, 'subscriptions');
                const q = query(subscriptionsRef, where('userId', '==', currentUser.uid));
                const querySnapshot = await getDocs(q);
                setHasSubscription(!querySnapshot.empty);
            }
            setSubscriptionLoading(false);
        };

        checkSubscription();
    }, [currentUser]);

    if (loading || subscriptionLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (!hasSubscription) {
        return <Navigate to="/billing" replace />;
    }

    return <DashboardLayout>{children}</DashboardLayout>;
};

// Componente para redirigir usuarios autenticados
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (currentUser) {
        return <Navigate to="/home" replace />;
    }

    return <>{children}</>;
};

const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/home" replace />,
    },
    {
        path: '/billing',
        element: <BillingPage />,
    },
    {
        path: '/login',
        element: (
            <RedirectIfAuthenticated>
                <LoginPage />
            </RedirectIfAuthenticated>
        ),
    },
    {
        path: '/home',
        element: (
            <ProtectedRoute>
                <HomeScreen />
            </ProtectedRoute>
        ),
    },
    {
        path: '/locations',
        element: (
            <ProtectedRoute>
                <LocationsManager />
            </ProtectedRoute>
        ),
    },

    {
        path: '/bin-details/:id',
        element: (
            <ProtectedRoute>
                <BinDetailsPage />
            </ProtectedRoute>
        ),
    },

    {
        path: '/impersonate',
        element: (
            <ProtectedRoute>
                <SocialScreen />
            </ProtectedRoute>
        ),
    },

    
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}