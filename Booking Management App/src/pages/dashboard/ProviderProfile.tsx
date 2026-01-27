import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  User,
  Settings,
  Clock,
  Loader2,
  Save,
  DollarSign,
  MapPin,
  Briefcase,
  AlertCircle,
  Video,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useProviderProfile } from "@/hooks/useProfile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  profileUpdateSchema, 
  providerProfileSchema, 
  validateInput 
} from "@/lib/validations";

const professions = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Pediatrician",
  "Orthopedist",
  "Neurologist",
  "Psychiatrist",
  "Dentist",
  "Physical Therapist",
  "Math Tutor",
  "Science Tutor",
  "Language Tutor",
  "Business Consultant",
  "Financial Advisor",
  "Legal Consultant",
  "Career Coach",
  "Fitness Trainer",
  "Nutritionist",
  "Other",
];

const ProviderProfilePage = () => {
  const { user, role } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile, isUpdating: profileUpdating } = useProfile();
  const { providerProfile, isLoading: providerLoading, updateProviderProfile, isUpdating: providerUpdating } = useProviderProfile();

  const [personalErrors, setPersonalErrors] = useState<Record<string, string>>({});
  const [providerErrors, setProviderErrors] = useState<Record<string, string>>({});

  const [personalFormData, setPersonalFormData] = useState({
    full_name: "",
    phone: "",
  });

  const [providerFormData, setProviderFormData] = useState({
    profession: "",
    specialty: "",
    bio: "",
    consultation_fee: "",
    location: "",
    years_of_experience: "",
    is_active: true,
    video_enabled: false,
    video_consultation_fee: "",
  });

  useEffect(() => {
    if (profile) {
      setPersonalFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (providerProfile) {
      setProviderFormData({
        profession: providerProfile.profession || "",
        specialty: providerProfile.specialty || "",
        bio: providerProfile.bio || "",
        consultation_fee: providerProfile.consultation_fee?.toString() || "",
        location: providerProfile.location || "",
        years_of_experience: providerProfile.years_of_experience?.toString() || "",
        is_active: providerProfile.is_active ?? true,
        video_enabled: providerProfile.video_enabled ?? false,
        video_consultation_fee: providerProfile.video_consultation_fee?.toString() || "",
      });
    }
  }, [providerProfile]);

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || "P";
  };

  const handlePersonalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalErrors({});

    const validation = validateInput(profileUpdateSchema, {
      full_name: personalFormData.full_name,
      phone: personalFormData.phone || null,
    });

    if (!validation.success) {
      setPersonalErrors('errors' in validation ? validation.errors : {});
      return;
    }

    updateProfile({
      full_name: personalFormData.full_name,
      phone: personalFormData.phone || null,
    });
  };

  const handleProviderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProviderErrors({});

    const validationData = {
      profession: providerFormData.profession,
      specialty: providerFormData.specialty || null,
      bio: providerFormData.bio || null,
      consultation_fee: providerFormData.consultation_fee ? parseFloat(providerFormData.consultation_fee) : null,
      location: providerFormData.location || null,
      years_of_experience: providerFormData.years_of_experience ? parseInt(providerFormData.years_of_experience) : null,
      is_active: providerFormData.is_active,
      video_enabled: providerFormData.video_enabled,
      video_consultation_fee: providerFormData.video_consultation_fee ? parseFloat(providerFormData.video_consultation_fee) : null,
    };

    const validation = validateInput(providerProfileSchema, validationData);

    if (!validation.success) {
      setProviderErrors('errors' in validation ? validation.errors : {});
      return;
    }

    updateProviderProfile(validationData);
  };

  const isLoading = profileLoading || providerLoading;
  const isApproved = providerProfile?.is_approved;

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
          <h1 className="text-2xl font-bold">Provider Profile</h1>
          <p className="text-muted-foreground">Manage your professional information</p>
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
                  <h3 className="font-semibold">{profile?.full_name || "Provider"}</h3>
                  <p className="text-sm text-muted-foreground">{providerProfile?.profession}</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">{role}</Badge>
                    {isApproved ? (
                      <Badge variant="outline" className="border-primary/50 text-primary">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending Approval</Badge>
                    )}
                  </div>
                </div>

                <nav className="space-y-1">
                  <Link
                    to="/dashboard/provider"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </Link>
                  <Link
                    to="/dashboard/provider/profile"
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/10 text-primary"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <Link
                    to="/dashboard/provider/availability"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Availability</span>
                  </Link>
                  <Link
                    to="/dashboard/provider/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {!isApproved && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your profile is pending approval. Once approved by an admin, you'll be visible to users and can receive bookings.
                </AlertDescription>
              </Alert>
            )}

            {/* Personal Information */}
            <form onSubmit={handlePersonalSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your basic personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={personalFormData.full_name}
                        onChange={(e) =>
                          setPersonalFormData((prev) => ({ ...prev, full_name: e.target.value }))
                        }
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={personalFormData.phone}
                        onChange={(e) =>
                          setPersonalFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={profileUpdating}>
                      {profileUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Personal Info
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>

            {/* Professional Information */}
            <form onSubmit={handleProviderSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                  <CardDescription>
                    Provide details about your services and expertise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profession">Profession</Label>
                      <Select
                        value={providerFormData.profession}
                        onValueChange={(value) =>
                          setProviderFormData((prev) => ({ ...prev, profession: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your profession" />
                        </SelectTrigger>
                        <SelectContent>
                          {professions.map((profession) => (
                            <SelectItem key={profession} value={profession}>
                              {profession}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        value={providerFormData.specialty}
                        onChange={(e) =>
                          setProviderFormData((prev) => ({ ...prev, specialty: e.target.value }))
                        }
                        placeholder="e.g., Sports Medicine, SAT Prep"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={providerFormData.bio}
                      onChange={(e) =>
                        setProviderFormData((prev) => ({ ...prev, bio: e.target.value }))
                      }
                      placeholder="Tell potential clients about yourself, your experience, and what makes you unique..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="consultation_fee">Consultation Fee (₹)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="consultation_fee"
                          type="number"
                          min="0"
                          step="0.01"
                          value={providerFormData.consultation_fee}
                          onChange={(e) =>
                            setProviderFormData((prev) => ({ ...prev, consultation_fee: e.target.value }))
                          }
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="years_of_experience">Years of Experience</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="years_of_experience"
                          type="number"
                          min="0"
                          value={providerFormData.years_of_experience}
                          onChange={(e) =>
                            setProviderFormData((prev) => ({ ...prev, years_of_experience: e.target.value }))
                          }
                          placeholder="0"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={providerFormData.location}
                          onChange={(e) =>
                            setProviderFormData((prev) => ({ ...prev, location: e.target.value }))
                          }
                          placeholder="City, State"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Video Consultation Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Consultation Settings
                    </h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="video_enabled">Enable Video Consultations</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow patients to book video appointments with you
                        </p>
                      </div>
                      <Switch
                        id="video_enabled"
                        checked={providerFormData.video_enabled}
                        onCheckedChange={(checked) =>
                          setProviderFormData((prev) => ({ ...prev, video_enabled: checked }))
                        }
                      />
                    </div>

                    {providerFormData.video_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="video_consultation_fee">Video Consultation Fee (₹)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="video_consultation_fee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={providerFormData.video_consultation_fee}
                            onChange={(e) =>
                              setProviderFormData((prev) => ({ ...prev, video_consultation_fee: e.target.value }))
                            }
                            placeholder="Leave empty to use regular fee"
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Set a different fee for video consultations, or leave empty to use your regular consultation fee
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Available for Bookings</Label>
                      <p className="text-sm text-muted-foreground">
                        Toggle off to temporarily pause receiving new appointment requests
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={providerFormData.is_active}
                      onCheckedChange={(checked) =>
                        setProviderFormData((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={providerUpdating}>
                      {providerUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Professional Info
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProviderProfilePage;
