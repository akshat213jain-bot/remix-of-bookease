
"use client";

import { AppSidebarNav } from "@/components/common/customer/app-sidebar-nav";
import { ProtectedRoute } from "@/hooks/use-auth";
import { AppBar } from "@/components/common/app-bar";
import { Sidebar, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";


export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar>
            <SidebarHeader title="Gulshan eBank" />
            <AppSidebarNav />
        </Sidebar>
        <div className="flex flex-col">
           <AppBar>
                <SidebarTrigger>
                   <SidebarHeader title="Gulshan eBank" />
                   <AppSidebarNav />
                </SidebarTrigger>
            </AppBar>
            <main className="flex-1 bg-muted/40 p-4 md:p-8 pt-16 md:pt-8">
                {children}
            </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
