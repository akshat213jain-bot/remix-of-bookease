import { Gift, Star, Users, TrendingUp, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLoyalty } from "@/hooks/useLoyalty";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export const LoyaltyDashboard = () => {
  const {
    points,
    lifetimePoints,
    transactions,
    referrals,
    referralCode,
    isLoading,
    completedReferrals,
    pendingReferrals,
  } = useLoyalty();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earned":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "redeemed":
        return <Gift className="h-4 w-4 text-blue-500" />;
      case "bonus":
        return <Star className="h-4 w-4 text-yellow-500" />;
      default:
        return <Star className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "earned":
        return <Badge variant="default" className="bg-green-500">Earned</Badge>;
      case "redeemed":
        return <Badge variant="default" className="bg-blue-500">Redeemed</Badge>;
      case "bonus":
        return <Badge variant="default" className="bg-yellow-500">Bonus</Badge>;
      case "expired":
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate tier based on lifetime points
  const getTier = () => {
    if (lifetimePoints >= 5000) return { name: "Platinum", color: "bg-slate-400", next: null, progress: 100 };
    if (lifetimePoints >= 2000) return { name: "Gold", color: "bg-yellow-400", next: 5000, progress: ((lifetimePoints - 2000) / 3000) * 100 };
    if (lifetimePoints >= 500) return { name: "Silver", color: "bg-slate-300", next: 2000, progress: ((lifetimePoints - 500) / 1500) * 100 };
    return { name: "Bronze", color: "bg-amber-600", next: 500, progress: (lifetimePoints / 500) * 100 };
  };

  const tier = getTier();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Points</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{points.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime: {lifetimePoints.toLocaleString()} pts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Tier</CardTitle>
            <div className={`h-4 w-4 rounded-full ${tier.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tier.name}</div>
            {tier.next && (
              <div className="mt-2">
                <Progress value={tier.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {tier.next - lifetimePoints} pts to next tier
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReferrals}</div>
            <p className="text-xs text-muted-foreground">
              {pendingReferrals} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Refer a Friend
          </CardTitle>
          <CardDescription>
            Share your code and earn 100 points for each friend who books their first appointment!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-muted rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{referralCode}</p>
            </div>
            <Button onClick={copyReferralCode} variant="outline">
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Points History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No points activity yet</p>
              <p className="text-sm mt-1">Book appointments to start earning points!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.transaction_type)}
                    <div>
                      <p className="font-medium">{tx.description || "Points Activity"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getTransactionBadge(tx.transaction_type)}
                    <span
                      className={`font-semibold ${
                        tx.points > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {tx.points > 0 ? "+" : ""}{tx.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {ref.referred_user?.full_name || "Invited User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Invited {format(new Date(ref.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant={ref.status === "completed" ? "default" : "secondary"}
                  >
                    {ref.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
