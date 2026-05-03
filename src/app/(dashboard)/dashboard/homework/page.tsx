"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Homework {
  id: string;
  lessonId: number;
  title: string;
  deadline: any;
  status: "completed" | "late" | "missing" | "pending";
}

export default function StudentHomeworkPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeworkAndSubmissions = async () => {
      if (!auth.currentUser) return;
      try {
        // 1. Fetch all homework
        const hwSnap = await getDocs(query(collection(db, "homework"), orderBy("deadline", "asc")));
        const hws = hwSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // 2. Fetch student submissions
        const subSnap = await getDocs(query(collection(db, "submissions"), where("userId", "==", auth.currentUser.uid)));
        const subs = subSnap.docs.map(doc => doc.data());

        // 3. Map status
        const processed = hws.map(hw => {
          const submission = subs.find(s => s.lessonId === hw.lessonId);
          const deadlineDate = hw.deadline.toDate();
          const isOverdue = new Date() > deadlineDate;

          let status: Homework["status"] = "pending";
          if (submission) {
            const submittedDate = new Date(submission.submittedAt);
            status = submittedDate <= deadlineDate ? "completed" : "late";
          } else if (isOverdue) {
            status = "missing";
          }

          return { ...hw, status };
        });

        setHomeworks(processed);
      } catch (error) {
        console.error("Error fetching homework data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeworkAndSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Your Homework</h1>
        <p className="text-muted-foreground">Complete your assignments before the deadlines.</p>
      </div>

      <div className="grid gap-6">
        {homeworks.map((hw, index) => {
          const StatusIcon = hw.status === "completed" ? CheckCircle2 : hw.status === "late" ? Clock : hw.status === "missing" ? AlertCircle : Clock;
          const statusColors = {
            completed: "text-green-400 bg-green-500/10 border-green-500/20",
            late: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
            missing: "text-red-400 bg-red-500/10 border-red-500/20",
            pending: "text-blue-400 bg-blue-500/10 border-blue-500/20",
          };

          return (
            <motion.div
              key={hw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusColors[hw.status]}`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{hw.title}</h3>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        Module {hw.lessonId}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due: {hw.deadline.toDate().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[hw.status]}`}>
                    {hw.status.toUpperCase()}
                  </div>
                  
                  {hw.status !== "completed" && (
                    <Link href={`/solve/${hw.lessonId}`}>
                      <Button className="bg-primary hover:bg-primary/90 btn-glow">
                        Solve Now <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
        {homeworks.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
            <CheckCircle2 className="w-12 h-12 text-green-500/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No active homework assignments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
