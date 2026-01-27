import Layout from "@/components/layout/Layout";
import { LoyaltyDashboard } from "@/components/loyalty/LoyaltyDashboard";
import { SubscriptionPlans } from "@/components/subscriptions/SubscriptionPlans";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Rewards = () => {
  const { toast } = useToast();

  const handleSelectPlan = (planId: string) => {
    toast({
      title: "Coming Soon!",
      description: "Subscription purchases will be available soon.",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Gift className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Rewards & Subscriptions</h1>
            <p className="text-muted-foreground">
              Earn points, refer friends, and save with subscription plans
            </p>
          </div>
        </div>

        <Tabs defaultValue="loyalty" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Loyalty Program
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loyalty">
            <LoyaltyDashboard />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionPlans onSelectPlan={handleSelectPlan} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Rewards;
