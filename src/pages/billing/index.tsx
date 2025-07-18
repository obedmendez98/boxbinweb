import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';

import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CheckoutForm from './CheckoutForm.tsx';
import { Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { getStripePlans } from '../../lib/stripe';

import LogoIcon from "@/assets/logo.png";

import { STRIPE_PUBLISHABLE_KEY } from '../../config/stripe';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
export default function BillingPage() {
    const { currentUser } = useAuth();
    const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [loading, setLoading] = useState(true);
    
    const handleLogout = async () => {
        try {
            await auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stripePlans = await getStripePlans();
      
      console.log(stripePlans);

      setPlans(stripePlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError(`Failed to load plans. Please try again later.`);
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <img src={LogoIcon} alt="boxbin logo" className="h-10" />
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="mt-8">
          {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading plans...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p>No plans available</p>
        </div>
      ) : (
         <div className="flex flex-wrap gap-6 justify-center">
           {plans.map((plan) => (
               <div 
                 key={plan.id} 
                 onClick={() => setSelectedPlan(plan.id)}
                 className="cursor-pointer"
               >
                 <Card
                   className={`w-80 h-full ${selectedPlan === plan.id ? 'border-2 border-primary shadow-lg' : 'hover:shadow-md'}`}
                 >
                   <CardHeader className="pb-0">
                     <CardTitle className="text-xl">{plan.product.name}</CardTitle>
                     {plan.product.description && (
                       <p className="text-sm text-muted-foreground">{plan.product.description}</p>
                     )}
                   </CardHeader>
                   <CardContent className="pt-4">
                     <div className="flex items-baseline gap-2">
                       <span className="text-3xl font-bold">
                         ${(plan.unit_amount / 100).toFixed(2)}
                       </span>
                       <span className="text-sm text-muted-foreground">
                         /{plan.recurring.interval}
                       </span>
                     </div>
                     <Button className="w-full mt-6">
                       Select Plan
                     </Button>
                   </CardContent>
                 </Card>
               </div>
             ))}
         </div>
       )}
          
          {selectedPlan && (
            <div className="mt-8 max-w-md mx-auto">
              <Elements stripe={stripePromise}>
                <CheckoutForm userId={currentUser?.uid} planId={selectedPlan} />
              </Elements>
            </div>
          )}
        </div>
      </div>
  );
}