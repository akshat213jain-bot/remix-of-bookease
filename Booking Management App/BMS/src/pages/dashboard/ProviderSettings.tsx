import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useProviderProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Calendar,
  Mail,
  Phone,
  Video,
  Globe,
  Shield,
  Loader2,
  Check,
  RefreshCw,
  CreditCard,
} from "lucide-react";

const ProviderSettings = () => {
  const { toast } = useToast();
  const { providerProfile, isLoading, refetch } = useProviderProfile();
  const [saving, setSaving] = useState(false);

  // Profile Visibility Settings
  const [profileVisible, setProfileVisible] = useState(true);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [showVideoOption, setShowVideoOption] = useState(providerProfile?.video_enabled ?? false);
  const [requireVideoPayment, setRequireVideoPayment] = useState(providerProfile?.require_video_payment ?? true);

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [newBookingAlerts, setNewBookingAlerts] = useState(true);
  const [rescheduleAlerts, setRescheduleAlerts] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);

  // Calendar Sync
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncBothWays, setSyncBothWays] = useState(false);
  
  // Update state when providerProfile loads
  useEffect(() => {
    if (providerProfile) {
      setProfileVisible(providerProfile.is_active ?? true);
      setShowVideoOption(providerProfile.video_enabled ?? false);
      setRequireVideoPayment(providerProfile.require_video_payment ?? true);
    }
  }, [providerProfile]);

  const handleSaveVisibility = async () => {
    if (!providerProfile?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("provider_profiles")
        .update({
          is_active: profileVisible,
          video_enabled: showVideoOption,
          require_video_payment: requireVideoPayment,
        })
        .eq("id", providerProfile.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your visibility settings have been updated.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    // Simulate saving - in production, this would update a notification_preferences table
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const handleConnectGoogle = () => {
    // Redirect to Google OAuth flow
    window.location.href = "/auth/google/callback";
  };

  const handleDisconnectGoogle = () => {
    setGoogleCalendarConnected(false);
    toast({
      title: "Disconnected",
      description: "Google Calendar has been disconnected.",
    });
  };

  if (isLoading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard/provider">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Provider Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile visibility, notifications, and integrations
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Profile Visibility</CardTitle>
              </div>
              <CardDescription>
                Control how your profile appears to potential clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium flex items-center gap-2">
                    {profileVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Profile Active
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, your profile is visible in search results and can receive bookings
                  </p>
                </div>
                <Switch
                  checked={profileVisible}
                  onCheckedChange={setProfileVisible}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Show Phone Number
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display your phone number on your public profile
                  </p>
                </div>
                <Switch
                  checked={showPhoneNumber}
                  onCheckedChange={setShowPhoneNumber}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Consultations
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow clients to book video consultations with you
                  </p>
                </div>
                <Switch
                  checked={showVideoOption}
                  onCheckedChange={setShowVideoOption}
                />
              </div>

              {showVideoOption && (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Require Payment for Video Calls
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When disabled, clients can join video consultations without paying
                      </p>
                    </div>
                    <Switch
                      checked={requireVideoPayment}
                      onCheckedChange={setRequireVideoPayment}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveVisibility} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>
                Choose how you want to receive updates about your appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Channels */}
              <div>
                <h4 className="text-sm font-medium mb-4">Notification Channels</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        SMS Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive text messages for urgent updates
                      </p>
                    </div>
                    <Switch
                      checked={smsNotifications}
                      onCheckedChange={setSmsNotifications}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              <div>
                <h4 className="text-sm font-medium mb-4">Notification Types</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded before upcoming appointments
                      </p>
                    </div>
                    <Switch
                      checked={appointmentReminders}
                      onCheckedChange={setAppointmentReminders}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">New Booking Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when a new booking request is received
                      </p>
                    </div>
                    <Switch
                      checked={newBookingAlerts}
                      onCheckedChange={setNewBookingAlerts}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Reschedule Requests</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when a client requests to reschedule
                      </p>
                    </div>
                    <Switch
                      checked={rescheduleAlerts}
                      onCheckedChange={setRescheduleAlerts}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">New Reviews</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when a client leaves a review
                      </p>
                    </div>
                    <Switch
                      checked={reviewAlerts}
                      onCheckedChange={setReviewAlerts}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Sync */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Calendar Sync</CardTitle>
              </div>
              <CardDescription>
                Connect your calendar to automatically sync appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Calendar */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">
                      {googleCalendarConnected
                        ? "Connected and syncing"
                        : "Connect to sync your appointments"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {googleCalendarConnected && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Connected
                    </Badge>
                  )}
                  <Button
                    variant={googleCalendarConnected ? "outline" : "default"}
                    onClick={googleCalendarConnected ? handleDisconnectGoogle : handleConnectGoogle}
                  >
                    {googleCalendarConnected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>

              {googleCalendarConnected && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Auto-Sync
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync new appointments to your calendar
                        </p>
                      </div>
                      <Switch
                        checked={autoSyncEnabled}
                        onCheckedChange={setAutoSyncEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Two-Way Sync
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Block availability when you have events in Google Calendar
                        </p>
                      </div>
                      <Switch
                        checked={syncBothWays}
                        onCheckedChange={setSyncBothWays}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ProviderSettings;
