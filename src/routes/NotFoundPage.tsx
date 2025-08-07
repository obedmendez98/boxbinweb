// components/NotFoundPage.tsx
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          {/* Icono animado */}
          <div className="relative mb-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <AlertTriangle size={40} className="text-white" />
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-ping opacity-20"></div>
          </div>

          {/* Número 404 estilizado */}
          <div className="relative mb-6">
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
              404
            </h1>
            <div className="absolute inset-0 text-8xl md:text-9xl font-bold text-gray-200 opacity-50 blur-sm">
              404
            </div>
          </div>

          {/* Título y descripción */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            {t('notFound.title')}
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-8 px-4">
            {t('notFound.description')}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/home')}
            className="w-full group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Home size={22} className="group-hover:scale-110 transition-transform duration-200" />
            <span>{t('notFound.goHome')}</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full group flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 transform hover:-translate-y-0.5"
          >
            <ArrowLeft size={22} className="group-hover:scale-110 transition-transform duration-200" />
            <span>{t('notFound.goBack')}</span>
          </button>
        </div>

        {/* Decoración adicional */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 shadow-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>{t('notFound.systemStatus')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;