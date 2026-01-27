import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Save,
  RefreshCw,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings, CURRENCY_OPTIONS, type SystemSettings as SystemSettingsType } from "@/hooks/useSystemSettings";

const SystemSettings = () => {
  const { toast } = useToast();
  const { settings: savedSettings, isLoading, updateSettings, isSaving } = useSystemSettings();
  
  const [settings, setSettings] = useState<SystemSettingsType>(savedSettings);

  // Sync local state when saved settings load
  useEffect(() => {
    setSettings(savedSettings);
  }, [savedSettings]);

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      toast({
        title: "Settings saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSettings({
      currency: { code: "INR", symbol: "₹", locale: "en-IN" },
      emailNotifications: true,
      autoApproveProviders: false,
      maintenanceMode: false,
      requirePhoneVerification: true,
      allowVideoConsultations: true,
      platformFeePercentage: "10",
      supportEmail: "support@bookease.com",
      maxAppointmentsPerDay: "20",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency Settings
          </CardTitle>
          <CardDescription>Configure the default currency for the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Select
              value={settings.currency.code}
              onValueChange={(code) => {
                const selected = CURRENCY_OPTIONS.find((c) => c.code === code);
                if (selected) {
                  setSettings({ ...settings, currency: selected });
                }
              }}
            >
              <SelectTrigger id="currency" className="w-full sm:w-64">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This currency will be used for all prices and transactions on the platform.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Configure general platform behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable the platform for maintenance
              </p>
            </div>
            <div className="flex items-center gap-2">
              {settings.maintenanceMode && (
                <Badge variant="destructive">Active</Badge>
              )}
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <div className="flex gap-2">
                <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                <Input
                  id="supportEmail"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAppointments">Max Appointments/Day</Label>
              <Input
                id="maxAppointments"
                type="number"
                value={settings.maxAppointmentsPerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxAppointmentsPerDay: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Manage platform notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications for appointments and updates
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Verification
          </CardTitle>
          <CardDescription>Configure security and verification requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Phone Verification Required</Label>
              <p className="text-sm text-muted-foreground">
                Require phone verification during signup
              </p>
            </div>
            <Switch
              checked={settings.requirePhoneVerification}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, requirePhoneVerification: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Approve Providers</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve new provider registrations
              </p>
            </div>
            <Switch
              checked={settings.autoApproveProviders}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoApproveProviders: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Settings
          </CardTitle>
          <CardDescription>Configure payment and fee settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Video Consultations</Label>
              <p className="text-sm text-muted-foreground">
                Enable video consultation feature for providers
              </p>
            </div>
            <Switch
              checked={settings.allowVideoConsultations}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowVideoConsultations: checked })
              }
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="platformFee">Platform Fee (%)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="platformFee"
                type="number"
                className="w-24"
                value={settings.platformFeePercentage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    platformFeePercentage: e.target.value,
                  })
                }
              />
              <span className="text-sm text-muted-foreground">
                of each transaction
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SystemSettings;
