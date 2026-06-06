import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, LogIn } from "lucide-react";
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

  // Redirect based on role once user and profile are fully loaded
  useEffect(() => {
    if (user && profile) {
      if (profile.role === "Student") {
        navigate("/student", { replace: true });
      } else if (profile.role === "Teacher") {
        navigate("/teacher", { replace: true });
      } else {
        // Admin, Super Admin, or any other role
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

  async function handleLogin(e) {
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
      // AuthContext will pick up the new session and load the profile.
      // The useEffect above will then redirect.
    } catch (err) {
      console.error(err);
      toast.error("Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-bg px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-secondary-light">
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
          Sign in to your account
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
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
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-light text-white rounded-lg p-3 font-montserrat transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="text-xs text-secondary-light text-center mt-6 font-montserrat">
          © {new Date().getFullYear()} ShreeVidhya Academy. All rights reserved.
        </p>
      </div>
    </div>
  );
}