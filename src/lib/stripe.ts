import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

declare global {
  interface Window {
    Stripe?: typeof Stripe;
  }
}

interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  default_price?: {
    id: string;
    unit_amount: number;
    recurring: {
      interval: string;
    };
  };
}

interface Plan {
  id: string;
  product: {
    name: string;
    description?: string;
  };
  unit_amount: number;
  recurring: {
    interval: string;
  };
}

import { STRIPE_PUBLISHABLE_KEY } from '../config/stripe';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
import { STRIPE_SECRET_KEY } from '../config/stripe';

const stripeClient = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil' as const
});

export const getStripePlans = async (): Promise<Plan[]> => {
  try {
    // Fetch active products with their prices from Stripe
    const { data: products } = await stripeClient.products.list({
      active: true,
      expand: ['data.default_price']
    }) as { data: StripeProduct[] };
    
    return products.map((product: StripeProduct) => ({
      id: product.default_price?.id || '',
      product: { 
        name: product.name, 
        description: product.description 
      },
      unit_amount: product.default_price?.unit_amount || 0,
      recurring: product.default_price?.recurring || { interval: 'month' }
    }));
  } catch (error) {
    console.error('Error fetching Stripe plans:', error);
    throw error;
  }
};

export const createStripeSubscription = async (paymentMethodId: string, planId: string, customerId?: string) => {
  try {
    // Create or use existing customer
    const customer = customerId 
      ? await stripeClient.customers.retrieve(customerId)
      : await stripeClient.customers.create({
          payment_method: paymentMethodId,
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });

    // Create subscription
    const subscription = await stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: planId }],
      expand: ['latest_invoice.payment_intent'],
      default_payment_method: paymentMethodId
    });

    return {
      status: subscription.status,
      subscriptionId: subscription.id,
      customerId: customer.id,
      latestInvoice: subscription.latest_invoice
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};