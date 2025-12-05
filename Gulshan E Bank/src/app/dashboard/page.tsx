
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoadingPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
            <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-[250px] mx-auto" />
        <Skeleton className="h-4 w-[200px] mx-auto" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
