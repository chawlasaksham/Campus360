import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children, title, subtitle, action }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav("/login");
  };

  const roleClass =
    user?.role === "admin" ? "role-admin" : user?.role === "teacher" ? "role-teacher" : "role-student";

  return (
    <div className="min-h-screen" data-testid="layout-root">
      <nav className="nb-nav" data-testid="top-nav">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-home">
            <div className="w-9 h-9 grid place-items-center bg-[#FDE68A] border border-black rounded-md shadow-[2px_2px_0_0_#111]">
              <GraduationCap size={18} />
            </div>
            <span className="font-heading text-2xl">ClassBoard</span>
          </Link>
          {user && (
            <div className="flex items-center gap-3">
              <span className={`nb-chip ${roleClass}`} data-testid="user-role-chip">
                {user.role.toUpperCase()}
              </span>
              <span className="text-sm text-[#52525B] hidden sm:block" data-testid="user-name">
                {user.name}
              </span>
              <button onClick={handleLogout} className="nb-btn-danger flex items-center gap-2" data-testid="logout-btn">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {(title || action) && (
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              {subtitle && <div className="nb-label" data-testid="page-subtitle">{subtitle}</div>}
              {title && <h1 className="font-heading text-4xl sm:text-5xl" data-testid="page-title">{title}</h1>}
            </div>
            {action}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
