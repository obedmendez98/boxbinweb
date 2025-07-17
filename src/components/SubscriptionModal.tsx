import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SubscriptionModal() {
  const { t } = useTranslation();
  const {
    showSubscriptionModal,
    setShowSubscriptionModal,
    currentOffering,
    handlePurchase,
    isLoading,
  } = useSubscription();

  if (!currentOffering && !isLoading) return null;

  return (
    <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('subscription.choosePlan')}</DialogTitle>
          <DialogDescription>
            {t('subscription.choosePlanDescription')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {currentOffering?.availablePackages.map((pkg: any) => (
              <Card key={pkg.identifier}>
                <CardHeader>
                  <CardTitle>{pkg.product.title}</CardTitle>
                  <CardDescription>{pkg.product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {pkg.product.priceString}
                    {pkg.product.period && (
                      <span className="text-sm font-normal">/{pkg.product.period}</span>
                    )}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(pkg)}
                  >
                    Subscribe
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}