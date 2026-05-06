import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminDashboard from "@/pages/AdminDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import TestPage from "./pages/TestPage";
function RoleRedirect() {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="min-h-screen grid place-items-center" data-testid="auth-loading">
        <div className="nb-card p-8 font-heading text-2xl">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute roles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/test/:testId" element={<TestPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
