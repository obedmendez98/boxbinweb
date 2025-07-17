import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import * as Purchases from '@revenuecat/purchases-js';
import type { CustomerInfo, Offering, PurchasesPackage } from '@revenuecat/purchases-js';

interface SubscriptionContextType {
  isSubscribed: boolean;
  currentOffering: Offering | null;
  isLoading: boolean;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  handlePurchase: (packageToPurchase: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  customerInfo: CustomerInfo | null;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  currentOffering: null,
  isLoading: true,
  showSubscriptionModal: false,
  setShowSubscriptionModal: () => {},
  handlePurchase: async () => {},
  restorePurchases: async () => {},
  customerInfo: null
});

export const useSubscription = () => useContext(SubscriptionContext);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentOffering, setCurrentOffering] = useState<Offering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const initializeRevenueCat = async () => {
      if (currentUser) {
        try {
          // Initialize RevenueCat with your API key
          if (!import.meta.env.VITE_REVENUECAT_API_KEY) {
            console.error('RevenueCat API key is not configured');
            return;
          }

          // Enable debug logging before configuration
          Purchases.logLevel = 'debug';
          
          // Configure RevenueCat with API key and user ID
          const purchases = await Purchases.configure({
            apiKey: import.meta.env.VITE_REVENUECAT_API_KEY,
            appUserID: currentUser.uid
          });
          
          console.log('RevenueCat configured successfully');
          
          // Fetch available offerings
          const offerings = await purchases.getOfferings();
          console.log('Offerings response:', offerings);
          
          if (offerings.current) {
            console.log('Current offering:', offerings.current);
            setCurrentOffering(offerings.current);
          } else {
            console.warn('No current offering available');
          }

          // Get customer info and check subscription status
          const info = await Purchases.getCustomerInfo();
          setCustomerInfo(info);
          setIsSubscribed(Object.values(info.entitlements.active).length > 0);
          setIsLoading(false);
        } catch (error) {
          console.error('RevenueCat initialization error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    initializeRevenueCat();

    // Set up periodic customer info polling
    const pollInterval = setInterval(async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        setIsSubscribed(Object.values(info.entitlements.active).length > 0);
      } catch (error) {
        console.error('Error polling customer info:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  const handlePurchase = async (packageToPurchase: PurchasesPackage) => {
    try {
      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(packageToPurchase);
      setCustomerInfo(updatedInfo);
      setIsSubscribed(Object.values(updatedInfo.entitlements.active).length > 0);
      setShowSubscriptionModal(false);
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  };

  const restorePurchases = async () => {
    try {
      const restoredInfo = await Purchases.restorePurchases();
      setCustomerInfo(restoredInfo);
      setIsSubscribed(Object.values(restoredInfo.entitlements.active).length > 0);
      return restoredInfo;
    } catch (error) {
      console.error('Restore purchases error:', error);
      throw error;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        currentOffering,
        isLoading,
        showSubscriptionModal,
        setShowSubscriptionModal,
        handlePurchase,
        restorePurchases,
        customerInfo
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};