import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="min-h-screen grid place-items-center" data-testid="auth-loading">
        <div className="nb-card p-8 font-heading text-2xl">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
