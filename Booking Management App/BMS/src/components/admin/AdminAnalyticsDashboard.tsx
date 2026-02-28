import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  DollarSign,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--destructive))"];

import { formatCurrency } from "@/lib/currency";

type AdminAnalyticsDashboardProps = {
  /**
   * Whether to show the top KPI cards (Total Appointments, Active Providers, etc.).
   * AdminDashboard already has summary cards, so this can be disabled to avoid duplicates.
   */
  showKpis?: boolean;
};

const AdminAnalyticsDashboard = ({ showKpis = true }: AdminAnalyticsDashboardProps) => {
  const {
    overview,
    isLoadingOverview,
    bookingTrends,
    isLoadingTrends,
    providerPerformance,
    isLoadingProviderPerformance,
    timeSlotAnalytics,
    isLoadingTimeSlots,
  } = useAdminAnalytics();

  if (isLoadingOverview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Format trend data for charts
  const trendChartData = bookingTrends?.trends.slice(-14).map((t) => ({
    date: format(new Date(t.date), "MMM d"),
    bookings: t.bookings,
    completed: t.completed,
    cancelled: t.cancelled,
  })) || [];

  // Status distribution for pie chart
  const statusData = overview?.statusDistribution
    ? Object.entries(overview.statusDistribution)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          statusKey: name.toLowerCase(),
          value,
        }))
    : [];

  const getStatusColor = (statusKey: string, index: number) => {
    switch (statusKey) {
      case "completed":
        return "hsl(var(--primary))";
      case "approved":
        return "hsl(var(--chart-4))";
      case "pending":
        return "hsl(var(--chart-3))";
      case "rejected":
      case "cancelled":
        return "hsl(var(--destructive))";
      default:
        return "hsl(var(--chart-2))";
    }
  };

  // Format hourly distribution
  const hourlyData = timeSlotAnalytics?.hourlyDistribution.map((h) => ({
    hour: `${h.hour}:00`,
    appointments: h.count,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Overview KPI Cards */}
      {showKpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Appointments</p>
                  <p className="text-3xl font-bold">{overview?.totalAppointments || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Today: {overview?.todayAppointments || 0}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Providers</p>
                  <p className="text-3xl font-bold">
                    {overview?.activeProviders || 0}
                    <span className="text-base font-normal text-muted-foreground">
                      /{overview?.totalProviders || 0}
                    </span>
                  </p>
                </div>
                <div className="p-3 rounded-full bg-accent/30">
                  <Users className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold">{overview?.completionRate || 0}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    {parseFloat(overview?.completionRate || "0") >= 80 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">vs target 80%</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{overview?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cancellation: {overview?.cancellationRate || 0}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Booking Trends & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Booking Trends (14 Days)</CardTitle>
              {bookingTrends?.summary && (
                <Badge
                  variant={bookingTrends.summary.weeklyGrowth >= 0 ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {bookingTrends.summary.weeklyGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {bookingTrends.summary.weeklyGrowth.toFixed(1)}% WoW
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      name="Total Bookings"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      name="Completed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Appointment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {statusData.map((status, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getStatusColor(status.statusKey, index)}
                          stroke="transparent"
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <Tooltip cursor={false}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No appointment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Slot Analytics & Provider Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Peak Hours Analysis
              </CardTitle>
              {timeSlotAnalytics && (
                <Badge variant="secondary">
                  Busiest: {timeSlotAnalytics.busiestDay}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTimeSlots ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                Top Providers
              </CardTitle>
              {providerPerformance?.summary && (
                <Badge variant="outline">
                  Avg Rating: {providerPerformance.summary.avgRating}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingProviderPerformance ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {providerPerformance?.providers.slice(0, 5).map((provider, index) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{provider.name}</p>
                        <p className="text-xs text-muted-foreground">{provider.profession}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {provider.rating.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {provider.totalAppointments} appointments
                      </p>
                    </div>
                  </div>
                ))}
                {(!providerPerformance?.providers || providerPerformance.providers.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No provider data available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider Performance Summary */}
      {providerPerformance?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Platform Revenue Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{providerPerformance.summary.totalProviders}</p>
                <p className="text-sm text-muted-foreground">Total Providers</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{providerPerformance.summary.activeProviders}</p>
                <p className="text-sm text-muted-foreground">Active Providers</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{providerPerformance.summary.totalAppointments}</p>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(providerPerformance.summary.totalRevenue)}
                </p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;
