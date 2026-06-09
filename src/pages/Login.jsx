import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, LogIn, ArrowLeft, KeyRound } from "lucide-react";
import { supabase } from "../api/supabase";
import { useAuth } from "../context/AuthContext";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function Login() {
  const darkLogo = useOrgDarkLogo();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP mode toggle
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Redirect based on role once user and profile are fully loaded
  useEffect(() => {
    if (user && profile) {
      if (profile.role === "Student") {
        navigate("/student", { replace: true });
      } else if (profile.role === "Teacher") {
        navigate("/teacher", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, profile, navigate]);

  // Show a loading screen while profile is being fetched
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-bg">
        <p className="text-secondary font-montserrat">Loading your account…</p>
      </div>
    );
  }

  // -------- Password login --------
  async function handlePasswordLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      // AuthContext picks up the session – useEffect above will redirect
    } catch (err) {
      console.error(err);
      toast.error("Login failed");
      setLoading(false);
    }
  }

  // -------- Send OTP --------
  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,          // only existing users
          emailRedirectTo: window.location.origin + "/#/login",
        },
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("OTP sent to your email – check your inbox");
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  // -------- Forgot password --------
  async function handleForgotPassword() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/#/login",
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email");
    } catch (err) {
      toast.error(err.message || "Failed to send reset link");
    }
  }

  // -------- Switch back to password mode --------
  function switchToPassword() {
    setUseOtp(false);
    setOtpSent(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-bg px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-secondary-light">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={darkLogo}
            alt="ShreeVidhya Academy"
            className="h-20 w-auto"
          />
        </div>
        <h1 className="text-2xl font-righteous text-primary-dark text-center mb-1">
          ShreeVidhya Academy
        </h1>
        <p className="text-sm text-secondary text-center font-montserrat mb-8">
          {useOtp ? "Sign in with a one‑time code" : "Sign in to your account"}
        </p>

        {/* -------- PASSWORD FORM -------- */}
        {!useOtp && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Mail size={14} className="inline mr-1" />
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-secondary-light rounded-lg p-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Lock size={14} className="inline mr-1" />
                Password
              </label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-secondary-light rounded-lg p-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                required
              />
              {/* Forgot password link */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-secondary hover:text-primary font-montserrat mt-1"
              >
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light text-white rounded-lg p-3 font-montserrat transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {loading ? "Signing In..." : "Sign In"}
            </button>

            {/* Switch to OTP */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setUseOtp(true)}
                className="text-sm text-primary hover:underline font-montserrat"
              >
                Sign in with a one‑time code
              </button>
            </div>
          </form>
        )}

        {/* -------- OTP FORM -------- */}
        {useOtp && (
          <>
            {/* Back button (before OTP sent) */}
            {!otpSent && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={switchToPassword}
                  className="text-sm text-secondary hover:text-primary-dark font-montserrat flex items-center gap-1"
                >
                  <ArrowLeft size={16} />
                  Back to password login
                </button>
              </div>
            )}
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <Mail size={14} className="inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-secondary-light rounded-lg p-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                  required
                />
              </div>
              {otpSent && (
                <p className="text-sm text-green-600 font-montserrat">
                  ✅ OTP sent! Check your inbox. You can close this page after entering the code.
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-light text-white rounded-lg p-3 font-montserrat transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound size={18} />
                {loading ? "Sending..." : "Send One‑Time Code"}
              </button>
              {/* Back to password */}
              {!otpSent && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchToPassword}
                    className="text-sm text-primary hover:underline font-montserrat"
                  >
                    Back to password login
                  </button>
                </div>
              )}
            </form>
          </>
        )}

        <p className="text-xs text-secondary-light text-center mt-6 font-montserrat">
          © {new Date().getFullYear()} ShreeVidhya Academy. All rights reserved.
        </p>
      </div>
    </div>
  );
}