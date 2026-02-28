import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Settings,
  Plus,
  MoreHorizontal,
  Loader2,
  CalendarDays,
  List,
  Video,
  CreditCard,
  Star,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments, AppointmentWithProvider } from "@/hooks/useAppointments";
import { useRescheduleRequests } from "@/hooks/useRescheduleRequests";
import { useUserReviews } from "@/hooks/useReviews";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { RescheduleDialog } from "@/components/appointments/RescheduleDialog";
import { RescheduleRequestCard } from "@/components/appointments/RescheduleRequestCard";
import { VideoConsultation } from "@/components/video/VideoConsultation";
import PaymentHistoryPanel from "@/components/payments/PaymentHistoryPanel";
import CalendarSyncCard from "@/components/calendar/CalendarSyncCard";
import ReviewDialog from "@/components/reviews/ReviewDialog";
import { InvoiceDownloadButton } from "@/components/payments/InvoiceDownloadButton";
import { PaymentButton } from "@/components/payments/PaymentButton";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useMinLoadingTime } from "@/hooks/useMinLoadingTime";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-primary/10 text-primary border-primary/20">Confirmed</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "rejected":
      return <Badge variant="destructive">Declined</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper to get correct fee based on appointment type
const getAppointmentFee = (appointment: AppointmentWithProvider): number => {
  if (appointment.is_video_consultation) {
    // For video consultations, prefer video_consultation_fee, fallback to consultation_fee
    return appointment.provider?.video_consultation_fee ||
      appointment.provider?.consultation_fee || 0;
  }
  // For physical appointments, use consultation_fee
  return appointment.provider?.consultation_fee || 0;
};

