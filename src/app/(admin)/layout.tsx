"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { SessionNavBar } from "@/components/ui/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#040810]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null; // Prevent flash of content before redirect

  return (
    <div className="flex h-screen bg-black text-slate-100 overflow-hidden flex-row w-screen">
      <SessionNavBar />
      {/* Shim that matches the collapsed sidebar width so content isn't hidden behind it */}
      <div className="w-[3.05rem] shrink-0" aria-hidden="true" />
      <main className="flex h-screen grow flex-col overflow-auto relative">
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
