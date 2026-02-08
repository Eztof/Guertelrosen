import React from "react";
import { Navigate } from "react-router-dom";
import { Spinner } from "./Ui";
import { useSession } from "../lib/useSession";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}