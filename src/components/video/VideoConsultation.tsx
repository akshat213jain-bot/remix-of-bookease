import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoConsultationProps {
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  providerName?: string;
  isProvider?: boolean;
  onClose?: () => void;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

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

      if (data.room_url) {
        setRoomUrl(data.room_url);
        console.log("Video room ready:", data.room_url);
      } else {
        throw new Error("No room URL returned");
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

  const joinCall = () => {
    if (roomUrl) {
      setIsInCall(true);
    }
  };

  const leaveCall = () => {
    setIsInCall(false);
    if (onClose) {
      onClose();
    }
  };

  const openInNewTab = () => {
    if (roomUrl) {
      window.open(roomUrl, "_blank");
    }
  };

  const timeUntilStart = getTimeUntilStart();
  const joinEnabled = canJoin();

  if (isInCall && roomUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button variant="outline" size="sm" onClick={openInNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button variant="destructive" size="sm" onClick={leaveCall}>
            <Phone className="h-4 w-4 mr-2" />
            Leave Call
          </Button>
        </div>
        <iframe
          ref={iframeRef}
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Video Consultation"
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

        {!roomUrl ? (
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-10 w-10 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              Click the button below to start or join your video consultation.
            </p>
            <Button
              onClick={createRoom}
              disabled={isLoading || !joinEnabled}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Room...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  {isProvider ? "Start Consultation" : "Join Consultation"}
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
            <div className="flex justify-center gap-2">
              <Button onClick={joinCall} size="lg">
                <Video className="h-4 w-4 mr-2" />
                Join Video Call
              </Button>
              <Button variant="outline" onClick={openInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
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