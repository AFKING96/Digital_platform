"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, where, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Target, ChevronRight, CheckCircle2, Clock, BarChart2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";

interface Lesson {
  id: number;
  title: string;
  order: number;
}

interface Question {
  id: string;
  lessonId: number;
}

export default function PracticeLandingPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questionsCount, setQuestionsCount] = useState<Record<number, number>>({});
  const [solvedCount, setSolvedCount] = useState<Record<number, number>>({});
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      });
      return () => unsubUser();
    }
  }, [user]);

  useEffect(() => {
    // Fetch Lessons
    const unsubLessons = onSnapshot(query(collection(db, "lessons"), orderBy("order", "asc")), async (snap) => {
      const lessonData = snap.docs.map(d => ({ 
        id: d.data().id, 
        title: d.data().title, 
        order: d.data().order
      }));

      // Fetch Question Counts for each lesson
      const qSnap = await getDocs(collection(db, "practice_questions"));
      const counts: Record<number, number> = {};
      qSnap.docs.forEach(doc => {
        const lid = doc.data().lessonId;
        counts[lid] = (counts[lid] || 0) + 1;
      });
      setQuestionsCount(counts);
    });

    let unsubSubs = () => {};
    if (user) {
      unsubSubs = onSnapshot(query(collection(db, "submissions"), where("userId", "==", user.uid), where("type", "==", "practice")), (snap) => {
        const solved: Record<number, number> = {};
        snap.docs.forEach(doc => {
          const lid = doc.data().lessonId;
          solved[lid] = (solved[lid] || 0) + 1;
        });
        setSolvedCount(solved);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      unsubLessons();
      unsubSubs();
    };
  }, [user]);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-64 w-full bg-white/5" /><Skeleton className="h-64 w-full bg-white/5" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-black bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
          Daily Practice
        </h1>
        <p className="text-muted-foreground text-lg">Master your lessons through interactive in-class and self-paced solving.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.filter(l => userData?.unlockedLessons ? userData.unlockedLessons.includes(l.id) : false).map((lesson, idx) => {
          const total = questionsCount[lesson.id] || 0;
          const solved = solvedCount[lesson.id] || 0;
          const progress = total > 0 ? (solved / total) * 100 : 0;

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/practice/${lesson.id}`}>
                <Card className="p-6 bg-white/5 border-white/10 hover:border-primary/50 transition-all group relative overflow-hidden h-full flex flex-col">
                  <div className="absolute top-0 right-0 p-8 bg-primary/5 rounded-bl-[100px] -mr-4 -mt-4 transition-all group-hover:bg-primary/10" />
                  
                  <div className="flex-1 space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {lesson.order}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lesson {lesson.order}</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{total} Practice Questions</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-primary">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {solved} Done
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <Clock className="w-3 h-3 text-orange-400" /> {total - solved} Left
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {lessons.length === 0 && (
        <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
          <Target className="w-20 h-20 text-white/5 mx-auto mb-6" />
          <h2 className="text-2xl font-bold">No Lessons Available</h2>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Please check back later or contact your administrator for assigned curriculum.</p>
        </div>
      )}
    </div>
  );
}
