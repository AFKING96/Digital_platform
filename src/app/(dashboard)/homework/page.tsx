"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface Homework {
  id: string;
  lessonId: number;
  title: string;
  deadline: any;
}

export default function StudentHomeworkPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonMap, setLessonMap] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch lesson mapping
        const lQuery = query(collection(db, "lessons"), orderBy("id", "asc"));
        const lSnap = await getDocs(lQuery);
        const mapping: Record<number, number> = {};
        lSnap.docs.forEach((d, idx) => {
          mapping[d.data().id] = idx + 1;
        });
        setLessonMap(mapping);

        // 2. Fetch homework
        const q = query(collection(db, "homework"), orderBy("deadline", "asc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework));
        setHomeworks(data);
      } catch (error) {
        console.error("Error fetching student homework:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-4 w-64 bg-white/5" />
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Your Homework</h1>
        <p className="text-muted-foreground">Complete your assignments and stay on track with your modules.</p>
      </div>

      {homeworks.length === 0 ? (
        <EmptyState 
          icon={Clock} 
          title="No Active Homework" 
          description="Great job! You've completed all assigned homework. Check back later for new assignments from your instructor."
        />
      ) : (
        <div className="grid gap-6">
          {homeworks.map((hw, index) => {
            const moduleNum = lessonMap[hw.lessonId] || hw.lessonId;
            const isOverdue = hw.deadline?.toDate ? hw.deadline.toDate() < new Date() : new Date(hw.deadline) < new Date();

            return (
              <motion.div
                key={hw.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-white/5 hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-5 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{hw.title}</h3>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
                        <span className="text-sm text-primary font-medium">Module {moduleNum}</span>
                        <span className={`text-sm flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                          <Calendar className="w-4 h-4" />
                          Due: {hw.deadline?.toDate ? hw.deadline.toDate().toLocaleDateString() : new Date(hw.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Link href={`/lesson/${hw.lessonId}`} className="w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center gap-2 px-6">
                      View Module
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
