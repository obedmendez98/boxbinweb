import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/context/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CheckoutForm from './CheckoutForm';
import { Navigate } from 'react-router-dom';
import { getStripePlans } from '../../lib/stripe';

const stripePromise = loadStripe('pk_live_51R1ZluFYljVxujDOMhxk6gz6rE7DMHV1getzaaXtK72hZxCMGeYnvxSbxaMuKyjZzDuSqVA9dL7r5lmx2Cc2rLin00OcKfa5wk');

export default function BillingPage() {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (currentUser) {
        const docRef = doc(db, 'subscriptions', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSubscription(docSnap.data());
        }
        setLoading(false);
      }
    };

    checkSubscription();
  }, [currentUser]);

  const fetchPlans = useCallback(async () => {
    try {
      const stripePlans = await getStripePlans();
      setPlans(stripePlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (subscription) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Choose a Plan</CardTitle>
          <CardDescription className="text-center">Select a subscription plan to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`cursor-pointer ${selectedPlan === plan.id ? 'border-primary' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardHeader>
                <CardTitle>{plan.product.name}</CardTitle>
                <CardDescription>
                  ${(plan.unit_amount / 100).toFixed(2)}/{plan.recurring.interval}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
          {selectedPlan && (
            <Elements stripe={stripePromise}>
              <CheckoutForm userId={currentUser?.uid} planId={selectedPlan} />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
}