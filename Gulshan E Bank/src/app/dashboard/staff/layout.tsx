
"use client"

import { ProtectedRoute } from "@/hooks/use-auth";
import { AppBar } from "@/components/common/app-bar";
import { AppSidebarNav } from "@/components/common/staff/app-sidebar-nav";
import { Sidebar, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar>
            <SidebarHeader title="Staff Portal" />
            <AppSidebarNav />
        </Sidebar>
        <div className="flex flex-col">
            <AppBar>
                <SidebarTrigger />
            </AppBar>
            <main className="flex-1 bg-muted/40 p-4 md:p-8 pt-16 md:pt-8">
                {children}
            </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
