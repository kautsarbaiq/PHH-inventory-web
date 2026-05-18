// ============================================================
// PHH Inventory — Register Page
// Refactored: theme-aware, improved spacing & validation
// ============================================================

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signUp } from "../lib/auth-client";
import { Factory, Mail, Lock, User, UserPlus, AlertCircle } from "lucide-react";
import ThemeToggle from "../components/layout/ThemeToggle";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (password.length < 8) errors.password = "Min 8 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message || "Registration failed");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Connection error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full pl-10 pr-4 py-2.5 bg-bg-elevated border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 transition-all text-sm theme-transition";
  const inputOk = `${inputBase} border-border focus:ring-primary/50 focus:border-primary`;
  const inputErr = `${inputBase} border-danger/50 focus:ring-danger/50 focus:border-danger`;

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
          <p className="text-text-secondary mt-2 text-sm">Create your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-bg-surface rounded-2xl p-8 border border-border shadow-2xl shadow-black/10 theme-transition">
          <h2 className="text-xl font-semibold text-text-primary mb-7">
            Register
          </h2>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-lg bg-danger/10 border border-danger/20 text-danger-light text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="Ahmad Operator"
                  required
                  className={fieldErrors.name ? inputErr : inputOk}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs text-danger-light mt-1.5">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="operator@phh.com"
                  required
                  className={fieldErrors.email ? inputErr : inputOk}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-danger-light mt-1.5">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className={fieldErrors.password ? inputErr : inputOk}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-danger-light mt-1.5">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-text-secondary text-sm mt-7">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:text-primary-light transition-colors font-semibold"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
