
"use client";

import { ProtectedRoute, useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRedirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role) {
      if (role === 'staff') {
        router.replace("/dashboard/staff");
      } else {
        router.replace("/dashboard/customer");
      }
    }
  }, [role, loading, router]);

  // Render children which will be the loading state from the page
  // until the redirect happens.
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
