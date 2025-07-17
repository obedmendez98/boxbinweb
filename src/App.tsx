import { AuthProvider } from '@/context/AuthContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import Routes from '@/routes';
import './App.css';

function App() {
  return (
    <SubscriptionProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </SubscriptionProvider>
  );
}

export default App;