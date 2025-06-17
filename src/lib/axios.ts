import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { auth } from './firebase';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
console.log(apiUrl);

const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {

    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Manejar errores específicos
    if (error.response) {
      // La solicitud fue hecha y el servidor respondió con un código de estado
      // que cae fuera del rango de 2xx
      const status = error.response.status;
      
      switch (status) {
        case 401:
          // No autorizado - redirigir al login
          console.error('Error 401: No autorizado');
          // Aquí podrías redirigir al login o mostrar un mensaje
          break;
        case 403:
          // Prohibido
          console.error('Error 403: Acceso prohibido');
          break;
        case 404:
          // No encontrado
          console.error('Error 404: Recurso no encontrado');
          break;
        case 500:
          // Error del servidor
          console.error('Error 500: Error interno del servidor');
          break;
        default:
          console.error(`Error ${status}: ${error.message}`);
      }
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.error('Error de red: No se recibió respuesta del servidor');
    } else {
      // Algo sucedió en la configuración de la solicitud que desencadenó un error
      console.error('Error de configuración de Axios:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;