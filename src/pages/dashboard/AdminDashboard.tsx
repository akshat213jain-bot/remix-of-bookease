import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Calendar,
  TrendingUp,
  Settings,
  Search,
  UserCheck,
  UserX,
  MoreHorizontal,
  Shield,
  Loader2,
  Clock,
  BarChart3,
  CreditCard,
  Mail,
  AlertTriangle,
  Database,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminData } from "@/hooks/useAdminData";
import { format, parseISO } from "date-fns";
import UserManagement from "@/components/admin/UserManagement";
import AdminPaymentsPanel from "@/components/admin/AdminPaymentsPanel";
import AdminRevenueCharts from "@/components/admin/AdminRevenueCharts";
import AdminAnalyticsDashboard from "@/components/admin/AdminAnalyticsDashboard";
import SystemSettings from "@/components/admin/SystemSettings";
import EmailTemplatesPanel from "@/components/admin/EmailTemplatesPanel";
import ApprovalRequestsPanel from "@/components/admin/ApprovalRequestsPanel";
import EmailDeliveryPanel from "@/components/admin/EmailDeliveryPanel";
import { SubscriptionPlansPanel } from "@/components/admin/SubscriptionPlansPanel";
import { DisputesPanel } from "@/components/disputes/DisputesPanel";
import { DataExportPanel } from "@/components/admin/DataExportPanel";
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
    case "completed":
      return <Badge className="bg-primary/10 text-primary">Completed</Badge>;
    case "approved":
      return <Badge className="bg-primary/10 text-primary">Confirmed</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const AdminDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [appointmentPage, setAppointmentPage] = useState(0);
  const PAGE_SIZE = 20;
  const {
    appointments,
    pendingProviders,
    isLoading,
    approveProvider,
    rejectProvider,
    isApproving,
    isRejecting,
    getStats,
  } = useAdminData();

  // Ensure loading screen shows for at least 2 seconds
  const showLoading = useMinLoadingTime(isLoading, 2000);

  const stats = getStats();

  const statCards = [
    { label: "Total Appointments", value: stats.totalAppointments.toString(), icon: Calendar, trend: "All time", color: "text-primary" },
    { label: "Pending Providers", value: stats.pendingProviders.toString(), icon: Clock, trend: "Awaiting approval", color: "text-amber-600" },
    { label: "Completed", value: stats.completedAppointments.toString(), icon: UserCheck, trend: "Sessions done", color: "text-emerald-600" },
    { label: "Pending Bookings", value: stats.pendingAppointments.toString(), icon: Users, trend: "Awaiting confirmation", color: "text-blue-600" },
  ];

  // Filter appointments
  const filteredAppointments = appointments.filter(apt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.user_profile?.full_name?.toLowerCase().includes(query) ||
      apt.provider_profile?.full_name?.toLowerCase().includes(query) ||
      apt.status.toLowerCase().includes(query)
    );
  });

  if (showLoading) {
    return <LoadingScreen message="Loading admin panel..." />;
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">System overview and management</p>
          </div>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-foreground/80">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <div>
            <TabsList className="flex w-full bg-muted/50 p-0.5 rounded-md h-8">
              <TabsTrigger value="analytics" className="text-xs flex-1 px-1 py-1 h-7">
                <BarChart3 className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="approvals" className="text-xs flex-1 px-1 py-1 h-7">
                Approvals
              </TabsTrigger>
              <TabsTrigger value="providers" className="text-xs flex-1 px-1 py-1 h-7">
                Providers
              </TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs flex-1 px-1 py-1 h-7">
                Appts
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs flex-1 px-1 py-1 h-7">
                Payments
              </TabsTrigger>
              <TabsTrigger value="revenue" className="text-xs flex-1 px-1 py-1 h-7">
                Revenue
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs flex-1 px-1 py-1 h-7">
                Users
              </TabsTrigger>
              <TabsTrigger value="emails" className="text-xs flex-1 px-1 py-1 h-7">
                Emails
              </TabsTrigger>
              <TabsTrigger value="delivery" className="text-xs flex-1 px-1 py-1 h-7">
                Delivery
              </TabsTrigger>
              <TabsTrigger value="disputes" className="text-xs flex-1 px-1 py-1 h-7">
                Disputes
              </TabsTrigger>
              <TabsTrigger value="export" className="text-xs flex-1 px-1 py-1 h-7">
                Export
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs flex-1 px-1 py-1 h-7">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* System Analytics Dashboard */}
          <TabsContent value="analytics">
            <AdminAnalyticsDashboard showKpis={false} />
          </TabsContent>

          {/* All Approval Requests */}
          <TabsContent value="approvals">
            <ApprovalRequestsPanel />
          </TabsContent>

          {/* Provider Approvals */}
          <TabsContent value="providers">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Pending Provider Approvals
                    <Badge variant="secondary">{pendingProviders.length}</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {pendingProviders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending provider approvals
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingProviders.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={provider.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {provider.profile?.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {provider.profile?.full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {provider.profession}
                              {provider.specialty && ` • ${provider.specialty}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {provider.profile?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">
                              Applied: {format(parseISO(provider.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveProvider(provider.id)}
                              disabled={isApproving || isRejecting}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectProvider(provider.id)}
                              disabled={isApproving || isRejecting}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Appointments */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <CardTitle>All Appointments</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search appointments..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No appointments found
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.slice(appointmentPage * PAGE_SIZE, (appointmentPage + 1) * PAGE_SIZE).map((apt) => (
                          <TableRow key={apt.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={apt.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {apt.user_profile?.full_name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("") || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {apt.user_profile?.full_name || "Unknown"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {apt.user_profile?.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {apt.provider_profile?.full_name || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {apt.provider_info?.profession}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">
                                  {format(parseISO(apt.appointment_date), "MMM d, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(apt.start_time)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(apt.status)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
                                  <DropdownMenuItem>Contact Patient</DropdownMenuItem>
                                  <DropdownMenuItem>Contact Provider</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredAppointments.length > PAGE_SIZE && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {appointmentPage * PAGE_SIZE + 1}–{Math.min((appointmentPage + 1) * PAGE_SIZE, filteredAppointments.length)} of {filteredAppointments.length}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={appointmentPage === 0}
                            onClick={() => setAppointmentPage(p => p - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={(appointmentPage + 1) * PAGE_SIZE >= filteredAppointments.length}
                            onClick={() => setAppointmentPage(p => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <AdminPaymentsPanel />
          </TabsContent>

          {/* Revenue Reports */}
          <TabsContent value="revenue">
            <AdminRevenueCharts />
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Email Templates */}
          <TabsContent value="emails">
            <EmailTemplatesPanel />
          </TabsContent>

          {/* Email Delivery Tracking */}
          <TabsContent value="delivery">
            <EmailDeliveryPanel />
          </TabsContent>

          {/* Disputes Management */}
          <TabsContent value="disputes">
            <DisputesPanel />
          </TabsContent>

          {/* Data Export for Developers */}
          <TabsContent value="export">
            <DataExportPanel />
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
