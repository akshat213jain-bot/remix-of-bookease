import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/ui/LoadingScreen";

type AppRole = "user" | "provider" | "admin";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, isLoading, isBlocked } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen message="Verifying your session..." />;
  }

  if (!user) {
    // Redirect to login with return URL
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is blocked (suspended/banned), redirect to blocked account page
  if (isBlocked && location.pathname !== "/blocked") {
    return <Navigate to="/blocked" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // User doesn't have required role, redirect to appropriate dashboard
    const redirectPath = role === "admin"
      ? "/dashboard/admin"
      : role === "provider"
        ? "/dashboard/provider"
        : "/dashboard/user";

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
