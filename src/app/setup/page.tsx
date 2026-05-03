"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { CheckCircle, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

/**
 * ONE-TIME SETUP PAGE
 * Visit /setup once to create the admin account in Firebase.
 * After setup, this page will show a success message.
 * You can delete this file after use, or leave it — it's idempotent.
 */
export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "exists" | "error">("idle");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((l) => [...l, msg]);

  const runSetup = async () => {
    setStatus("loading");
    setLogs([]);
    setMessage("");

    const ADMIN_EMAIL    = "admin@app.com";
    const ADMIN_PASSWORD = "admin000";

    try {
      // 1. Try to create the admin Firebase Auth account
      addLog("Creating Firebase Auth account for admin...");
      let uid: string;

      try {
        const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        uid = cred.user.uid;
        addLog(`✓ Auth account created — UID: ${uid}`);
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-in-use") {
          // Account already exists — sign in to get the UID
          addLog("Auth account already exists, signing in to get UID...");
          const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          uid = cred.user.uid;
          addLog(`✓ Signed in — UID: ${uid}`);
        } else {
          throw authErr;
        }
      }

      // 2. Write / update Firestore user document
      addLog("Writing Firestore user document...");
      const userRef = doc(db, "users", uid);
      const existing = await getDoc(userRef);

      if (existing.exists() && existing.data().role === "admin") {
        addLog("✓ Firestore document already correct.");
        setStatus("exists");
        setMessage(
          `Admin account already set up.\nEmail: ${ADMIN_EMAIL}\nPassword: admin000`
        );
        return;
      }

      await setDoc(
        userRef,
        {
          name:            "Admin",
          email:           ADMIN_EMAIL,
          role:            "admin",
          currentLesson:   0,
          solvedQuestions: 0,
          accuracy:        0,
          paid:            0,
          createdAt:       serverTimestamp(),
        },
        { merge: true }
      );
      addLog("✓ Firestore document written.");

      setStatus("done");
      setMessage(
        `Admin account ready!\n\nID to login: admin\nEmail: admin@app.com\nPassword:   admin000\n\nYou can now log in at /login`
      );
    } catch (err: any) {
      addLog(`✗ Error: ${err.message}`);
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020408] p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">One-Time Setup</h1>
            <p className="text-sm text-white/40">Create the initial admin account in Firebase</p>
          </div>
        </div>

        {/* Info box */}
        <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-300">
          <p className="font-medium mb-1">What this does:</p>
          <ul className="space-y-1 text-blue-300/80 list-disc list-inside">
            <li>Creates a Firebase Auth account: <code className="bg-white/10 px-1 rounded">admin@app.com</code></li>
            <li>Sets password: <code className="bg-white/10 px-1 rounded">admin000</code></li>
            <li>Writes a Firestore <code className="bg-white/10 px-1 rounded">users</code> doc with <code className="bg-white/10 px-1 rounded">role: &quot;admin&quot;</code></li>
            <li>Login with ID: <code className="bg-white/10 px-1 rounded">admin</code> (maps to admin@app.com)</li>
            <li>Safe to run multiple times (idempotent)</li>
          </ul>
        </div>

        {/* Button */}
        {status === "idle" && (
          <button
            id="run-setup-btn"
            onClick={runSetup}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            Run Setup
          </button>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running setup…
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-4 rounded-xl bg-black/40 border border-white/5 p-4 font-mono text-xs text-white/50 space-y-1">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        {/* Success */}
        {(status === "done" || status === "exists") && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Go to login */}
        {(status === "done" || status === "exists") && (
          <a
            href="/login"
            className="mt-4 block w-full rounded-xl border border-white/10 py-3 text-center text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
          >
            Go to Login →
          </a>
        )}
      </div>
    </div>
  );
}
