import { Bell, BellOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationToggle = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant alerts for appointments, reminders, and messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-sm font-medium">
              {isSubscribed ? "Notifications enabled" : "Enable notifications"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {permission === "denied" 
                ? "Notifications blocked in browser settings"
                : isSubscribed 
                  ? "You'll receive alerts for important updates" 
                  : "Turn on to receive push notifications"
              }
            </p>
          </div>
          
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : permission === "denied" ? (
            <Button variant="outline" size="sm" disabled>
              Blocked
            </Button>
          ) : (
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={(checked) => {
                if (checked) {
                  subscribe();
                } else {
                  unsubscribe();
                }
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
