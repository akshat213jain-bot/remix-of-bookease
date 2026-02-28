import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2, Phone, MapPin, Briefcase, Award, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Validation schemas
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");
const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, "Please enter a valid phone number");

type AppRole = "user" | "provider" | "admin";

const PROFESSIONS = [
  "Doctor",
  "Dentist", 
  "Therapist",
  "Consultant",
  "Tutor",
  "Fitness Trainer",
  "Lawyer",
  "Accountant",
  "Designer",
  "Other"
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get("mode") || "login";
  const roleParam = (searchParams.get("role") as AppRole) || "user";
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultMode);
  const [signupStep, setSignupStep] = useState(1);
  
  // Form state - Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Form state - Signup Step 1 (Basic)
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>(roleParam);
  
  // Form state - Signup Step 2 (Details)
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  
  // Provider-specific fields
  const [profession, setProfession] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  
  // Admin-specific fields
  const [adminDepartment, setAdminDepartment] = useState("");
  const [adminJustification, setAdminJustification] = useState("");
  
  // OTP Verification
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  
  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      const from = (location.state as { from?: Location })?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else {
        const redirectPath = role === "admin" 
          ? "/dashboard/admin" 
          : role === "provider" 
          ? "/dashboard/provider" 
          : "/dashboard/user";
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, role, navigate, location]);

  const validateField = (field: string, value: string): string | null => {
    try {
      switch (field) {
        case "email":
        case "loginEmail":
        case "signupEmail":
          emailSchema.parse(value);
          break;
        case "password":
        case "loginPassword":
        case "signupPassword":
          passwordSchema.parse(value);
          break;
        case "name":
        case "signupName":
          nameSchema.parse(value);
          break;
        case "phone":
          phoneSchema.parse(value.replace(/[\s\-\(\)]/g, ''));
          break;
      }
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return "Invalid input";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const emailError = validateField("email", loginEmail);
    const passwordError = validateField("password", loginPassword);

    if (emailError || passwordError) {
      setErrors({
        loginEmail: emailError || "",
        loginPassword: passwordError || "",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      let message = "An error occurred during sign in.";
      if (error.message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Please verify your email before signing in.";
      }
      
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: message,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    }

    setIsLoading(false);
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nameError = validateField("name", signupName);
    const emailError = validateField("email", signupEmail);
    const passwordError = validateField("password", signupPassword);

    if (nameError || emailError || passwordError) {
      setErrors({
        signupName: nameError || "",
        signupEmail: emailError || "",
        signupPassword: passwordError || "",
      });
      return;
    }

    setSignupStep(2);
  };

  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate phone
    const phoneError = validateField("phone", phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }

    // Validate provider fields
    if (selectedRole === "provider") {
      if (!profession) {
        setErrors({ profession: "Please select your profession" });
        return;
      }
    }

    // Validate admin fields
    if (selectedRole === "admin") {
      if (!adminDepartment.trim()) {
        setErrors({ adminDepartment: "Please enter your department/role" });
        return;
      }
      if (!adminJustification.trim() || adminJustification.length < 20) {
        setErrors({ adminJustification: "Please provide a detailed justification (at least 20 characters)" });
        return;
      }
    }

    setIsLoading(true);

    // Create account with metadata
    const metadata: Record<string, string | number> = {
      full_name: signupName,
      phone: phone,
      date_of_birth: dateOfBirth,
      address: address,
      city: city,
    };

    if (selectedRole === "provider") {
      metadata.profession = profession;
      metadata.specialty = specialty;
      metadata.years_of_experience = parseInt(yearsOfExperience) || 0;
    }

    // For admin registration, we sign up as "user" role initially
    // Then create an approval request for admin access
    const signupRole = selectedRole === "admin" ? "user" : selectedRole;

    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);

    if (error) {
      let message = "An error occurred during sign up.";
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        message = "This email is already registered. Please sign in instead.";
      } else if (error.message.includes("rate") || error.message.includes("security purposes")) {
        message = "Too many attempts. Please wait a moment and try again.";
      } else if (error.message.includes("Invalid email")) {
        message = "Please enter a valid email address.";
      } else if (error.message.includes("Password")) {
        message = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: message,
      });
      setIsLoading(false);
      return;
    }

    // Get the newly created user
    const { data: { user: newUser } } = await supabase.auth.getUser();
    
    if (newUser) {
      setUserId(newUser.id);
      
      // Update profile with additional fields
      await supabase.from("profiles").update({
        phone: phone,
        date_of_birth: dateOfBirth || null,
        address: address || null,
        city: city || null,
      }).eq("user_id", newUser.id);

      // If signing up as a provider, ensure a provider profile exists + create an approval request
      if (selectedRole === "provider") {
        const years = parseInt(yearsOfExperience) || 0;

        const { data: existingProviderProfile, error: existingProviderError } = await supabase
          .from("provider_profiles")
          .select("id")
          .eq("user_id", newUser.id)
          .maybeSingle();

        if (existingProviderError) {
          toast({
            variant: "destructive",
            title: "Provider setup failed",
            description: "Could not check provider profile. Please try again.",
          });
          setIsLoading(false);
          return;
        }

        let providerProfileId = existingProviderProfile?.id ?? null;

        if (!providerProfileId) {
          const { data: insertedProvider, error: insertProviderError } = await supabase
            .from("provider_profiles")
            .insert({
              user_id: newUser.id,
              profession,
              specialty: specialty || null,
              years_of_experience: years,
              phone,
              is_approved: false,
              is_active: true,
            })
            .select("id")
            .maybeSingle();

          if (insertProviderError) {
            toast({
              variant: "destructive",
              title: "Provider setup failed",
              description: "Could not create provider profile. Please try again.",
            });
            setIsLoading(false);
            return;
          }

          providerProfileId = insertedProvider?.id ?? null;
        } else {
          // Keep provider profile fields in sync with sign-up form
          const { error: updateProviderError } = await supabase
            .from("provider_profiles")
            .update({
              profession,
              specialty: specialty || null,
              years_of_experience: years,
              phone,
            })
            .eq("user_id", newUser.id);

          if (updateProviderError) {
            toast({
              variant: "destructive",
              title: "Provider setup failed",
              description: "Could not update provider profile. Please try again.",
            });
            setIsLoading(false);
            return;
          }
        }

        // Create a pending approval request for admins to review
        const { data: existingApprovalRequest, error: existingApprovalError } = await supabase
          .from("approval_requests")
          .select("id")
          .eq("request_type", "provider_registration")
          .eq("requester_id", newUser.id)
          .eq("status", "pending")
          .maybeSingle();

        if (existingApprovalError) {
          toast({
            variant: "destructive",
            title: "Provider setup failed",
            description: "Could not create approval request. Please try again.",
          });
          setIsLoading(false);
          return;
        }

        if (!existingApprovalRequest) {
          const { error: insertApprovalError } = await supabase.from("approval_requests").insert({
            request_type: "provider_registration",
            requester_id: newUser.id,
            related_id: providerProfileId,
            status: "pending",
            details: {
              profession,
              specialty: specialty || null,
              years_of_experience: years,
            },
          });

          if (insertApprovalError) {
            toast({
              variant: "destructive",
              title: "Provider setup failed",
              description: "Could not submit approval request. Please try again.",
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // If signing up as admin, create an approval request
      if (selectedRole === "admin") {
        const { error: insertAdminApprovalError } = await supabase.from("approval_requests").insert({
          request_type: "admin_registration",
          requester_id: newUser.id,
          status: "pending",
          details: {
            department: adminDepartment,
            justification: adminJustification,
            requested_at: new Date().toISOString(),
          },
        });

        if (insertAdminApprovalError) {
          toast({
            variant: "destructive",
            title: "Admin request failed",
            description: "Could not submit admin access request. Please try again.",
          });
          setIsLoading(false);
          return;
        }
      }

      // Send OTP for phone verification
      const { data: otpData, error: otpError } = await supabase.functions.invoke("send-phone-otp", {
        body: { phone, userId: newUser.id }
      });

      if (otpError) {
        toast({
          variant: "destructive",
          title: "Failed to send verification code",
          description: "Please try again later.",
        });
        setIsLoading(false);
        return;
      }

      // For demo purposes, show the OTP
      if (otpData?.demo_otp) {
        setDemoOtp(otpData.demo_otp);
      }

      setShowOtpInput(true);
      toast({
        title: "Verification code sent!",
        description: "Please enter the code sent to your phone.",
      });
    }

    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !userId) return;

    setIsLoading(true);

    const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
      body: { otp, userId }
    });

    if (error || !data?.success) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: data?.error || "Invalid verification code. Please try again.",
      });
      setIsLoading(false);
      return;
    }

    // Show different messages based on role
    if (selectedRole === "admin") {
      toast({
        title: "Registration submitted!",
        description: "Your admin access request has been sent for approval. You'll be notified once reviewed.",
      });
    } else {
      toast({
        title: "Phone verified!",
        description: "Your account has been created successfully.",
      });
    }

    setIsLoading(false);
    
    // Redirect based on role - admin registrations go to user dashboard until approved
    const redirectPath = selectedRole === "provider" 
      ? "/dashboard/provider" 
      : "/dashboard/user";
    navigate(redirectPath, { replace: true });
  };

  const handleResendOtp = async () => {
    if (!userId || !phone) return;

    setIsLoading(true);

    const { data, error } = await supabase.functions.invoke("send-phone-otp", {
      body: { phone, userId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to resend code",
        description: "Please try again later.",
      });
    } else {
      if (data?.demo_otp) {
        setDemoOtp(data.demo_otp);
      }
      toast({
        title: "Code resent!",
        description: "A new verification code has been sent to your phone.",
      });
    }

    setIsLoading(false);
  };

  const renderSignupStep1 = () => (
    <form onSubmit={handleSignupStep1} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            className="pl-10"
            value={signupName}
            onChange={(e) => setSignupName(e.target.value)}
            required
          />
        </div>
        {errors.signupName && (
          <p className="text-sm text-destructive">{errors.signupName}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            className="pl-10"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            required
          />
        </div>
        {errors.signupEmail && (
          <p className="text-sm text-destructive">{errors.signupEmail}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            className="pl-10 pr-10"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.signupPassword && (
          <p className="text-sm text-destructive">{errors.signupPassword}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <Label>I want to:</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedRole("user")}
            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
              selectedRole === "user"
                ? "border-primary bg-primary/5 text-primary"
                : "border-input hover:bg-muted"
            }`}
          >
            Book appointments
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("provider")}
            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
              selectedRole === "provider"
                ? "border-primary bg-primary/5 text-primary"
                : "border-input hover:bg-muted"
            }`}
          >
            Offer services
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("admin")}
            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
              selectedRole === "admin"
                ? "border-primary bg-primary/5 text-primary"
                : "border-input hover:bg-muted"
            }`}
          >
            Admin access
          </button>
        </div>
        {selectedRole === "admin" && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ Admin registration requires approval from an existing administrator
          </p>
        )}
      </div>

      <Button type="submit" className="w-full">
        Continue
      </Button>
    </form>
  );

  const renderSignupStep2 = () => (
    <form onSubmit={handleSignupStep2} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSignupStep(1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-muted-foreground">Step 2 of 2</span>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            className="pl-10"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          You'll receive a verification code via SMS
        </p>
      </div>

      {/* Date of Birth - User only */}
      {selectedRole === "user" && (
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="dob"
              type="date"
              className="pl-10"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="address"
            type="text"
            placeholder="123 Main Street"
            className="pl-10"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          type="text"
          placeholder="New York"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {/* Provider-specific fields */}
      {selectedRole === "provider" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="profession">Profession *</Label>
            <Select value={profession} onValueChange={setProfession}>
              <SelectTrigger className="w-full">
                <Briefcase className="h-4 w-4 text-muted-foreground mr-2" />
                <SelectValue placeholder="Select your profession" />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONS.map((prof) => (
                  <SelectItem key={prof} value={prof}>
                    {prof}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.profession && (
              <p className="text-sm text-destructive">{errors.profession}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              type="text"
              placeholder="e.g., Cardiology, Tax Consulting"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Years of Experience</Label>
            <div className="relative">
              <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="experience"
                type="number"
                min="0"
                max="50"
                placeholder="5"
                className="pl-10"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Admin-specific fields */}
      {selectedRole === "admin" && (
        <>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Admin registration requires verification by an existing administrator before you can access the admin dashboard.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminDepartment">Department / Role *</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="adminDepartment"
                type="text"
                placeholder="e.g., Operations, Support, Management"
                className="pl-10"
                value={adminDepartment}
                onChange={(e) => setAdminDepartment(e.target.value)}
                required
              />
            </div>
            {errors.adminDepartment && (
              <p className="text-sm text-destructive">{errors.adminDepartment}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminJustification">Justification for Admin Access *</Label>
            <textarea
              id="adminJustification"
              placeholder="Please explain why you need admin access and your responsibilities..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={adminJustification}
              onChange={(e) => setAdminJustification(e.target.value)}
              required
            />
            {errors.adminJustification && (
              <p className="text-sm text-destructive">{errors.adminJustification}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters required
            </p>
          </div>
        </>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );

  const renderOtpVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Verify Your Phone</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the 6-digit code sent to {phone}
        </p>
      </div>

      {/* Demo OTP notice */}
      {demoOtp && (
        <div className="p-3 bg-accent border border-border rounded-lg text-center">
          <p className="text-xs text-accent-foreground">
            Demo mode: Your verification code is <strong>{demoOtp}</strong>
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <InputOTP
          value={otp}
          onChange={setOtp}
          maxLength={6}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button 
        onClick={handleVerifyOtp} 
        className="w-full" 
        disabled={otp.length !== 6 || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Phone"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Didn't receive the code?{" "}
        <button
          onClick={handleResendOtp}
          className="text-primary hover:underline"
          disabled={isLoading}
        >
          Resend
        </button>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">BookEase</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>
                {showOtpInput 
                  ? "Phone Verification"
                  : selectedRole === "provider" 
                    ? "Join as a Provider" 
                    : selectedRole === "admin"
                      ? "Admin Registration"
                      : "Welcome"
                }
              </CardTitle>
              <CardDescription>
                {showOtpInput
                  ? "Complete your registration by verifying your phone"
                  : selectedRole === "provider" 
                    ? "Create your provider account to start accepting appointments"
                    : selectedRole === "admin"
                      ? "Request admin access (requires approval)"
                      : "Sign in to your account or create a new one"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showOtpInput ? (
                renderOtpVerification()
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Log In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  {/* Login Form */}
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                        {errors.loginEmail && (
                          <p className="text-sm text-destructive">{errors.loginEmail}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="login-password">Password</Label>
                          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.loginPassword && (
                          <p className="text-sm text-destructive">{errors.loginPassword}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Signup Form */}
                  <TabsContent value="signup">
                    {signupStep === 1 ? renderSignupStep1() : renderSignupStep2()}
                    
                    {signupStep === 1 && (
                      <p className="text-xs text-center text-muted-foreground mt-4">
                        By signing up, you agree to our{" "}
                        <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                        {" "}and{" "}
                        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Role Switch */}
          {!showOtpInput && selectedRole !== "admin" && (
            <p className="text-center mt-6 text-sm text-muted-foreground">
              {selectedRole === "provider" ? (
                <>
                  Looking to book appointments?{" "}
                  <button 
                    onClick={() => {
                      setSelectedRole("user");
                      setSignupStep(1);
                    }}
                    className="text-primary hover:underline"
                  >
                    Sign up as a user
                  </button>
                </>
              ) : (
                <>
                  Are you a service provider?{" "}
                  <button 
                    onClick={() => {
                      setSelectedRole("provider");
                      setActiveTab("signup");
                      setSignupStep(1);
                    }}
                    className="text-primary hover:underline"
                  >
                    Join as a provider
                  </button>
                </>
              )}
            </p>
          )}
          {!showOtpInput && selectedRole === "admin" && (
            <p className="text-center mt-6 text-sm text-muted-foreground">
              Changed your mind?{" "}
              <button 
                onClick={() => {
                  setSelectedRole("user");
                  setSignupStep(1);
                }}
                className="text-primary hover:underline"
              >
                Sign up as a regular user
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;