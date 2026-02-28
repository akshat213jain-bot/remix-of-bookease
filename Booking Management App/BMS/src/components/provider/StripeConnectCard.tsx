import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useStripeConnect } from "@/hooks/useStripeConnect";

export const StripeConnectCard = () => {
  const {
    status,
    isLoading,
    startOnboarding,
    isOnboarding,
    openDashboard,
    isOpeningDashboard,
  } = useStripeConnect();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Not connected yet
  if (!status?.has_account) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Accept Direct Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your bank account to receive payments directly from appointments.
            Powered by Stripe Connect for secure, reliable payouts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Fast payouts</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Secure transfers</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Easy tracking</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => startOnboarding()}
            disabled={isOnboarding}
          >
            {isOnboarding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Connect with Stripe
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Onboarding incomplete
  if (!status.onboarding_complete) {
    return (
      <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Complete Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your Stripe account is created but you need to complete the onboarding
            process to start receiving payments.
          </p>

          {status.requirements?.currently_due && status.requirements.currently_due.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-2">Required information:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {status.requirements.currently_due.slice(0, 3).map((req) => (
                  <li key={req}>{req.replace(/_/g, " ")}</li>
                ))}
                {status.requirements.currently_due.length > 3 && (
                  <li>And {status.requirements.currently_due.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => startOnboarding()}
            disabled={isOnboarding}
          >
            {isOnboarding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Continue Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Fully connected
  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Stripe Connected
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-background border">
            <p className="text-muted-foreground">Payments</p>
            <div className="flex items-center gap-1 mt-1">
              {status.charges_enabled ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Enabled</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Pending</span>
                </>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background border">
            <p className="text-muted-foreground">Payouts</p>
            <div className="flex items-center gap-1 mt-1">
              {status.payouts_enabled ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Enabled</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Pending</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => openDashboard()}
          disabled={isOpeningDashboard}
        >
          {isOpeningDashboard ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Open Stripe Dashboard
        </Button>
      </CardContent>
    </Card>
  );
};

export default StripeConnectCard;
