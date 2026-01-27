import { useState } from "react";
import { Check, Crown, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionPlans, useUserSubscription } from "@/hooks/useSubscriptions";
import { useCurrencySettings } from "@/hooks/useSystemSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
}

export const SubscriptionPlans = ({ onSelectPlan }: SubscriptionPlansProps) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const { plans, isLoading } = useSubscriptionPlans();
  const { subscription, hasActiveSubscription } = useUserSubscription();
  const currencySettings = useCurrencySettings();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(currencySettings?.locale || "en-US", {
      style: "currency",
      currency: currencySettings?.code || "USD",
    }).format(price);
  };

  const getPlanIcon = (index: number) => {
    if (index === 0) return <Zap className="h-6 w-6" />;
    if (index === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    return <Crown className="h-6 w-6 text-purple-500" />;
  };

  const getPlanFeatures = (plan: { appointments_included: number; duration_days: number }) => {
    const features = [
      `${plan.appointments_included} appointments included`,
      `Valid for ${plan.duration_days} days`,
      "Priority booking",
      "No booking fees",
    ];
    if (plan.appointments_included >= 10) {
      features.push("10% bonus points on appointments");
    }
    if (plan.appointments_included >= 20) {
      features.push("Exclusive provider access");
      features.push("24/7 priority support");
    }
    return features;
  };

  const handleSubscribe = async (planId: string) => {
    // If parent component wants to handle it, let them
    if (onSelectPlan) {
      onSelectPlan(planId);
      return;
    }

    // Otherwise, call the checkout function directly
    setIsProcessing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: { plan_id: planId },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      toast({
        title: "Subscription Error",
        description: error instanceof Error ? error.message : "Failed to start subscription checkout",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-24" />
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Crown className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No subscription plans available</p>
          <p className="text-sm mt-1">Check back later for special offers!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {hasActiveSubscription && subscription && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{subscription.plan?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.appointments_remaining} appointments remaining
                </p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, index) => {
          const isCurrentPlan = subscription?.plan_id === plan.id;
          const isPopular = index === 1;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative",
                isPopular && "border-primary shadow-lg scale-105",
                isCurrentPlan && "border-green-500"
              )}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge variant="secondary" className="absolute -top-3 right-4">
                  Current Plan
                </Badge>
              )}
              <CardHeader className="text-center">
                <div className="mx-auto mb-2">{getPlanIcon(index)}</div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                  <span className="text-muted-foreground">/{plan.duration_days} days</span>
                </div>
                <ul className="space-y-3 text-left">
                  {getPlanFeatures(plan).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  disabled={isCurrentPlan || isProcessing === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isProcessing === plan.id ? "Processing..." : isCurrentPlan ? "Current Plan" : "Subscribe"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
