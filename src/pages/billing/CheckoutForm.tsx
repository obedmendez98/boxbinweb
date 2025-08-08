import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createStripeSubscriptionCupons } from '@/lib/stripe';

type CheckoutFormProps = {
  userId: string | undefined;
  planId: string;
};

interface CouponValidation {
  valid: boolean;
  coupon?: {
    id: string;
    percent_off?: number;
    amount_off?: number;
    currency?: string;
    name?: string;
    duration: string;
  };
  error?: string;
}

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
  
  // Estados para cupones
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Función para validar cupón usando Firebase Functions
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Por favor ingresa un código de cupón');
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      // Importar y usar Firebase Functions
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const validateCouponFunction = httpsCallable(functions, 'validateCoupon');

      const result = await validateCouponFunction({ 
        couponCode: couponCode.trim(),
        planId,
        userId 
      });

      const data = result.data as CouponValidation;

      if (data.valid && data.coupon) {
        setAppliedCoupon(data);
        setCouponError(null);
      } else {
        setCouponError(data.error || 'Cupón inválido');
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      console.error('Error validating coupon:', err);
      setCouponError(err.message || 'Error al validar el cupón');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  // Función para remover cupón
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

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

      // Create Stripe subscription with coupon using your local function
      const { subscriptionId, customerId, appliedCoupon: finalAppliedCoupon } = await createStripeSubscriptionCupons(
        paymentMethod.id,
        planId,
        appliedCoupon?.coupon?.id, // Pasar el ID del cupón como tercer parámetro
        undefined, // customerId
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
        couponUsed: finalAppliedCoupon || appliedCoupon?.coupon || null,
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

      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SUBSCRIPTION_SUCCESS',
        }));
      } else {
        window.location.href = '/home';
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campos de información personal */}
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

      {/* Sección de cupones */}
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <Label className="text-base font-semibold">Código de descuento</Label>
        
        {!appliedCoupon ? (
          <div className="flex gap-2">
            <Input
              placeholder="Ingresa tu código de cupón"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={validateCoupon}
              disabled={couponLoading || !couponCode.trim()}
            >
              {couponLoading ? 'Validando...' : 'Aplicar'}
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-green-800">
                  ✅ Cupón aplicado: {appliedCoupon.coupon?.name || couponCode}
                </p>
                <p className="text-sm text-green-600">
                  Descuento: {
                    appliedCoupon.coupon?.percent_off 
                      ? `${appliedCoupon.coupon.percent_off}%`
                      : appliedCoupon.coupon?.amount_off 
                        ? `$${(appliedCoupon.coupon.amount_off / 100).toFixed(2)} ${appliedCoupon.coupon.currency?.toUpperCase()}`
                        : 'Aplicado'
                  }
                </p>
                <p className="text-xs text-gray-600">
                  Duración: {appliedCoupon.coupon?.duration === 'once' ? 'Una vez' : 
                             appliedCoupon.coupon?.duration === 'forever' ? 'Para siempre' : 
                             'Duración limitada'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeCoupon}
                className="text-red-600 hover:text-red-800"
              >
                Remover
              </Button>
            </div>
          </div>
        )}

        {couponError && (
          <p className="text-red-500 text-sm">❌ {couponError}</p>
        )}
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