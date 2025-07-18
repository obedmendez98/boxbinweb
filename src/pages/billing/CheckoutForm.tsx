import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type CheckoutFormProps = {
  userId: string | undefined;
  planId: string;
};

export default function CheckoutForm({ userId }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
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

      // In a real implementation, you would call your backend API
      // to create the subscription with the selected plan
      const subscription = await addDoc(collection(db, 'subscriptions'), {
         userId,
         planId: props.planId,
         status: 'active',
         createdAt: new Date(),
         paymentMethod: paymentMethod.id,
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