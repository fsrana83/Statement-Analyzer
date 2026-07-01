import React, { useState } from "react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup 
} from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { motion } from "motion/react";
import { 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Chrome, 
  UserCheck, 
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface AuthScreenProps {
  onClose: () => void;
  onGuestContinue: () => void;
}

export default function AuthScreen({ onClose, onGuestContinue }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccess("Successfully signed in with Google!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (trimmedPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
      }
      if (trimmedPassword !== confirmPassword.trim()) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        if (displayName.trim()) {
          await updateProfile(userCred.user, {
            displayName: displayName.trim()
          });
        }
        setSuccess("Account created successfully! Logging you in...");
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        setSuccess("Signed in successfully!");
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Email auth error:", err);
      let userFriendlyMessage = err.message || "Authentication failed.";
      
      if (err.code === "auth/user-not-found") {
        userFriendlyMessage = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        userFriendlyMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        userFriendlyMessage = "An account already exists with this email address.";
      } else if (err.code === "auth/invalid-email") {
        userFriendlyMessage = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        userFriendlyMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === "auth/too-many-requests") {
        userFriendlyMessage = "Too many login attempts. Please try again later.";
      }
      
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-150 overflow-hidden"
        id="auth-modal-container"
      >
        {/* Header Branding Accent */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-24 h-24 rotate-12" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-400/30">
              <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold font-sans tracking-tight">
            {isSignUp ? "Create Your Sync Account" : "Access Cloud Ledger Sync"}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            {isSignUp 
              ? "Register to securely back up transactions, custom categories, and budgets across devices." 
              : "Sign in to keep your statement reconciliation, AI advisory logs, and custom budgets synchronized."}
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Status Message Boxes */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-150 text-rose-800 p-3.5 rounded-lg flex items-start gap-2.5 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3.5 rounded-lg flex items-start gap-2.5 text-xs font-medium"
            >
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}

          {/* Social Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Chrome className="w-4 h-4 text-rose-500" />
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              or use email
            </span>
          </div>

          {/* Email Login/Register Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="Faisal Saeed"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition hover:bg-slate-50 focus:bg-white"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Email Address</label>
              <input
                type="email"
                required
                placeholder="faisal@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition hover:bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-3.5 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition hover:bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition hover:bg-slate-50 focus:bg-white"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition shadow-md hover:shadow-lg focus:outline-none cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isSignUp ? "Create Free Account" : "Sign In to My Account"}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle View Options */}
          <div className="text-center text-xs text-slate-500">
            {isSignUp ? (
              <span>
                Already have an account?{" "}
                <button 
                  onClick={() => { setIsSignUp(false); setError(null); }} 
                  className="font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New to Cloud Ledger?{" "}
                <button 
                  onClick={() => { setIsSignUp(true); setError(null); }} 
                  className="font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Sign Up Free
                </button>
              </span>
            )}
          </div>

          {/* Bottom actions: Guest flow */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Prefer local-only mode?</span>
            <button
              type="button"
              onClick={onGuestContinue}
              className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-bold transition cursor-pointer"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
