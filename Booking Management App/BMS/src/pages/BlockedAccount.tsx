import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban, LogOut, Mail, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const BlockedAccount = () => {
  const { profile, signOut, role, user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isBanned = profile?.status === "banned";
  const isSuspended = profile?.status === "suspended";

  // Check periodically if account has been reactivated
  useEffect(() => {
    if (!user) return;

    const checkAccountStatus = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data && data.status === "active") {
        // Account has been reactivated, redirect to appropriate dashboard
        if (role === "admin") {
          navigate("/dashboard/admin", { replace: true });
        } else if (role === "provider") {
          navigate("/dashboard/provider", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    };

    // Check immediately
    checkAccountStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkAccountStatus, 10000);

    return () => clearInterval(interval);
  }, [user, role, navigate]);

  const handleSendAppeal = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }

    setIsSending(true);
    try {
      // Send appeal using dedicated edge function
      const { data, error } = await supabase.functions.invoke("send-appeal", {
        body: {
          user_id: profile?.user_id,
          user_name: profile?.full_name,
          user_email: profile?.email,
          user_role: role,
          account_status: profile?.status,
          status_reason: profile?.status_reason,
          subject: subject.trim(),
          message: message.trim(),
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("Your appeal has been sent to the administrator");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Failed to send appeal:", error);
      toast.error("Failed to send appeal. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Status Card */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              {isBanned ? (
                <Ban className="h-8 w-8 text-destructive" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isBanned ? "Account Banned" : "Account Suspended"}
            </CardTitle>
            <CardDescription className="text-base">
              {isBanned
                ? "Your account has been permanently banned from BookEase."
                : "Your account has been temporarily suspended."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Reason for {isBanned ? "ban" : "suspension"}:</h4>
              <p className="text-muted-foreground">
                {profile?.status_reason || "No specific reason was provided. Please contact the administrator for more information."}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Logged in as: {profile?.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Appeal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Appeal to Administrator
            </CardTitle>
            <CardDescription>
              If you believe this action was made in error, you can send an appeal to our administrators.
              {!isBanned && " Your account may be reinstated after review."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailSent ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Appeal Sent Successfully</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Your appeal has been sent to the administrator. You will receive a response via email once your case has been reviewed.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setEmailSent(false)}
                >
                  Send Another Appeal
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your appeal"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Your Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Explain why you believe your account should be reinstated..."
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <Button 
                  onClick={handleSendAppeal} 
                  disabled={isSending || !subject.trim() || !message.trim()}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Appeal...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Appeal
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BlockedAccount;
