import Layout from "@/components/layout/Layout";
import { UserAnalyticsDashboard } from "@/components/analytics/UserAnalyticsDashboard";
import { BookingHistoryExport } from "@/components/booking/BookingHistoryExport";
import { BarChart3 } from "lucide-react";

const Analytics = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Your Analytics</h1>
              <p className="text-muted-foreground">
                Track your booking history, spending patterns, and more
              </p>
            </div>
          </div>
          <BookingHistoryExport />
        </div>

        <UserAnalyticsDashboard />
      </div>
    </Layout>
  );
};

export default Analytics;
