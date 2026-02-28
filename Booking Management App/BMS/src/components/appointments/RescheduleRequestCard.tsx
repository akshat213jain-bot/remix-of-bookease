import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CalendarClock, 
  ArrowRight, 
  Check, 
  X, 
  Loader2,
  Clock 
} from "lucide-react";
import { format } from "date-fns";

interface RescheduleRequestCardProps {
  appointmentId: string;
  currentDate: string;
  currentTime: string;
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  reason?: string | null;
  requestedBy: "user" | "provider";
  providerName?: string;
  providerAvatar?: string | null;
  patientName?: string;
  patientAvatar?: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  isAccepting: boolean;
  isDeclining: boolean;
  isUserView?: boolean;
}

export const RescheduleRequestCard = ({
  appointmentId,
  currentDate,
  currentTime,
  proposedDate,
  proposedStartTime,
  proposedEndTime,
  reason,
  requestedBy,
  providerName,
  providerAvatar,
  patientName,
  patientAvatar,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
  isUserView = true,
}: RescheduleRequestCardProps) => {
  // All hooks must be called unconditionally at the top level
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "EEE, MMM d");
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const name = isUserView ? providerName : patientName;
  const avatar = isUserView ? providerAvatar : patientAvatar;
  const requesterLabel = requestedBy === "provider" ? "Provider" : "Patient";

  return (
    <Card className="border-accent bg-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatar || undefined} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{name || "Unknown"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reschedule requested by {requesterLabel}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-accent text-accent-foreground">
            <CalendarClock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time change visualization */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="font-medium text-sm">{formatDate(currentDate)}</p>
            <p className="text-sm text-muted-foreground">{formatTime(currentTime)}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Proposed</p>
            <p className="font-medium text-sm text-foreground">{formatDate(proposedDate)}</p>
            <p className="text-sm text-muted-foreground">{formatTime(proposedStartTime)}</p>
          </div>
        </div>

        {reason && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Reason:</p>
            <p className="text-sm">{reason}</p>
          </div>
        )}

        {/* Show actions only if it's a request from the other party */}
        {((isUserView && requestedBy === "provider") || (!isUserView && requestedBy === "user")) && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onDecline(appointmentId)}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </>
              )}
            </Button>
            <Button
              className="flex-1"
              onClick={() => onAccept(appointmentId)}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </>
              )}
            </Button>
          </div>
        )}

        {/* Show waiting message if user made the request */}
        {((isUserView && requestedBy === "user") || (!isUserView && requestedBy === "provider")) && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Clock className="h-4 w-4" />
            Waiting for {isUserView ? "provider" : "patient"} response...
          </div>
        )}
      </CardContent>
    </Card>
  );
};