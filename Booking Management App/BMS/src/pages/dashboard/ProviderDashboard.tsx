import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Settings,
  Bell,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  CalendarDays,
  BarChart3,
  User,
  Loader2,
  Video,
  CalendarClock,
  DollarSign,
  Star,
  ListChecks,
  Mail,
  Send,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { useProviderProfile } from "@/hooks/useProfile";
import { useProviderAppointments, ProviderAppointment } from "@/hooks/useProviderAppointments";
import { useRescheduleRequests } from "@/hooks/useRescheduleRequests";
import { format, parseISO } from "date-fns";
import { ProviderRescheduleDialog } from "@/components/appointments/ProviderRescheduleDialog";
import { RescheduleRequestCard } from "@/components/appointments/RescheduleRequestCard";
import { VideoConsultation } from "@/components/video/VideoConsultation";
import CalendarSyncCard from "@/components/calendar/CalendarSyncCard";
import ProviderEarningsDashboard from "@/components/provider/ProviderEarningsDashboard";
import WaitlistManagementPanel from "@/components/provider/WaitlistManagementPanel";
import ProviderReviewsPanel from "@/components/provider/ProviderReviewsPanel";
import ProviderAnalyticsDashboard from "@/components/provider/ProviderAnalyticsDashboard";
import { PaymentUpdateDialog } from "@/components/provider/PaymentUpdateDialog";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useMinLoadingTime } from "@/hooks/useMinLoadingTime";

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

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

