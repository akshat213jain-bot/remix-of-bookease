import { useState, useEffect, useRef } from "react";
import { DailyVideoCall } from "./DailyVideoCall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Loader2,
  AlertCircle,
  UserCheck,
  Bell,
  CreditCard
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WaitingRoom } from "./WaitingRoom";

interface VideoConsultationProps {
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  providerName?: string;
  isProvider?: boolean;
  onClose?: () => void;
}

type VideoStatus = "not_started" | "provider_ready" | "patient_waiting" | "admitted" | "in_call" | "ended";

export const VideoConsultation = ({
  appointmentId,
  appointmentDate,
  startTime,
  endTime,
  providerName,
  isProvider = false,
  onClose,
}: VideoConsultationProps) => {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [meetingToken, setMeetingToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [patientWaiting, setPatientWaiting] = useState(false);
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const { toast } = useToast();

  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  // Check payment status on mount for non-providers
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (isProvider) {
        setIsCheckingPayment(false);
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("appointments")
          .select("payment_status, payment_amount, provider:provider_id(consultation_fee, video_consultation_fee, require_video_payment)")
          .eq("id", appointmentId)
          .single();

        if (error) throw error;
        setPaymentStatus(data?.payment_status || "unpaid");
        
        // Check if provider requires video payment
        const requiresPayment = data?.provider?.require_video_payment ?? true;
        
        // Use nullish coalescing to properly handle 0 values
        // If video_consultation_fee is explicitly set (including 0), use it
        // Otherwise fall back to consultation_fee, then payment_amount
        const videoFee = data?.provider?.video_consultation_fee;
        const consultationFee = data?.provider?.consultation_fee;
        const fee = videoFee ?? consultationFee ?? data?.payment_amount ?? 500;
        
        setPaymentAmount(fee);
        
        // If provider doesn't require payment OR fee is 0, mark as paid
        if (!requiresPayment || fee === 0) {
          setPaymentStatus("paid");
        }
      } catch (err) {
        console.error("Failed to check payment status:", err);
        setPaymentStatus("unpaid");
        setPaymentAmount(500); // Default fallback
      } finally {
        setIsCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, [appointmentId, isProvider]);

  // Subscribe to realtime updates for video status
  useEffect(() => {
    const channel = supabase
      .channel(`appointment-${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `id=eq.${appointmentId}`,
        },
        (payload) => {
          const newStatus = payload.new.video_status as VideoStatus;
          console.log("Video status changed:", newStatus);

          if (!isProvider && newStatus === "admitted") {
            // Patient was admitted - get room URL and join
            setIsWaiting(false);
            toast({
              title: "You're in!",
              description: "The provider has admitted you. Joining the call...",
            });
            // Fetch the room URL
            fetchRoomAfterAdmission();
          }

          if (isProvider && newStatus === "patient_waiting") {
            // Patient started waiting
            setPatientWaiting(true);
            toast({
              title: "Patient is waiting",
              description: "Your patient is ready to join the video call.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, isProvider]);

  const fetchRoomAfterAdmission = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-video-room", {
        body: { appointment_id: appointmentId },
      });

      if (error) throw error;

      if (data.room_url) {
        setRoomUrl(data.room_url);
        setMeetingToken(data.token);
        setUserName(data.user_name || "User");
      }
    } catch (err) {
      console.error("Failed to fetch room after admission:", err);
      setError("Failed to join the call. Please try again.");
    }
  };

  // Check if appointment time allows joining
  const canJoin = () => {
    const now = new Date();
    const appointmentStart = new Date(`${appointmentDate}T${startTime}`);
    const appointmentEnd = new Date(`${appointmentDate}T${endTime}`);

    // Allow joining 10 minutes before start until 30 minutes after end
    const earlyJoinWindow = new Date(appointmentStart.getTime() - 10 * 60 * 1000);
    const lateJoinWindow = new Date(appointmentEnd.getTime() + 30 * 60 * 1000);

    return now >= earlyJoinWindow && now <= lateJoinWindow;
  };

  const getTimeUntilStart = () => {
    const now = new Date();
    const appointmentStart = new Date(`${appointmentDate}T${startTime}`);
    const diff = appointmentStart.getTime() - now.getTime();

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  const createRoom = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-video-room", {
        body: { appointment_id: appointmentId },
      });

      if (error) throw error;

      // Handle different response statuses
      if (data.status === "waiting") {
        // Patient needs to wait
        setIsWaiting(true);
        toast({
          title: "Waiting for provider",
          description: data.message || "Please wait for the provider to let you in.",
        });
      } else if (data.room_url) {
        setRoomUrl(data.room_url);
        setMeetingToken(data.token);
        setUserName(data.user_name || "User");

        // Check if patient is waiting (for provider)
        if (isProvider && data.patient_waiting) {
          setPatientWaiting(true);
        }

        console.log("Video room ready:", data.room_url);
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (err) {
      console.error("Failed to create video room:", err);
      setError(err instanceof Error ? err.message : "Failed to create video room");
      toast({
        title: "Error",
        description: "Failed to start video consultation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const admitPatient = async () => {
    setIsAdmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admit-patient", {
        body: { appointment_id: appointmentId },
      });

      if (error) throw error;

      setPatientWaiting(false);
      toast({
        title: "Patient admitted",
        description: "The patient can now join the video call.",
      });
    } catch (err) {
      console.error("Failed to admit patient:", err);
      toast({
        title: "Error",
        description: "Failed to admit patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdmitting(false);
    }
  };

  const joinCall = () => {
    if (roomUrl) {
      setIsInCall(true);
    }
  };

  const leaveCall = () => {
    setIsInCall(false);
    setIsWaiting(false);
    setRoomUrl(null);
    setMeetingToken(null);
    if (onClose) {
      onClose();
    }
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      // Convert amount from rupees to paise (cents equivalent for INR)
      const amountInPaise = Math.round((paymentAmount || 500) * 100);
      
      const { data, error } = await supabase.functions.invoke("create-appointment-payment", {
        body: {
          appointment_id: appointmentId,
          amount: amountInPaise,
          provider_name: providerName || "Provider",
          appointment_date: appointmentDate,
          start_time: startTime,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      toast({
        title: "Payment Error",
        description: "Failed to start payment process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const timeUntilStart = getTimeUntilStart();
  const joinEnabled = canJoin();
  const isPaid = paymentStatus === "paid";

  // Show loading while checking payment
  if (isCheckingPayment && !isProvider) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Checking payment status...</p>
        </CardContent>
      </Card>
    );
  }

  // Show payment required screen for unpaid virtual consultations
  if (!isProvider && !isPaid) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Required
              </CardTitle>
              <CardDescription>
                Please complete payment to join your video consultation
              </CardDescription>
            </div>
            <Badge variant="destructive">Unpaid</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Payment is required to join</h3>
            <p className="text-muted-foreground mb-2">
              Your video consultation with <strong>{providerName || "your provider"}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {startTime} - {endTime}
            </p>
            <Button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now & Join
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Secure payment powered by Stripe
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If patient is waiting, show waiting room
  if (isWaiting && !isProvider) {
    return (
      <WaitingRoom
        providerName={providerName || "Your provider"}
        onLeave={leaveCall}
      />
    );
  }

  // If in call, show full-screen video
  if (isInCall && roomUrl && meetingToken) {
    return (
      <div className="fixed inset-0 z-50">
        <DailyVideoCall
          roomUrl={roomUrl}
          token={meetingToken || undefined}
          userName={userName}
          onLeave={leaveCall}
          isProvider={isProvider}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Consultation
            </CardTitle>
            <CardDescription>
              {isProvider
                ? "Start video call with your patient"
                : `Video call with ${providerName || "your provider"}`}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {startTime} - {endTime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!joinEnabled && timeUntilStart && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your video consultation starts in {timeUntilStart}. You can join 10 minutes before the scheduled time.
            </AlertDescription>
          </Alert>
        )}

        {/* Provider: Patient waiting notification */}
        {isProvider && patientWaiting && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <Bell className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-green-700 dark:text-green-400">
                Your patient is waiting to join the call
              </span>
              <Button
                size="sm"
                onClick={admitPatient}
                disabled={isAdmitting}
                className="ml-4"
              >
                {isAdmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Admitting...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Admit Patient
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!roomUrl ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              {isProvider
                ? "Click the button below to start your video consultation."
                : "Click the button below to join the waiting room."}
            </p>
            <Button
              onClick={createRoom}
              disabled={isLoading || !joinEnabled}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isProvider ? "Starting..." : "Joining..."}
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  {isProvider ? "Start Consultation" : "Join Waiting Room"}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              Your video room is ready. Click to join the call.
            </p>
            <div className="flex justify-center">
              <Button onClick={joinCall} size="lg">
                <Video className="h-4 w-4 mr-2" />
                Join Video Call
              </Button>
            </div>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-2">Tips for a good video call:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ensure you have a stable internet connection</li>
            <li>• Use a quiet, well-lit environment</li>
            <li>• Test your camera and microphone before joining</li>
            <li>• Close unnecessary browser tabs for better performance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};