import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CreditCard,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  AlertCircle,
} from "lucide-react";
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
} from "recharts";
import { useProviderEarnings } from "@/hooks/useProviderEarnings";
import { useProviderPendingPayments } from "@/hooks/useProviderPendingPayments";
import { format, parseISO } from "date-fns";

import { formatCurrency } from "@/lib/currency";
import { useCurrencySettings } from "@/hooks/useSystemSettings";
import PendingPaymentsPanel from "./PendingPaymentsPanel";

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200">Paid</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "refunded":
      return <Badge variant="destructive">Refunded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export const ProviderEarningsDashboard = () => {
  const currency = useCurrencySettings();
  const {
    earnings,
    monthlyTrends,
    isLoadingEarnings,
    transactions,
    isLoadingTransactions,
    payouts,
    payoutsSummary,
    isLoadingPayouts,
  } = useProviderEarnings();

  if (isLoadingEarnings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate growth percentages
  const weeklyGrowth = earnings?.weekly && earnings?.daily
    ? earnings.daily.total > 0
      ? ((earnings.weekly.total / 7 - earnings.daily.total) / earnings.daily.total) * 100
      : 0
    : 0;

  const monthlyGrowth = earnings?.monthly && earnings?.weekly
    ? earnings.weekly.total > 0
      ? ((earnings.monthly.total / 4 - earnings.weekly.total) / earnings.weekly.total) * 100
      : 0
    : 0;

  // Prepare chart data
  const chartData = monthlyTrends || [];

  const distributionData = [
    { name: "This Week", value: earnings?.weekly?.total || 0 },
    { name: "Previous", value: (earnings?.monthly?.total || 0) - (earnings?.weekly?.total || 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(earnings?.daily?.total || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {earnings?.daily?.count || 0} appointments
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{formatCurrency(earnings?.weekly?.total || 0)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {weeklyGrowth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${weeklyGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {Math.abs(weeklyGrowth).toFixed(1)}% vs daily avg
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(earnings?.monthly?.total || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {earnings?.monthly?.count || 0} appointments
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(earnings?.pending?.total || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {earnings?.pending?.count || 0} upcoming paid appointments
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Info */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Payments
            {earnings?.pending?.count && earnings.pending.count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-orange-500 text-white rounded-full">
                {earnings.pending.count}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Earnings Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Earnings Trend (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value)}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Earnings"]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar
                        dataKey="earnings"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No earnings data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" />
                  Lifetime Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(earnings?.allTime?.total || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    From {earnings?.allTime?.count || 0} appointments
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This Year</span>
                    <span className="font-semibold">{formatCurrency(earnings?.yearly?.total || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-semibold">{formatCurrency(earnings?.monthly?.total || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg/Appointment</span>
                    <span className="font-semibold">
                      {earnings?.allTime?.count
                      ? formatCurrency((earnings.allTime.total) / earnings.allTime.count)
                        : formatCurrency(0)
                      }
                    </span>
                  </div>
                </div>

                {distributionData.length > 0 && (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        dataKey="value"
                        label={({ name }) => name}
                      >
                        {distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.patient_name}</p>
                            {tx.patient_email && (
                              <p className="text-xs text-muted-foreground">{tx.patient_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(tx.appointment_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{formatTime(tx.start_time)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(tx.amount || 0)}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(tx.payment_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <PendingPaymentsPanel />
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Completed Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPayouts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-200">
                      <p className="text-sm text-muted-foreground">Total Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(payoutsSummary?.total_paid || 0)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Completed Appointments</p>
                      <p className="text-2xl font-bold">{payoutsSummary?.payout_count || 0}</p>
                    </div>
                  </div>

                  {/* Payout List */}
                  {payouts && payouts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>
                              {payout.date
                                ? format(parseISO(payout.date), "MMM d, yyyy")
                                : "—"
                              }
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(payout.amount || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                {payout.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed payouts yet
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderEarningsDashboard;
