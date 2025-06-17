import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/auth/login';
import HomeScreen from '@/pages/dashboard/home';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

// Componente para proteger rutas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

// Componente para redirigir usuarios autenticados
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Cargando...</div>;
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
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
