// routes/index.tsx - ACTUALIZADO
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/auth/login';
import HomeScreen from '@/pages/dashboard/home';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import BinDetailsPage from '@/pages/dashboard/binDetail';
import { LocationsManager } from '@/pages/dashboard/Locations';
import SocialScreen from '@/pages/dashboard/SocialScreen';

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
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