const UserDashboard = () => {
  const { user, profile, role } = useAuth();
  const {
    appointments,
    isLoading,
    cancelAppointment,
    isCancelling,
    rescheduleAppointment,
    isRescheduling
  } = useAppointments();
  const {
    acceptReschedule,
    isAccepting,
    declineReschedule,
    isDeclining,
  } = useRescheduleRequests();

  // Ensure loading screen shows for at least 2 seconds
  const showLoading = useMinLoadingTime(isLoading, 2000);

  const { hasReview } = useUserReviews();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithProvider | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

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

  const today = new Date();

  // Filter appointments
  const upcomingAppointments = appointments.filter(a => {
    const appointmentDate = parseISO(a.appointment_date);
    return (isAfter(appointmentDate, today) || isToday(appointmentDate)) &&
      (a.status === "approved" || a.status === "pending");
  });

  const pastAppointments = appointments.filter(a => {
    const appointmentDate = parseISO(a.appointment_date);
    return isBefore(appointmentDate, today) && !isToday(appointmentDate) || a.status === "completed";
  });

  const cancelledAppointments = appointments.filter(a =>
    a.status === "cancelled" || a.status === "rejected"
  );

  // Get appointments with pending reschedule requests from providers
  const rescheduleRequests = appointments.filter(a =>
    a.reschedule_requested_by === "provider" && a.proposed_date
  );

  const handleCancelClick = (appointment: AppointmentWithProvider) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleRescheduleClick = (appointment: AppointmentWithProvider) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  const handleViewDetailsClick = (appointment: AppointmentWithProvider) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const handleVideoClick = (appointment: AppointmentWithProvider) => {
    setSelectedAppointment(appointment);
    setVideoDialogOpen(true);
  };

  const handleReviewClick = (appointment: AppointmentWithProvider) => {
    setSelectedAppointment(appointment);
    setReviewDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (selectedAppointment) {
      cancelAppointment({ id: selectedAppointment.id, reason: cancelReason });
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
      setCancelReason("");
    }
  };

  const handleConfirmReschedule = (data: {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
  }) => {
    rescheduleAppointment(data);
    setRescheduleDialogOpen(false);
    setSelectedAppointment(null);
  };

  const renderAppointmentCard = (appointment: AppointmentWithProvider, showActions: boolean = true, showReviewButton: boolean = false) => {
    const isVideoAppointment = appointment.is_video_consultation;
    const canJoinVideo = appointment.status === "approved" && isVideoAppointment;
    const canReview = showReviewButton && appointment.status === "completed" && !hasReview(appointment.id);
    const showInvoice = appointment.status === "completed" && appointment.payment_amount && appointment.payment_amount > 0;

    // Show Pay Now button for pending/approved appointments that haven't been paid
    const appointmentFee = getAppointmentFee(appointment);
    const canPay =
      (appointment.status === "pending" || appointment.status === "approved") &&
      appointment.payment_status !== "paid" &&
      appointmentFee > 0;

    return (
      <Card key={appointment.id}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={appointment.provider_profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {appointment.provider_profile?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">
                    {appointment.provider_profile?.full_name || "Provider"}
                  </h3>
                  {getStatusBadge(appointment.status)}
                  {isVideoAppointment && (
                    <Badge variant="outline" className="text-xs">
                      <Video className="h-3 w-3 mr-1" />
                      Video
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {appointment.provider?.profession}
                  {appointment.provider?.specialty && ` • ${appointment.provider.specialty}`}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(parseISO(appointment.appointment_date), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(appointment.start_time)}</span>
                  </div>
                  {appointment.provider?.location && !isVideoAppointment && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{appointment.provider.location}</span>
                    </div>
                  )}
                </div>
                {appointment.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Notes: {appointment.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showInvoice && (
                <InvoiceDownloadButton
                  appointment={{
                    id: appointment.id,
                    appointment_date: appointment.appointment_date,
                    start_time: appointment.start_time,
                    end_time: appointment.end_time,
                    payment_amount: appointment.payment_amount,
                    payment_date: appointment.payment_date,
                    provider_name: appointment.provider_profile?.full_name,
                    provider_profession: appointment.provider?.profession,
                  }}
                  size="sm"
                  variant="outline"
                />
              )}

              {canPay && (
                <PaymentButton
                  appointmentId={appointment.id}
                  amount={appointmentFee}
                  providerName={appointment.provider_profile?.full_name || "Provider"}
                  appointmentDate={appointment.appointment_date}
                  startTime={appointment.start_time}
                  size="sm"
                />
              )}

              {canReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReviewClick(appointment)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Leave Review
                </Button>
              )}

              {canJoinVideo && (
                <Button
                  size="sm"
                  onClick={() => handleVideoClick(appointment)}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Video
                </Button>
              )}

              {showActions && (appointment.status === "approved" || appointment.status === "pending") && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDetailsClick(appointment)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRescheduleClick(appointment)}>
                      Reschedule
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleCancelClick(appointment)}
                    >
                      Cancel Appointment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (showLoading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground">Manage and track your appointments</p>
          </div>
          <div className="flex gap-3">
            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Link to="/providers">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - User Profile */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{profile?.full_name || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">{role}</Badge>
                </div>

                <nav className="space-y-1">
                  {role === "admin" && (
                    <Link
                      to="/dashboard/admin"
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Admin Dashboard</span>
                    </Link>
                  )}
                  {role === "provider" && (
                    <Link
                      to="/dashboard/provider"
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Provider Dashboard</span>
                    </Link>
                  )}
                  <Link
                    to="/dashboard/user"
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/10 text-primary"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Appointments</span>
                  </Link>
                  <Link
                    to="/dashboard/user/profile"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <Link
                    to="/dashboard/user/profile"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                </nav>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming</span>
                  <span className="font-semibold">{upcomingAppointments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-semibold">{pastAppointments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cancelled</span>
                  <span className="font-semibold">{cancelledAppointments.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Sync */}
            <div className="mt-6">
              <CalendarSyncCard
                appointments={appointments.map(a => ({
                  id: a.id,
                  appointment_date: a.appointment_date,
                  start_time: a.start_time,
                  end_time: a.end_time,
                  provider_name: a.provider_profile?.full_name,
                  is_video_consultation: a.is_video_consultation || false,
                  meeting_url: a.meeting_url || undefined,
                  notes: a.notes || undefined,
                  status: a.status,
                }))}
                isProvider={false}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Reschedule Requests from Providers */}
            {rescheduleRequests.length > 0 && (
              <div className="mb-6 space-y-4">
                <h2 className="text-lg font-semibold">Reschedule Requests</h2>
                {rescheduleRequests.map((appointment) => (
                  <RescheduleRequestCard
                    key={appointment.id}
                    appointmentId={appointment.id}
                    currentDate={appointment.appointment_date}
                    currentTime={appointment.start_time}
                    proposedDate={appointment.proposed_date!}
                    proposedStartTime={appointment.proposed_start_time!}
                    proposedEndTime={appointment.proposed_end_time!}
                    reason={appointment.reschedule_reason}
                    requestedBy="provider"
                    providerName={appointment.provider_profile?.full_name}
                    providerAvatar={appointment.provider_profile?.avatar_url}
                    onAccept={acceptReschedule}
                    onDecline={declineReschedule}
                    isAccepting={isAccepting}
                    isDeclining={isDeclining}
                    isUserView={true}
                  />
                ))}
              </div>
            )}

            {viewMode === "calendar" ? (
              <AppointmentCalendar
                appointments={appointments}
                selectedDate={selectedCalendarDate}
                onDateSelect={setSelectedCalendarDate}
              />
            ) : (
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList>
                  <TabsTrigger value="upcoming">
                    Upcoming ({upcomingAppointments.length})
                  </TabsTrigger>
                  <TabsTrigger value="past">
                    Past ({pastAppointments.length})
                  </TabsTrigger>
                  <TabsTrigger value="cancelled">
                    Cancelled ({cancelledAppointments.length})
                  </TabsTrigger>
                  <TabsTrigger value="payments">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Payments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-6 space-y-4">
                  {upcomingAppointments.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground mb-4">No upcoming appointments</p>
                        <Link to="/providers">
                          <Button>Book an Appointment</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ) : (
                    upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))
                  )}
                </TabsContent>

                <TabsContent value="past" className="mt-6 space-y-4">
                  {pastAppointments.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">No past appointments</p>
                      </CardContent>
                    </Card>
                  ) : (
                    pastAppointments.map((appointment) => renderAppointmentCard(appointment, false, true))
                  )}
                </TabsContent>

                <TabsContent value="cancelled" className="mt-6 space-y-4">
                  {cancelledAppointments.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">No cancelled appointments</p>
                      </CardContent>
                    </Card>
                  ) : (
                    cancelledAppointments.map((appointment) => renderAppointmentCard(appointment, false))
                  )}
                </TabsContent>

                <TabsContent value="payments" className="mt-6">
                  <PaymentHistoryPanel />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        appointment={selectedAppointment}
        onReschedule={handleConfirmReschedule}
        isRescheduling={isRescheduling}
      />

      {/* Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Video Consultation</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <VideoConsultation
              appointmentId={selectedAppointment.id}
              appointmentDate={selectedAppointment.appointment_date}
              startTime={selectedAppointment.start_time}
              endTime={selectedAppointment.end_time}
              providerName={selectedAppointment.provider_profile?.full_name}
              isProvider={false}
              onClose={() => setVideoDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      {selectedAppointment && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          appointmentId={selectedAppointment.id}
          providerId={selectedAppointment.provider_id}
          providerName={selectedAppointment.provider_profile?.full_name || "Provider"}
        />
      )}

      {/* View Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Full details for your appointment
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              {/* Provider Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedAppointment.provider_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedAppointment.provider_profile?.full_name?.charAt(0) || "P"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedAppointment.provider_profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.provider?.profession}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(parseISO(selectedAppointment.appointment_date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                  </span>
                </div>
                {selectedAppointment.is_video_consultation ? (
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Video Consultation</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedAppointment.provider?.location || "In-Person"}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Fee: ₹{getAppointmentFee(selectedAppointment)}
                  </span>
                  {selectedAppointment.payment_status === "paid" ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">Paid</Badge>
                  ) : (
                    <Badge variant="secondary">Unpaid</Badge>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(selectedAppointment.status)}
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default UserDashboard;