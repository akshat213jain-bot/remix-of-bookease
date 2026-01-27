import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  User,
  Settings,
  Mail,
  Phone,
  Loader2,
  Save,
  Gift,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { profileUpdateSchema, validateInput } from "@/lib/validations";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";

const UserProfile = () => {
  const { user, profile: authProfile, role } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateInput(profileUpdateSchema, {
      full_name: formData.full_name,
      phone: formData.phone || null,
    });

    if (!validation.success) {
      setErrors('errors' in validation ? validation.errors : {});
      return;
    }

    updateProfile({
      full_name: formData.full_name,
      phone: formData.phone || null,
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
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{profile?.full_name || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">{role}</Badge>
                </div>

                <nav className="space-y-1">
                  <Link
                    to="/dashboard/user"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Appointments</span>
                  </Link>
                  <Link
                    to="/dashboard/user/profile"
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/10 text-primary"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <Link
                    to="/dashboard/user/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                  <Link
                    to="/rewards"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Gift className="h-4 w-4" />
                    <span className="text-sm font-medium">Rewards</span>
                  </Link>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details here. Your email cannot be changed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      placeholder="Enter your full name"
                      maxLength={100}
                    />
                    {errors.full_name && (
                      <p className="text-sm text-destructive">{errors.full_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="pl-10 bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email address cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+1 (555) 000-0000"
                        className="pl-10"
                        maxLength={20}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>

            {/* Push Notifications */}
            <div className="mt-6">
              <PushNotificationToggle />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