const ProviderDashboard = () => {
  const [activeTab, setActiveTab] = useState<"schedule" | "earnings" | "waitlist" | "reviews" | "analytics">("schedule");
  const { profile } = useAuth();
  const { providerProfile } = useProviderProfile();
  const {
    appointments,
    isLoading,
    updateStatus,
    isUpdating,
    updatePayment,
    isUpdatingPayment,
    getTodayAppointments,
    getPendingAppointments,
    getUpcomingAppointments,
  } = useProviderAppointments();
  const {
    proposeReschedule,
    isProposing,
    acceptReschedule,
    isAccepting,
    declineReschedule,
    isDeclining,
  } = useRescheduleRequests();

  const { toast } = useToast();
  // Ensure loading screen shows for at least 2 seconds
  const showLoading = useMinLoadingTime(isLoading, 2000);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ProviderAppointment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const todayAppointments = getTodayAppointments();
  const pendingRequests = getPendingAppointments();
  const upcomingAppointments = getUpcomingAppointments();

  // Get appointments with pending reschedule requests from patients
  const rescheduleRequests = appointments.filter(a =>
    a.reschedule_requested_by === "user" &&
    a.proposed_date
  );

  // Calculate stats
  const approvedCount = appointments.filter(a => a.status === "approved").length;
  const completedCount = appointments.filter(a => a.status === "completed").length;
  const totalPatients = new Set(appointments.map(a => a.user_id)).size;
  const videoAppointments = appointments.filter(a =>
    a.is_video_consultation && a.status === "approved"
  );

  const stats = [
    { label: "Today's Appointments", value: todayAppointments.length.toString(), icon: Calendar, trend: "Scheduled" },
    { label: "Pending Requests", value: pendingRequests.length.toString(), icon: Clock, trend: "Awaiting response" },
    { label: "Total Patients", value: totalPatients.toString(), icon: Users, trend: "All time" },
    { label: "Video Calls", value: videoAppointments.length.toString(), icon: Video, trend: "Upcoming" },
  ];

  const handleApprove = (appointment: ProviderAppointment) => {
    updateStatus({ id: appointment.id, status: "approved", appointment });
  };

  const handleRejectClick = (appointment: ProviderAppointment) => {
    setSelectedAppointment(appointment);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (selectedAppointment) {
      updateStatus({
        id: selectedAppointment.id,
        status: "rejected",
        cancellation_reason: rejectReason,
        appointment: selectedAppointment
      });
      setRejectDialogOpen(false);
      setSelectedAppointment(null);
      setRejectReason("");
    }
  };

  const handleComplete = (appointment: ProviderAppointment) => {
    updateStatus({ id: appointment.id, status: "completed", appointment });
  };

  const handleRescheduleClick = (appointment: ProviderAppointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  const handleVideoClick = (appointment: ProviderAppointment) => {
    setSelectedAppointment(appointment);
    setVideoDialogOpen(true);
  };

  const handleContactClick = (appointment: ProviderAppointment) => {
    setSelectedAppointment(appointment);
    setContactSubject(`Regarding your appointment on ${format(parseISO(appointment.appointment_date), "MMMM d, yyyy")}`);
    setContactMessage("");
    setContactDialogOpen(true);
  };

  const handlePaymentClick = (appointment: ProviderAppointment) => {
    setSelectedAppointment(appointment);
    setPaymentDialogOpen(true);
  };

  const handlePaymentUpdate = (data: {
    id: string;
    payment_status: string;
    payment_method: string;
    payment_amount?: number;
  }) => {
    updatePayment(data);
    setPaymentDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleSendContactEmail = async () => {
    if (!selectedAppointment?.user_profile?.email || !contactSubject || !contactMessage) {
      toast({
        title: "Missing information",
        description: "Please fill in both subject and message.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          user_id: selectedAppointment.user_id,
          title: contactSubject,
          message: contactMessage,
          type: "info",
          related_appointment_id: selectedAppointment.id,
          recipient_email: selectedAppointment.user_profile.email,
          recipient_name: selectedAppointment.user_profile.full_name,
          send_email: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Message sent",
        description: `Email sent to ${selectedAppointment.user_profile.full_name}.`,
      });
      setContactDialogOpen(false);
      setSelectedAppointment(null);
      setContactSubject("");
      setContactMessage("");
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send",
        description: "There was an error sending the email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleProposeReschedule = (data: {
    id: string;
    proposed_date: string;
    proposed_start_time: string;
    proposed_end_time: string;
    reschedule_reason?: string;
  }) => {
    proposeReschedule(data);
    setRescheduleDialogOpen(false);
    setSelectedAppointment(null);
  };

  if (showLoading) {
    return <LoadingScreen message="Loading provider dashboard..." />;
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Provider"}
            </h1>
            <p className="text-muted-foreground">Here's your schedule overview</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/provider/availability" className="flex items-center w-full">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Set Availability
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/provider/profile" className="flex items-center w-full">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("analytics")} className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/dashboard/provider/availability">
              <Button>
                <CalendarDays className="h-4 w-4 mr-2" />
                Manage Availability
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "schedule" | "earnings" | "waitlist" | "reviews" | "analytics")} className="mb-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Waitlist
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "earnings" ? (
          <ProviderEarningsDashboard />
        ) : activeTab === "analytics" ? (
          <ProviderAnalyticsDashboard />
        ) : activeTab === "waitlist" ? (
          <WaitlistManagementPanel />
        ) : activeTab === "reviews" ? (
          <ProviderReviewsPanel />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <stat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Reschedule Requests from Patients */}
            {rescheduleRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Reschedule Requests from Patients</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rescheduleRequests.map((appointment) => (
                    <RescheduleRequestCard
                      key={appointment.id}
                      appointmentId={appointment.id}
                      currentDate={appointment.appointment_date}
                      currentTime={appointment.start_time}
                      proposedDate={appointment.proposed_date}
                      proposedStartTime={appointment.proposed_start_time}
                      proposedEndTime={appointment.proposed_end_time}
                      reason={appointment.reschedule_reason}
                      requestedBy="user"
                      patientName={appointment.user_profile?.full_name}
                      patientAvatar={appointment.user_profile?.avatar_url}
                      onAccept={acceptReschedule}
                      onDecline={declineReschedule}
                      isAccepting={isAccepting}
                      isDeclining={isDeclining}
                      isUserView={false}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Today's Schedule */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Today's Schedule</CardTitle>
                    <Badge variant="outline">{format(new Date(), "EEEE, MMM d")}</Badge>
                  </CardHeader>
                  <CardContent>
                    {todayAppointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No appointments scheduled for today
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {todayAppointments.map((appointment) => {
                          const isVideoAppointment = appointment.is_video_consultation;

                          return (
                            <div
                              key={appointment.id}
                              className="flex items-center justify-between p-4 rounded-lg border"
                            >
                              <div className="flex items-center gap-4">
                                <Avatar>
                                  <AvatarImage src={appointment.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {appointment.user_profile?.full_name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("") || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {appointment.user_profile?.full_name || "Patient"}
                                    </p>
                                    {getStatusBadge(appointment.status)}
                                    {isVideoAppointment && (
                                      <Badge variant="outline" className="text-xs">
                                        <Video className="h-3 w-3 mr-1" />
                                        Video
                                      </Badge>
                                    )}
                                    {/* Payment Status Badge */}
                                    {!isVideoAppointment && appointment.status === "approved" && (
                                      <Badge
                                        variant={appointment.payment_status === "paid" ? "default" : "destructive"}
                                        className={`text-xs ${appointment.payment_status === "paid" ? "bg-green-600" : ""}`}
                                      >
                                        {appointment.payment_status === "paid" ? "✅ Paid" : "❌ Unpaid"}
                                      </Badge>
                                    )}
                                    {appointment.payment_status === "paid" && appointment.payment_method && (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {appointment.payment_method}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                    </span>
                                  </div>
                                  {appointment.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                      {appointment.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isVideoAppointment && appointment.status === "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleVideoClick(appointment)}
                                  >
                                    <Video className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleComplete(appointment)}>
                                      Mark as Completed
                                    </DropdownMenuItem>
                                    {/* Update Payment - only for physical visits */}
                                    {!isVideoAppointment && (
                                      <DropdownMenuItem onClick={() => handlePaymentClick(appointment)}>
                                        <Wallet className="h-4 w-4 mr-2" />
                                        Update Payment
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleRescheduleClick(appointment)}>
                                      <CalendarClock className="h-4 w-4 mr-2" />
                                      Suggest New Time
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleContactClick(appointment)}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Contact Patient
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleRejectClick(appointment)}
                                    >
                                      Cancel Appointment
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Appointments */}
                <Card className="mt-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 text-primary" />
                      Upcoming Appointments
                    </CardTitle>
                    <Badge variant="secondary">{upcomingAppointments.length}</Badge>
                  </CardHeader>
                  <CardContent>
                    {upcomingAppointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No upcoming appointments
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingAppointments.slice(0, 10).map((appointment) => {
                          const isVideoAppointment = appointment.is_video_consultation;
                          const appointmentDate = parseISO(appointment.appointment_date);
                          const isToday = format(appointmentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                          return (
                            <div
                              key={appointment.id}
                              className="flex items-center justify-between p-4 rounded-lg border"
                            >
                              <div className="flex items-center gap-4">
                                <Avatar>
                                  <AvatarImage src={appointment.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {appointment.user_profile?.full_name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("") || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {appointment.user_profile?.full_name || "Patient"}
                                    </p>
                                    {getStatusBadge(appointment.status)}
                                    {isVideoAppointment && (
                                      <Badge variant="outline" className="text-xs">
                                        <Video className="h-3 w-3 mr-1" />
                                        Video
                                      </Badge>
                                    )}
                                    {isToday && (
                                      <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                        Today
                                      </Badge>
                                    )}
                                    {/* Payment Status Badge */}
                                    {!isVideoAppointment && (
                                      <Badge
                                        variant={appointment.payment_status === "paid" ? "default" : "destructive"}
                                        className={`text-xs ${appointment.payment_status === "paid" ? "bg-green-600" : ""}`}
                                      >
                                        {appointment.payment_status === "paid" ? "✅ Paid" : "❌ Unpaid"}
                                      </Badge>
                                    )}
                                    {appointment.payment_status === "paid" && appointment.payment_method && (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {appointment.payment_method}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(appointmentDate, "MMM d, yyyy")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                    </span>
                                  </div>
                                  {appointment.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                                      {appointment.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isVideoAppointment && appointment.status === "approved" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleVideoClick(appointment)}
                                  >
                                    <Video className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleComplete(appointment)}>
                                      Mark as Completed
                                    </DropdownMenuItem>
                                    {/* Update Payment - only for physical visits */}
                                    {!isVideoAppointment && (
                                      <DropdownMenuItem onClick={() => handlePaymentClick(appointment)}>
                                        <Wallet className="h-4 w-4 mr-2" />
                                        Update Payment
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleRescheduleClick(appointment)}>
                                      <CalendarClock className="h-4 w-4 mr-2" />
                                      Suggest New Time
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleContactClick(appointment)}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Contact Patient
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleRejectClick(appointment)}
                                    >
                                      Cancel Appointment
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Pending Requests */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Pending Requests</span>
                      <Badge variant="secondary">{pendingRequests.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No pending requests
                      </p>
                    ) : (
                      pendingRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="space-y-3 pb-4 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={request.user_profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {request.user_profile?.full_name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {request.user_profile?.full_name || "Patient"}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">New</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(request.appointment_date), "MMM d, yyyy")} at {formatTime(request.start_time)}
                          </div>
                          {request.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">
                              {request.notes}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8"
                              onClick={() => handleApprove(request)}
                              disabled={isUpdating}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8"
                              onClick={() => handleRejectClick(request)}
                              disabled={isUpdating}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Calendar Sync */}
                <CalendarSyncCard
                  appointments={appointments.map(a => ({
                    id: a.id,
                    appointment_date: a.appointment_date,
                    start_time: a.start_time,
                    end_time: a.end_time,
                    patient_name: a.user_profile?.full_name,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    is_video_consultation: (a as any).is_video_consultation || false,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    meeting_url: (a as any).meeting_url,
                    notes: a.notes || undefined,
                    status: a.status,
                  }))}
                  isProvider={true}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this appointment request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for declining (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isUpdating}
            >
              {isUpdating ? "Declining..." : "Decline Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Reschedule Dialog */}
      {selectedAppointment && (
        <ProviderRescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          appointmentId={selectedAppointment.id}
          providerId={providerProfile?.id || ""}
          currentDate={format(parseISO(selectedAppointment.appointment_date), "MMM d, yyyy")}
          currentTime={selectedAppointment.start_time}
          patientName={selectedAppointment.user_profile?.full_name || "Patient"}
          onPropose={handleProposeReschedule}
          isProposing={isProposing}
        />
      )}

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
              providerName={selectedAppointment.user_profile?.full_name}
              isProvider={true}
              onClose={() => setVideoDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Patient Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Patient
            </DialogTitle>
            <DialogDescription>
              Send an email to {selectedAppointment?.user_profile?.full_name || "the patient"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Write your message to the patient..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendContactEmail}
              disabled={isSendingEmail || !contactSubject || !contactMessage}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Update Dialog */}
      {selectedAppointment && (
        <PaymentUpdateDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          appointmentId={selectedAppointment.id}
          patientName={selectedAppointment.user_profile?.full_name || "Patient"}
          currentPaymentStatus={selectedAppointment.payment_status || undefined}
          currentPaymentMethod={selectedAppointment.payment_method || undefined}
          currentPaymentAmount={selectedAppointment.payment_amount || undefined}
          onUpdate={handlePaymentUpdate}
          isUpdating={isUpdatingPayment}
        />
      )}
    </Layout>
  );
};

export default ProviderDashboard;