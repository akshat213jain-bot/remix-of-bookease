import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  created_at: string;
}

interface AdminStatsChartsProps {
  appointments: Appointment[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted))", "#22c55e", "#f59e0b"];

const AdminStatsCharts = ({ appointments }: AdminStatsChartsProps) => {
  // Calculate daily bookings for last 7 days
  const getDailyBookingsData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, "MMM d"),
        fullDate: startOfDay(date).toISOString(),
        bookings: 0,
      };
    });

    appointments.forEach((apt) => {
      const aptDate = startOfDay(parseISO(apt.created_at)).toISOString();
      const dayEntry = last7Days.find((d) => d.fullDate === aptDate);
      if (dayEntry) {
        dayEntry.bookings++;
      }
    });

    return last7Days;
  };

  // Calculate status distribution
  const getStatusDistribution = () => {
    const statusCounts: Record<string, number> = {
      completed: 0,
      approved: 0,
      pending: 0,
      cancelled: 0,
      rejected: 0,
    };

    appointments.forEach((apt) => {
      if (apt.status in statusCounts) {
        statusCounts[apt.status]++;
      }
    });

    return Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
  };

  const dailyBookings = getDailyBookingsData();
  const statusDistribution = getStatusDistribution();

  // Calculate cancellation rate
  const totalAppointments = appointments.length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled" || a.status === "rejected").length;
  const cancellationRate = totalAppointments > 0 ? ((cancelledCount / totalAppointments) * 100).toFixed(1) : "0";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Bookings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Bookings (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Status Distribution</CardTitle>
            <div className="text-sm text-muted-foreground">
              Cancellation Rate: <span className="font-medium text-foreground">{cancellationRate}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
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
  );
};

export default AdminStatsCharts;
