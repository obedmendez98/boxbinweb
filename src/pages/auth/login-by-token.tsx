// src/pages/login-by-token.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getAuth,
  signInWithCustomToken
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const LoginByToken = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

   useEffect(() => {
    const doLogin = async () => {
      const idToken = searchParams.get('token');
      if (!idToken) {
        //setError('No se pasó token');
        return navigate('/login');
      }

      try {
        const functions = getFunctions();
        // Llamamos a la Cloud Function para generar el custom token
        const mint = httpsCallable(functions, 'mintCustomToken');
        const result: any = await mint({ idToken });
        const customToken: string = result?.data?.customToken;

        // Ahora autenticamos al usuario en la web con ese customToken
        const auth = getAuth();
        await signInWithCustomToken(auth, customToken);

        // Ya autenticado, redirige
        navigate('/billing', { replace: true });
      } catch (e: any) {
        console.error('Login by token falló:', e);
        //setError(e.message || 'Error desconocido');
        navigate('/login?error=invalid_token');
      } finally {
        //setLoading(false);
      }
    };

    doLogin();
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
