import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  if (!token) {
    // Redirect to login if no token
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && userRole !== "Admin") {
    // Redirect to home if not admin
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
