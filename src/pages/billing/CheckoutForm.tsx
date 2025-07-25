import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');

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
        billing_details: {
          name: nameOnCard,
          email: currentUser?.email,
          address: {
            line1: address,
            city: city,
            state: state,
            postal_code: zipCode,
            country: 'US'
          }
        }
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
        userName || undefined,
        currentUser?.uid ?? "",
        {
          firstName,
          lastName,
          address,
          city,
          state,
          zipCode,
          nameOnCard
        }
      );

      const subscriptionsRef = collection(db, "subscriptions");
      const q = query(subscriptionsRef, where("userId", "==", userId));
      const existingSubs = await getDocs(q);

      for (const docSnap of existingSubs.docs) {
        await deleteDoc(doc(db, "subscriptions", docSnap.id));
      }

      // Save subscription details to Firestore
      await addDoc(collection(db, 'subscriptions'), {
        userId,
        planId,
        status: 'active',
        paymentMethod: paymentMethod.id,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        billingDetails: {
          firstName,
          lastName,
          address,
          city,
          state,
          zipCode,
          nameOnCard
        },
        createdAt: new Date(),
        updatedAt: new Date(),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Billing Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nameOnCard">Name on Card</Label>
        <Input
          id="nameOnCard"
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Card Information</Label>
        <CardElement className="p-3 border rounded-md" />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Subscribe'}
      </Button>
    </form>
  );
}