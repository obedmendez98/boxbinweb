import { loadStripe, type StripeConstructor } from '@stripe/stripe-js';
import Stripe from 'stripe';
import { getFunctions, httpsCallable } from "firebase/functions";

declare global {
  interface Window {
    Stripe?: StripeConstructor;
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
  metadata: any
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
  metadata: any
}

import { STRIPE_PUBLISHABLE_KEY } from '../config/stripe';

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
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
      recurring: product.default_price?.recurring || { interval: 'month' },
      metadata: product?.metadata
    }));
  } catch (error) {
    console.error('Error fetching Stripe plans:', error);
    throw error;
  }
};

export const createStripeSubscription = async (paymentMethodId: string, planId: string, customerId?: string, userEmail?: string, userName?: string) => {
  try {
    // Create or use existing customer
    const customer = customerId 
      ? await stripeClient.customers.retrieve(customerId)
      : await stripeClient.customers.create({
          payment_method: paymentMethodId,
          email: userEmail,
          name: userName,
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

export const getStripePlanById = async (priceId: string): Promise<any> => {
  try {
    const price = await stripeClient.prices.retrieve(priceId, {
      expand: ['product'],
    });

    if (!price || typeof price.product !== 'object') {
      return null;
    }

    const product = price.product as Stripe.Product;

    return {
      priceId: price.id,
      product: {
        name: product.name,
        description: product.description,
      },
      unit_amount: price.unit_amount ?? 0,
      recurring: price.recurring ?? null,
      ...product,
    };
  } catch (error) {
    console.error(`Error retrieving plan with ID ${priceId}:`, error);
    return null;
  }
};

export const cancelUserSubscription = async (subscriptionId: string, userId: string) => {
  const functions = getFunctions();
  const cancelSub = httpsCallable(functions, "cancelSubscription");

  const result = await cancelSub({ subscriptionId, userId });
  return result.data;
};