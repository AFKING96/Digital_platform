"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, LogIn, GraduationCap, Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      /* Support both raw email and university-ID style login.
         Firebase stores emails as {universityId}@app.com */
      const email = identifier.includes("@")
        ? identifier
        : `${identifier}@app.com`;

      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? snap.data().role : "student";

      router.replace(role === "admin" ? "/admin" : "/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code: string };
      const msg: Record<string, string> = {
        "auth/invalid-credential": "Invalid ID or password. Please try again.",
        "auth/user-not-found":     "No account found with that ID.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/too-many-requests":  "Too many attempts. Try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      setError(msg[firebaseError.code] ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-[#020408]">

      {/* ── Animated gradient backdrop ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(99,102,241,0.10),transparent)]" />
      </div>

      {/* ── Floating orbs ── */}
      <Orb  className="top-[-8rem] left-[-8rem] h-[28rem] w-[28rem] bg-blue-600/20"    delay={0} />
      <Orb  className="bottom-[-6rem] right-[-6rem] h-[24rem] w-[24rem] bg-indigo-600/20" delay={1.5} />
      <Orb  className="top-[30%] right-[10%] h-[14rem] w-[14rem] bg-violet-600/15"    delay={3} />
      <Orb  className="bottom-[25%] left-[8%] h-[10rem] w-[10rem] bg-cyan-600/15"     delay={2} />

      {/* ── Grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">

          {/* Logo / Brand */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-8 flex flex-col items-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-white/50">
                Sign in to your Coursat account
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* ID / Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-white/40">
                University ID or Email
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                placeholder="e.g. 12345678 or you@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none ring-0 transition focus:border-blue-500/60 focus:bg-white/8 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-white/40">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-blue-500/60 focus:bg-white/8 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/70"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                >
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              id="login-submit"
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:opacity-60"
            >
              {/* Shimmer */}
              {!loading && (
                <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                  : <><LogIn className="h-4 w-4" /> Sign In</>}
              </span>
            </motion.button>
          </motion.form>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-6 text-center text-xs text-white/25"
          >
            Use your university ID (e.g. 2023001) or full email
          </motion.p>
        </div>

        {/* Glow ring under card */}
        <div className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-xl" />
      </motion.div>
    </div>
  );
}

/* Floating blurred orb */
function Orb({ className, delay }: { className: string; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}
