import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import LogoIcon from "@/assets/logo.png";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";
import { getStripePlanById } from "@/lib/stripe";

export default function ActiveSubscriptionPage() {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const handleManageSubscription = async () => {
    if (!subscription?.stripeCustomerId) return;
    setRedirecting(true);

    try {
      const res = await fetch(
        "https://us-central1-TU_PROYECTO.cloudfunctions.net/createStripePortalLink",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId: subscription.stripeCustomerId,
          }),
        }
      );

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to redirect:", err);
      alert("Error creating portal session");
      setRedirecting(false);
    }
  };

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!currentUser?.uid) return;

      try {
        const q = query(
          collection(db, "subscriptions"),
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const sub = querySnapshot.docs[0].data();

          if (sub.planId) {
            const stripePlan = await getStripePlanById(sub.planId);

            console.log(stripePlan);
            const fullSubscription = {
              ...sub,
              plan: stripePlan?.product?.name ?? "Unknown Plan",
              price: (stripePlan?.unit_amount ?? 0) / 100,
              interval: stripePlan?.recurring?.interval ?? "month",
              metadata: stripePlan?.metadata ?? {},
            };

            setSubscription(fullSubscription);
          } else {
            setSubscription(sub);
          }
        } else {
          console.log("❌ No se encontró suscripción para el usuario.");
        }
      } catch (error) {
        console.error("🔥 Error al obtener suscripción:", error);
      }

      setLoading(false);
    };

    fetchSubscription();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <p className="text-gray-600 font-medium">
            Loading your subscription...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src={LogoIcon} alt="boxbin logo" className="h-10" />
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-gray-600 font-medium">My Subscription</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="max-w-3xl mx-auto py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 text-indigo-600">
            <Sparkles className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Current Plan
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your <span className="text-indigo-600">Subscription</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Here are the details of your current subscription. You can manage or
            cancel anytime.
          </p>
        </div>

        <Card className="border border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-indigo-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900 font-bold">
              {subscription?.plan || "Unknown Plan"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Status</span>
              <span
                className={`font-semibold ${
                  subscription?.status !== "active"
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {subscription?.status !== "active" ? "Inactive" : "Active"}
              </span>
            </div>

            <div className="flex justify-between text-sm text-gray-700">
              <span>Price</span>
              <span>
                ${subscription?.price?.toFixed(2)} / {subscription?.interval}
              </span>
            </div>

            <div className="flex justify-between text-sm text-gray-700">
              <span>Included Bins</span>
              <span>{subscription?.metadata?.bins || "?"}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-700">
              <span>Included Items</span>
              <span>{subscription?.metadata?.items || "?"}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-700">
              <span>Locations</span>
              <span>{subscription?.metadata?.locations || "?"}</span>
            </div>

            <Button
              disabled={redirecting}
              onClick={handleManageSubscription}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {redirecting ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting...</span>
                </span>
              ) : (
                <span>Manage Subscription</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
