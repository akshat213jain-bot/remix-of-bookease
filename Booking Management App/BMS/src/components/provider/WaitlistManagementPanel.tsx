import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Clock, 
  Calendar,
  Trash2,
  Bell,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useProviderWaitlist, formatDayOfWeek, WaitlistEntryWithUser } from "@/hooks/useProviderWaitlist";

const formatTime = (time: string | null): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const WaitlistManagementPanel = () => {
  const { waitlistEntries, isLoading, removeEntry, isRemoving } = useProviderWaitlist();
  const [entryToRemove, setEntryToRemove] = useState<WaitlistEntryWithUser | null>(null);

  const handleRemoveClick = (entry: WaitlistEntryWithUser) => {
    setEntryToRemove(entry);
  };

  const handleConfirmRemove = () => {
    if (entryToRemove) {
      removeEntry(entryToRemove.id);
      setEntryToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Waitlist Management
          {waitlistEntries.length > 0 && (
            <Badge variant="secondary">{waitlistEntries.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {waitlistEntries.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No patients on your waitlist</p>
            <p className="text-sm text-muted-foreground mt-1">
              Patients waiting for available slots will appear here
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Preferred Time</TableHead>
                  <TableHead>Preference Type</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.user_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {entry.user_profile?.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {entry.user_profile?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.user_profile?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {entry.preferred_date && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(entry.preferred_date), "MMM d, yyyy")}
                          </div>
                        )}
                        {entry.preferred_day_of_week !== null && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDayOfWeek(entry.preferred_day_of_week)}s
                          </div>
                        )}
                        {entry.preferred_start_time && entry.preferred_end_time && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(entry.preferred_start_time)} - {formatTime(entry.preferred_end_time)}
                          </div>
                        )}
                        {!entry.preferred_date && entry.preferred_day_of_week === null && !entry.preferred_start_time && (
                          <span className="text-sm text-muted-foreground">Any available slot</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.is_flexible ? (
                        <Badge variant="secondary">Flexible</Badge>
                      ) : (
                        <Badge variant="outline">Specific</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(entry.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {entry.notified_at ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <Bell className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Waiting</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveClick(entry)}
                        disabled={isRemoving}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!entryToRemove} onOpenChange={() => setEntryToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Waitlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {entryToRemove?.user_profile?.full_name || "this patient"} from your waitlist? 
              They will no longer receive notifications about available slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default WaitlistManagementPanel;
