// src/stripe.ts
const env = import.meta.env;

// Siempre disponible en build (backend o local dev)
export const STRIPE_PUBLISHABLE_KEY = env
  .VITE_STRIPE_PUBLISHABLE_KEY as string;

// Sólo para entorno de desarrollo local:
export const STRIPE_SECRET_KEY = env
  .VITE_STRIPE_SECRET_KEY as string;
