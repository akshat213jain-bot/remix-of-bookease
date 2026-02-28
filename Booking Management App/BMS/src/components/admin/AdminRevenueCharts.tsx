import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--destructive))",
];

import { formatCurrency } from "@/lib/currency";

const AdminRevenueCharts = () => {
  const { revenue, isLoadingRevenue, transactions, isLoadingTransactions } = useAdminPayments();

  if (isLoadingRevenue || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prepare revenue comparison data
  const revenueData = [
    { name: "Daily", amount: revenue?.daily.total || 0, count: revenue?.daily.count || 0 },
    { name: "Weekly", amount: revenue?.weekly.total || 0, count: revenue?.weekly.count || 0 },
    { name: "Monthly", amount: revenue?.monthly.total || 0, count: revenue?.monthly.count || 0 },
    { name: "Yearly", amount: revenue?.yearly.total || 0, count: revenue?.yearly.count || 0 },
  ];

  // Calculate status distribution from transactions
  const statusCounts = transactions.reduce((acc, tx) => {
    const status = tx.status === "succeeded" ? "Completed" : 
                   tx.status === "pending" || tx.status === "processing" ? "Processing" :
                   tx.status === "canceled" ? "Canceled" : "Other";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Calculate growth rates
  const dailyGrowth = revenue?.weekly.count && revenue?.daily.count 
    ? ((revenue.daily.count / (revenue.weekly.count / 7)) - 1) * 100 
    : 0;
  
  const weeklyGrowth = revenue?.monthly.count && revenue?.weekly.count
    ? ((revenue.weekly.count / (revenue.monthly.count / 4)) - 1) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Growth Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Growth</p>
                <p className={`text-2xl font-bold ${dailyGrowth >= 0 ? "text-primary" : "text-destructive"}`}>
                  {dailyGrowth >= 0 ? "+" : ""}{dailyGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">vs weekly average</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dailyGrowth >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                {dailyGrowth >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-primary" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weekly Growth</p>
                <p className={`text-2xl font-bold ${weeklyGrowth >= 0 ? "text-primary" : "text-destructive"}`}>
                  {weeklyGrowth >= 0 ? "+" : ""}{weeklyGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">vs monthly average</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${weeklyGrowth >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                {weeklyGrowth >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-primary" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                   <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4" />
              Payment Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No payment data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, "Transactions"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Yearly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{formatCurrency(revenue?.yearly.total || 0)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{revenue?.yearly.count || 0}</p>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {revenue?.yearly.count 
                  ? formatCurrency((revenue.yearly.total || 0) / revenue.yearly.count)
                  : formatCurrency(0)}
              </p>
              <p className="text-sm text-muted-foreground">Average Transaction</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">
                {formatCurrency((revenue?.monthly.total || 0))}
              </p>
              <p className="text-sm text-muted-foreground">Monthly Average</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenueCharts;
