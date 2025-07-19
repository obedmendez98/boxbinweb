import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import LogoIcon from "@/assets/logo.png";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";

export default function ActiveSubscriptionPage() {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
      if (!currentUser) return;

      const docRef = doc(db, "subscriptions", currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSubscription(docSnap.data());
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
          <p className="text-gray-600 font-medium">Loading your subscription...</p>
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
            <Button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </Button>
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
            Here are the details of your current subscription. You can manage or cancel anytime.
          </p>
        </div>

        <Card className="border border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-indigo-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900 font-bold">
              {subscription?.planName || "Unknown Plan"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Status</span>
              <span
                className={`font-semibold ${
                  subscription?.cancel_at_period_end ? "text-yellow-600" : "text-green-600"
                }`}
              >
                {subscription?.cancel_at_period_end ? "Cancels at period end" : "Active"}
              </span>
            </div>

            <div className="flex justify-between text-sm text-gray-700">
              <span>Renews on</span>
              <span>
                {subscription?.current_period_end
                  ? new Date(subscription?.current_period_end * 1000).toLocaleDateString()
                  : "Unknown"}
              </span>
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
