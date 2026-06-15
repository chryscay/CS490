import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export function RequireAuth() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}