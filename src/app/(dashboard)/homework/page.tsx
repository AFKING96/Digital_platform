"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, AlertCircle, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

interface Homework {
  id: string;
  lessonId: number;
  content: string;
  deadline?: any;
}

interface Lesson {
  id: number;
  title: string;
  order: number;
}

export default function HomeworkLandingPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Lessons
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), orderBy("order", "asc")), (snap) => {
      setLessons(snap.docs.map(d => ({ id: d.data().id, title: d.data().title, order: d.data().order })));
    });

    // Fetch All Homework
    const unsubHomework = onSnapshot(collection(db, "homework_questions"), (snap) => {
      setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Homework)));
    });

    // Fetch User Submissions for Homework
    if (user) {
      const unsubSubs = onSnapshot(query(collection(db, "submissions"), where("userId", "==", user.uid), where("type", "==", "homework")), (snap) => {
        setSubmissions(snap.docs.map(d => d.data().questionId));
        setLoading(false);
      });
      return () => {
        unsubLessons();
        unsubHomework();
        unsubSubs();
      };
    }

    return () => {
      unsubLessons();
      unsubHomework();
    };
  }, [user]);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-64 w-full bg-white/5" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-black bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
          Homework Assignments
        </h1>
        <p className="text-muted-foreground text-lg">Complete your after-class tasks to track your mastery of each module.</p>
      </div>

      <div className="grid gap-6">
        {lessons.map((lesson, idx) => {
          const lessonHomeworks = homeworks.filter(h => h.lessonId === lesson.id);
          const solvedCount = lessonHomeworks.filter(h => submissions.includes(h.id)).length;
          const totalCount = lessonHomeworks.length;
          
          if (totalCount === 0) return null;

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-1 bg-white/5 border-white/10 overflow-hidden hover:border-emerald-500/30 transition-all group">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex flex-col items-center justify-center border border-emerald-500/20">
                      <span className="text-[10px] font-black uppercase text-emerald-400">Lesson</span>
                      <span className="text-2xl font-black text-white leading-none">{lesson.order}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-emerald-400 transition-colors">{lesson.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" /> {totalCount} Tasks
                        </span>
                        <span className={cn("text-xs flex items-center gap-1", solvedCount === totalCount ? "text-emerald-400" : "text-muted-foreground")}>
                          <CheckCircle2 className="w-3 h-3" /> {solvedCount}/{totalCount} Completed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/homework/${lesson.id}`} className="w-full md:w-auto">
                      <Button className={cn(
                        "w-full md:w-auto rounded-2xl h-12 px-8 font-bold transition-all",
                        solvedCount === totalCount ? "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      )}>
                        {solvedCount === totalCount ? "Review Assignment" : "Start Solving"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Individual Tasks Preview */}
                <div className="bg-black/20 border-t border-white/5 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lessonHomeworks.slice(0, 3).map(h => {
                    const isDone = submissions.includes(h.id);
                    const deadline = h.deadline?.toDate ? h.deadline.toDate() : h.deadline;
                    const isOverdue = deadline && new Date() > new Date(deadline) && !isDone;

                    return (
                      <div key={h.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        {isDone ? (
                          <div className="p-1.5 bg-emerald-500/20 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                        ) : isOverdue ? (
                          <div className="p-1.5 bg-red-500/20 rounded-full">
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-white/10 rounded-full">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{h.content}</p>
                          <p className={cn("text-[9px] font-bold uppercase tracking-tighter mt-0.5", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                            {isDone ? "Submitted" : isOverdue ? "Overdue" : deadline ? `Due ${new Date(deadline).toLocaleDateString()}` : "No deadline"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {totalCount > 3 && (
                    <div className="flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      +{totalCount - 3} More Tasks
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {lessons.filter(l => homeworks.some(h => h.lessonId === l.id)).length === 0 && (
        <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
          <ClipboardList className="w-20 h-20 text-white/5 mx-auto mb-6" />
          <h2 className="text-2xl font-bold">No Homework Yet</h2>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Your instructor hasn't assigned any homework for your active lessons yet. Check back after your next session!</p>
        </div>
      )}
    </div>
  );
}
