// src/stripe.ts
const env = import.meta.env;

// Siempre disponible en build (backend o local dev)
export const STRIPE_PUBLISHABLE_KEY = env
  .VITE_STRIPE_PUBLISHABLE_KEY as string;

// Sólo para entorno de desarrollo local:
export const STRIPE_SECRET_KEY = env
  .VITE_STRIPE_SECRET_KEY as string;
  
//export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51R1ZluFYljVxujDOMhxk6gz6rE7DMHV1getzaaXtK72hZxCMGeYnvxSbxaMuKyjZzDuSqVA9dL7r5lmx2Cc2rLin00OcKfa5wk';
//export const STRIPE_SECRET_KEY = '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';