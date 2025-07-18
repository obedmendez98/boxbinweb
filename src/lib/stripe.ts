import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_live_51R1ZluFYljVxujDOMhxk6gz6rE7DMHV1getzaaXtK72hZxCMGeYnvxSbxaMuKyjZzDuSqVA9dL7r5lmx2Cc2rLin00OcKfa5wk');

export const getStripePlans = async () => {
  try {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe not initialized');
    
    // In a real implementation, you would call your backend API
    // This is a mock implementation for demonstration
    return [
      {
        id: 'price_1',
        product: { name: 'Basic Plan' },
        unit_amount: 999,
        recurring: { interval: 'month' }
      },
      {
        id: 'price_2',
        product: { name: 'Pro Plan' },
        unit_amount: 1999,
        recurring: { interval: 'month' }
      },
      {
        id: 'price_3',
        product: { name: 'Enterprise Plan' },
        unit_amount: 4999,
        recurring: { interval: 'month' }
      }
    ];
  } catch (error) {
    console.error('Error fetching Stripe plans:', error);
    throw error;
  }
};

export const createStripeSubscription = async (paymentMethodId: string, planId: string) => {
  // In a real implementation, you would call your backend API
  // This is a mock implementation for demonstration
  return { status: 'active' };
};