import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useMinLoadingTime } from "@/hooks/useMinLoadingTime";

type AppRole = "user" | "provider" | "admin";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, isLoading, isBlocked } = useAuth();
  const location = useLocation();

  const showLoading = useMinLoadingTime(isLoading, 2000);

  if (showLoading) {
    return <LoadingScreen message="Verifying your session..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isBlocked && location.pathname !== "/blocked") {
    return <Navigate to="/blocked" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
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
