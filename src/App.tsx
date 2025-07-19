import { AuthProvider } from '@/context/AuthContext';
import Routes from '@/routes';
import './App.css';
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <Routes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;