import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { formatError } from "../lib/api";
import { GraduationCap } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}!`);
      nav(`/${u.role}`);
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12" data-testid="login-page">
      <div className="lg:col-span-5 flex items-center justify-center p-8 lg:p-12 bg-[#FAFAF7]">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="login-logo">
            <div className="w-10 h-10 grid place-items-center bg-[#FDE68A] border border-black rounded-md shadow-[2px_2px_0_0_#111]">
              <GraduationCap size={20} />
            </div>
            <span className="font-heading text-3xl">ClassBoard</span>
          </Link>
          <div className="nb-label mb-2">Sign In</div>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight mb-2">Welcome back.</h1>
          <p className="text-[#52525B] mb-8">Sign in to manage your classes, attendance and marks.</p>

          <form onSubmit={submit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="nb-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="nb-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="nb-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="nb-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
              />
            </div>
            <button type="submit" disabled={loading} className="nb-btn-primary w-full" data-testid="login-submit-btn">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-sm text-[#52525B]">
            No admin account yet?{" "}
            <Link to="/signup" className="underline underline-offset-2 font-semibold text-[#111]" data-testid="go-signup-link">
              Create one
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-7 bg-[#FDE68A] border-l border-black relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-60" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="flex gap-3">
            <span className="nb-chip role-admin">Admin</span>
            <span className="nb-chip role-teacher">Teacher</span>
            <span className="nb-chip role-student">Student</span>
          </div>
          <div>
            <h2 className="font-heading text-6xl leading-[1.05] max-w-2xl">
              Run your classroom.<br/>Mark attendance.<br/>Track every grade.
            </h2>
            <p className="mt-6 text-[#1C1C1E]/80 max-w-lg">
              A single, colourful hub for administrators, teachers and students.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-xl">
            <div className="nb-card-flat p-4">
              <div className="nb-label">Students</div>
              <div className="font-heading text-3xl">Managed</div>
            </div>
            <div className="nb-card-flat p-4 bg-[#BAE6FD]">
              <div className="nb-label">Attendance</div>
              <div className="font-heading text-3xl">Daily</div>
            </div>
            <div className="nb-card-flat p-4 bg-[#E8F5E9]">
              <div className="nb-label">Marks</div>
              <div className="font-heading text-3xl">Tracked</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
