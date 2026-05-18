// ============================================================
// PHH Inventory — Login Page
// Refactored: theme-aware, improved spacing & typography
// ============================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../lib/auth-client";
import { Factory, Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import ThemeToggle from "../components/layout/ThemeToggle";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Login failed");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Connection error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-11 pl-11 pr-4 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm theme-transition hover:border-text-muted";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4 theme-transition">
      {/* Theme toggle (top right) */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
            <Factory className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            PHH Inventory
          </h1>
          <p className="text-text-secondary mt-2 text-sm">
            Material Cutting Management System
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-bg-surface rounded-2xl p-8 border border-border shadow-2xl shadow-black/10 theme-transition">
          <h2 className="text-xl font-semibold text-text-primary mb-7">
            Sign In
          </h2>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted shrink-0" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@phh.com"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted shrink-0" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-3 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-bg-surface"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 shrink-0" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-text-secondary text-sm mt-7">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-primary hover:text-primary-light transition-colors font-semibold"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
