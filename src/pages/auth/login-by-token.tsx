// src/pages/login-by-token.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getAuth,
  OAuthProvider,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';

const LoginByToken = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token: any = searchParams.get('token');
    const providerId = searchParams.get('provider') || 'google.com';
    if (!token) {
      console.error('Falta token en la URL');
      navigate('/login');
      return;
    }

    const auth = getAuth();
    let credential;

    if (providerId === 'google.com') {
      // Para Google usamos el helper estático
      credential = GoogleAuthProvider.credential(/* accessToken */ null, token);
    } else {
      // Para Apple, Yahoo, etc. creamos una instancia y usamos el método de instancia
      const provider = new OAuthProvider(providerId);
      // El primer parámetro es idToken, el segundo (opcional) accessToken
      credential = provider.credential(token);
    }

    signInWithCredential(auth, credential)
      .then(() => {
        // Usuario autenticado, redirigimos
        navigate('/billing', { replace: true });
      })
      .catch(err => {
        console.error('Error al iniciar sesión con token:', err);
        navigate('/login?error=token');
      });
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <p>Autenticando, por favor espera…</p>
    </div>
  );
};

export default LoginByToken;
