import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createStripeSubscription } from '@/lib/stripe';

type CheckoutFormProps = {
  userId: string | undefined;
  planId: string;
};

export default function CheckoutForm({ userId, planId }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      // Get user information
      const userEmail = currentUser?.email;
      const userName = currentUser?.displayName;

      // Create Stripe subscription
      const { subscriptionId, customerId } = await createStripeSubscription(
        paymentMethod.id,
        planId,
        undefined,
        userEmail || undefined,
        userName || undefined
      );

      // Save subscription details to Firestore
      await addDoc(collection(db, 'subscriptions'), {
        userId,
        planId,
        status: 'active',
        createdAt: new Date(),
        paymentMethod: paymentMethod.id,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId
      });

      // Redirect to dashboard after successful payment
      window.location.href = '/home';
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-2 border rounded" />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Subscribe'}
      </Button>
    </form>
  );
}