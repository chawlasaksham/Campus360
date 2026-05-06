import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { formatError } from "../lib/api";
import { GraduationCap } from "lucide-react";

export default function Signup() {
  const { registerAdmin } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerAdmin(form.name, form.email, form.password);
      toast.success("Admin account created!");
      nav("/admin");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12" data-testid="signup-page">
      <div className="lg:col-span-5 flex items-center justify-center p-8 lg:p-12 bg-[#FAFAF7]">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 grid place-items-center bg-[#FDE68A] border border-black rounded-md shadow-[2px_2px_0_0_#111]">
              <GraduationCap size={20} />
            </div>
            <span className="font-heading text-3xl">ClassBoard</span>
          </Link>
          <div className="nb-label mb-2">Create Admin</div>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight mb-2">Start your school.</h1>
          <p className="text-[#52525B] mb-8">Admin accounts can invite teachers & students and organise every subject.</p>

          <form onSubmit={submit} className="space-y-5" data-testid="signup-form">
            <div>
              <label className="nb-label">Full Name</label>
              <input className="nb-input" required value={form.name} onChange={update("name")} data-testid="signup-name-input" />
            </div>
            <div>
              <label className="nb-label">Email</label>
              <input className="nb-input" required type="email" value={form.email} onChange={update("email")} data-testid="signup-email-input" />
            </div>
            <div>
              <label className="nb-label">Password</label>
              <input className="nb-input" required type="password" minLength={6} value={form.password} onChange={update("password")} data-testid="signup-password-input" />
            </div>
            <button disabled={loading} className="nb-btn-primary w-full" data-testid="signup-submit-btn">
              {loading ? "Creating…" : "Create Admin Account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-[#52525B]">
            Already have an account?{" "}
            <Link to="/login" className="underline underline-offset-2 font-semibold text-[#111]" data-testid="go-login-link">Sign in</Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-7 bg-[#BAE6FD] border-l border-black relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-50" />
        <div className="relative h-full flex items-center p-12">
          <h2 className="font-heading text-6xl leading-[1.05]">
            Admins run the show.<br/>Teachers mark the days.<br/>Students watch it all add up.
          </h2>
        </div>
      </div>
    </div>
  );
}
